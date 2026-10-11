import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

// Initialize Supabase Admin client with Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdnwmfriilknnwqrepuy.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const dynamic = "force-dynamic";

/**
 * Helper to delete a custom uploaded image from Supabase Storage bucket
 * and local public/uploads/ folder to free up space.
 */
async function deleteUploadedImage(imageUrl?: string | null) {
  if (!imageUrl) return;

  // Never delete default built-in static illustrations or assets!
  if (
    imageUrl.startsWith("/readings_logo/") ||
    imageUrl.startsWith("/Owner_image") ||
    imageUrl.startsWith("/avatar_seeds/") ||
    imageUrl.startsWith("/assets/")
  ) {
    return;
  }

  // 1. Delete from Supabase Storage bucket "custom_profle_photo"
  try {
    if (imageUrl.includes("/custom_profle_photo/")) {
      const parts = imageUrl.split("/custom_profle_photo/");
      if (parts[1]) {
        const storageFilePath = decodeURIComponent(parts[1].split("?")[0]);
        const { error } = await supabaseAdmin.storage
          .from("custom_profle_photo")
          .remove([storageFilePath]);
        if (error) {
          console.warn("Could not remove from Supabase Storage:", error.message);
        } else {
          console.log("Successfully removed image from Supabase Storage:", storageFilePath);
        }
      }
    }
  } catch (err: any) {
    console.warn("Storage removal warning:", err.message);
  }

  // 2. Delete local copy in public/uploads/ if present
  try {
    let localFileName = "";
    if (imageUrl.startsWith("/uploads/")) {
      localFileName = imageUrl.replace("/uploads/", "").split("?")[0];
    } else if (imageUrl.includes("/uploads/")) {
      localFileName = imageUrl.split("/uploads/")[1].split("?")[0];
    } else {
      const urlObj = new URL(imageUrl, "http://localhost");
      const segments = urlObj.pathname.split("/");
      localFileName = segments[segments.length - 1];
    }

    if (localFileName) {
      const localFilePath = path.join(process.cwd(), "public", "uploads", localFileName);
      await fs.unlink(localFilePath).catch(() => {});
    }
  } catch {
    // Ignore local filesystem delete failure
  }
}

// Default About Me fallback
const DEFAULT_ABOUT = {
  tag: "THE PERSON BEHIND THE READINGS",
  heading_prefix: "Meet",
  heading_name: "TheAstroKaur",
  paragraph_1:
    "Graduating from top universities in India and Germany and building a career in IT & technology, I was trained to think analytically and rely on logic and structured reasoning. Like many people, I believed that success and life's outcomes were entirely within my control, leaving little room for magic.",
  paragraph_2:
    "Everything changed when I began noticing recurring patterns in my own life—similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, that completely changed my perspective on life. Not just as a prediction tool, but astrology has helped me for self-awareness and personal growth.",
  image_url: "/Owner_image.png",
};

/**
 * GET /api/admin/content
 * Returns both about content and reading services from Supabase
 */
