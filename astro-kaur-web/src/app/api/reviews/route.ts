import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
