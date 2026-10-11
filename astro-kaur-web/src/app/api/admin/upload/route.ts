import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

// Initialize Supabase Admin client
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
 * POST /api/admin/upload
 * Accepts an image file (preferably pre-converted to WebP on the client),
 * uploads to Supabase Storage with local filesystem backup in public/uploads/
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided for upload" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const originalName = (file.name || "").toLowerCase();
    const isReading = originalName.includes("reading");
    const folder = isReading ? "readings" : "owner";
    const prefix = isReading ? "reading_art" : "owner_about";
    const fileName = `${prefix}_${timestamp}.webp`;
    const storagePath = `${folder}/${fileName}`;

    let publicUrl: string | null = null;

    // 1. Upload directly to Supabase Storage bucket "custom_profle_photo"
    try {
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("custom_profle_photo")
        .upload(storagePath, buffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (!uploadErr) {
        const { data: urlData } = supabaseAdmin.storage
          .from("custom_profle_photo")
          .getPublicUrl(storagePath);

        if (urlData?.publicUrl) {
          publicUrl = urlData.publicUrl;
        }
      } else {
        console.warn("Supabase Storage upload warning:", uploadErr.message);
      }
    } catch (e: any) {
      console.warn("Supabase storage upload error:", e.message);
    }

    // 2. Write to public/uploads/ folder as local Next.js static asset backup
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, fileName), buffer);
    } catch (fsErr) {
      console.warn("Filesystem write warning:", fsErr);
    }

    // Prefer Supabase Storage public URL if available, otherwise local static path
    const finalUrl = publicUrl || `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: finalUrl,
      fileName,
      sizeBytes: buffer.length,
      sizeKB: Math.round(buffer.length / 1024),
    });
  } catch (err: any) {
    console.error("POST /api/admin/upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process image upload" },
      { status: 500 }
    );
  }
}
