import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export async function GET() {
  try {
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

    // 1. Fetch published testimonials
    const { data: testimonials, error: testErr } = await supabaseAdmin
      .from("testimonials")
      .select("id, author_name, rating, content, created_at, customer_id, order_id")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (testErr || !testimonials) {
      console.error("Error fetching testimonials in /api/reviews:", testErr);
      return NextResponse.json({ reviews: [] });
    }

    // 2. Fetch profiles for avatars
    const customerIds = testimonials
      .map((t) => t.customer_id)
      .filter(Boolean);

    const profileMap = new Map<string, string | null>();
    if (customerIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("customer_profiles")
        .select("id, auth_user_id, avatar_url")
        .or(`id.in.(${customerIds.join(",")}),auth_user_id.in.(${customerIds.join(",")})`);

      if (profiles) {
        profiles.forEach((p) => {
          if (p.id) profileMap.set(p.id, p.avatar_url);
          if (p.auth_user_id) profileMap.set(p.auth_user_id, p.avatar_url);
        });
      }
    }

    // 3. Fetch orders for service titles
    const orderIds = testimonials
      .map((t) => t.order_id)
      .filter(Boolean);

    const orderMap = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id, service_title")
        .in("id", orderIds);

      if (orders) {
        orders.forEach((o) => {
          orderMap.set(o.id, o.service_title);
        });
      }
    }

    const reviews = testimonials.map((t) => ({
      id: t.id,
      author_name: t.author_name || "Seeker",
      avatar_url: t.customer_id ? profileMap.get(t.customer_id) || null : null,
      rating: t.rating || 5,
      service_title: t.order_id ? orderMap.get(t.order_id) || "Vedic Reading" : "Vedic Reading",
      content: t.content,
      created_at: t.created_at,
      formatted_date: formatDate(t.created_at),
    }));

    return NextResponse.json(
      { reviews },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    console.error("Reviews API error:", err);
    return NextResponse.json({ reviews: [] }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Allows authenticated customers to submit or edit a review for their own completed reading.
 * Enforces:
 * 1. User authentication (Bearer token or session cookie)
 * 2. Reading ownership (order.auth_user_id === user.id)
 * 3. Completion status (order.status === 'completed')
 * 4. Star rating (1-5) and feedback content
 * 5. Deduplication: updates existing testimonial if one exists for the order, preventing duplicates
 * 6. Atomically syncs both orders table and testimonials table
 */
export async function POST(req: NextRequest) {
  try {
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

    // 1. Authenticate caller
    let user = null;

    // A. Check Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    }

    // B. Check session cookies
    if (!user) {
      try {
        const serverSupabase = await createServerClient();
        const { data, error } = await serverSupabase.auth.getUser();
        if (!error && data?.user) {
          user = data.user;
        }
      } catch (cookieErr) {
        console.warn("Could not retrieve session from cookies in /api/reviews:", cookieErr);
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to submit a review." },
        { status: 401 }
      );
    }

    // 2. Parse and validate input
    const body = await req.json().catch(() => ({}));
    const { order_id, rating, content } = body;

    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { error: "A valid reading ID is required." },
        { status: 400 }
      );
    }

    const numericRating = Math.round(Number(rating));
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Please provide a rating between 1 and 5 stars." },
        { status: 400 }
      );
    }

    const reviewContent = typeof content === "string" ? content.trim() : "";
    if (!reviewContent) {
      return NextResponse.json(
        { error: "Please share a few words about your reading experience." },
        { status: 400 }
      );
    }

    // 3. Verify reading ownership & completion status
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, auth_user_id, status, service_title, client_name, review_created_at")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Reading not found." },
        { status: 404 }
      );
    }

    if (order.auth_user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to submit a review for this reading." },
        { status: 403 }
      );
    }

    if (order.status !== "completed") {
      return NextResponse.json(
        { error: "Reviews can only be submitted for completed readings." },
        { status: 400 }
      );
    }

    // 4. Resolve author display name and customer profile
    const { data: profile } = await supabaseAdmin
      .from("customer_profiles")
      .select("id, display_name")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const authorName =
      profile?.display_name?.trim() ||
      order.client_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      "Seeker";

    const customerId = profile?.id || null;
    const nowIso = new Date().toISOString();

    // 5. Prevent duplicate reviews by updating existing testimonial if present
    const { data: existingTestimonial } = await supabaseAdmin
      .from("testimonials")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (existingTestimonial) {
      const { error: updateTestErr } = await supabaseAdmin
        .from("testimonials")
        .update({
          author_name: authorName,
          rating: numericRating,
          content: reviewContent,
          updated_at: nowIso,
        })
        .eq("id", existingTestimonial.id);

      if (updateTestErr) {
        console.error("Error updating testimonial:", updateTestErr);
        return NextResponse.json(
          { error: "Could not update your review. Please try again." },
          { status: 500 }
        );
      }
    } else {
      const { error: insertTestErr } = await supabaseAdmin
        .from("testimonials")
        .insert({
          order_id: order.id,
          customer_id: customerId,
          author_name: authorName,
          rating: numericRating,
          content: reviewContent,
          consent_given: true,
          is_published: true,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (insertTestErr) {
        console.error("Error inserting testimonial:", insertTestErr);
        return NextResponse.json(
          { error: "Could not save your review. Please try again." },
          { status: 500 }
        );
      }
    }

    // 6. Update order record with review rating & text
    const reviewCreatedAt = order.review_created_at || nowIso;
    const { error: updateOrderErr } = await supabaseAdmin
      .from("orders")
      .update({
        review_rating: numericRating,
        review_text: reviewContent,
        review_created_at: reviewCreatedAt,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateOrderErr) {
      console.error("Error updating order review fields:", updateOrderErr);
      return NextResponse.json(
        { error: "Could not associate review with reading. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: existingTestimonial
        ? "Your review has been updated."
        : "Thank you! Your review has been submitted.",
      review: {
        order_id: order.id,
        rating: numericRating,
        content: reviewContent,
        review_created_at: reviewCreatedAt,
      },
    });
  } catch (err: unknown) {
    console.error("POST /api/reviews error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while saving your review." },
      { status: 500 }
    );
  }
}