export async function GET() {
  try {
    // 1. Fetch Services
    const { data: servicesData, error: servicesErr } = await supabaseAdmin
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (servicesErr) {
      console.error("Error fetching services:", servicesErr);
    }

    // 2. Fetch About Profile
    const { data: profilesData, error: profilesErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .limit(1);

    let aboutContent = DEFAULT_ABOUT;

    if (!profilesErr && profilesData && profilesData.length > 0) {
      const p = profilesData[0];
      // Check if bio contains JSON payload
      if (p.bio) {
        try {
          const parsed = JSON.parse(p.bio);
          aboutContent = { ...DEFAULT_ABOUT, ...parsed };
        } catch {
          // If plain text bio
          aboutContent = {
            ...DEFAULT_ABOUT,
            paragraph_1: p.bio,
            heading_name: p.display_name || DEFAULT_ABOUT.heading_name,
            tag: p.vision || DEFAULT_ABOUT.tag,
          };
        }
      }
    }

    return NextResponse.json({
      about: aboutContent,
      services: servicesData || [],
    });
  } catch (err: any) {
    console.error("GET /api/admin/content error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch content" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/content
 * Updates either "about" or "services"
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === "about") {
      // Upsert into profiles
      const { data: existingProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(1);

      const jsonPayload = JSON.stringify({
        tag: data.tag,
        heading_prefix: data.heading_prefix,
        heading_name: data.heading_name,
        paragraph_1: data.paragraph_1,
        paragraph_2: data.paragraph_2,
        image_url: data.image_url,
      });

      if (existingProfiles && existingProfiles.length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from("profiles")
          .update({
            display_name: data.heading_name || "TheAstroKaur",
            vision: data.tag,
            bio: jsonPayload,
            is_published: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfiles[0].id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from("profiles")
          .insert({
            display_name: data.heading_name || "TheAstroKaur",
            vision: data.tag,
            bio: jsonPayload,
            is_published: true,
          });

        if (insertErr) throw insertErr;
      }

      return NextResponse.json({ success: true, message: "About section saved successfully" });
    }

    if (type === "service_update") {
      // Update a single service
      const updatePayload: Record<string, any> = {
        title: data.title,
        description: data.description,
        format: data.format,
        duration_minutes:
          data.duration_minutes !== null && data.duration_minutes !== undefined
            ? Number(data.duration_minutes)
            : null,
        price_cents: Number(data.price_cents),
        is_active: Boolean(data.is_active),
        updated_at: new Date().toISOString(),
      };

      if (data.sort_order !== undefined) {
        updatePayload.sort_order = Number(data.sort_order);
      }
      if (data.image_url !== undefined) {
        updatePayload.image_url = data.image_url || null;
      }

      const { error: updateErr } = await supabaseAdmin
        .from("services")
        .update(updatePayload)
        .eq("id", data.id);

      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true, message: "Service updated successfully" });
    }

    if (type === "service_create") {
      const { title, description, format, duration_minutes, price_cents, is_active, sort_order, image_url } = data;

      const { data: newService, error: insertErr } = await supabaseAdmin
        .from("services")
        .insert({
          title,
          description,
          format: format || "text",
          duration_minutes: duration_minutes ? Number(duration_minutes) : null,
          price_cents: Number(price_cents || 2000),
          currency: "EUR",
          is_active: is_active ?? true,
          sort_order: sort_order ? Number(sort_order) : 10,
          image_url: image_url || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({ success: true, service: newService });
    }

    if (type === "service_delete") {
      const { id } = data;
      if (!id) {
        return NextResponse.json({ error: "Missing service id" }, { status: 400 });
      }

      // Fetch the service to retrieve any attached custom image_url
      const { data: serviceToDelete, error: fetchErr } = await supabaseAdmin
        .from("services")
        .select("id, image_url")
        .eq("id", id)
        .single();

      if (fetchErr && fetchErr.code !== "PGRST116") {
        console.warn("Fetch service before delete warning:", fetchErr.message);
      }

      // Unlink reading_details if referenced to prevent foreign key errors
      await supabaseAdmin
        .from("reading_details")
        .update({ service_id: null })
        .eq("service_id", id);

      // Delete from services table
      const { error: deleteErr } = await supabaseAdmin
        .from("services")
        .delete()
        .eq("id", id);

      if (deleteErr) throw deleteErr;

      // Delete image from Supabase bucket & local storage
      if (serviceToDelete?.image_url) {
        await deleteUploadedImage(serviceToDelete.image_url);
      }

      return NextResponse.json({
        success: true,
        message: "Reading service and its artwork successfully deleted",
      });
    }

    return NextResponse.json({ error: "Invalid type specified" }, { status: 400 });
  } catch (err: any) {
    console.error("PUT /api/admin/content error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update content" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/content
 * Query param: ?id=<service_id> or JSON body: { id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Missing service ID" }, { status: 400 });
    }

    // Fetch service to get image_url
    const { data: serviceToDelete } = await supabaseAdmin
      .from("services")
      .select("id, image_url")
      .eq("id", id)
      .single();

    // Unlink reading_details
    await supabaseAdmin
      .from("reading_details")
      .update({ service_id: null })
      .eq("service_id", id);

    // Delete service
    const { error: deleteErr } = await supabaseAdmin
      .from("services")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    // Delete custom uploaded artwork if present
    if (serviceToDelete?.image_url) {
      await deleteUploadedImage(serviceToDelete.image_url);
    }

    return NextResponse.json({
      success: true,
      message: "Reading service and its artwork successfully deleted",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/content error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete reading service" },
      { status: 500 }
    );
  }
}
