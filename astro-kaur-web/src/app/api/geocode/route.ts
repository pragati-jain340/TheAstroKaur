import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ places: [] });
    }

    const trimmed = query.trim();

    // Call OpenStreetMap Nominatim with proper User-Agent
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=5`;

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "TheAstroKaur-Website/1.0 (contact@theastrokaur.com)",
        Accept: "application/json",
      },
      // Cache results briefly to respect OSM rate limits
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ places: [] });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ places: [] });
    }

    const places = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      // Estimate timezone offset from longitude as a reasonable baseline
      // or standard zone. (15 degrees per hour)
      // Navamsha accepts exact numeric hours offset (e.g. 5.5 for IST, 1.0 for CET/Germany)
      let defaultTz = Math.round((lon / 15) * 2) / 2;
      const countryCode = (item.address?.country_code || "").toLowerCase();

      // Precise offsets for common countries:
      if (countryCode === "in") defaultTz = 5.5; // India
      if (countryCode === "de" || countryCode === "fr" || countryCode === "it" || countryCode === "es") defaultTz = 1.0; // Central Europe
      if (countryCode === "gb") defaultTz = 0.0; // UK
      if (countryCode === "us") {
        // Simple US longitude bands
        if (lon > -75) defaultTz = -5.0; // Eastern
        else if (lon > -90) defaultTz = -5.0; // Eastern
        else if (lon > -105) defaultTz = -6.0; // Central
        else if (lon > -120) defaultTz = -7.0; // Mountain
        else defaultTz = -8.0; // Pacific
      }
      if (countryCode === "ca") defaultTz = -5.0;
      if (countryCode === "au") defaultTz = 10.0;
      if (countryCode === "ae") defaultTz = 4.0; // UAE
      if (countryCode === "sg") defaultTz = 8.0; // Singapore

      return {
        id: item.place_id,
        displayName: item.display_name,
        name: item.name || item.display_name.split(",")[0],
        latitude: lat,
        longitude: lon,
        country: item.address?.country || "",
        countryCode,
        timezone: defaultTz,
      };
    });

    return NextResponse.json({ places });
  } catch (error: any) {
    console.error("Geocode error:", error);
    return NextResponse.json({ places: [] });
  }
}
