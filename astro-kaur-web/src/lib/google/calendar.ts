import "server-only";
import { BookingError, check, database, siteUrl } from "@/lib/booking/server";
import type { BookingOrder, Connection, Interval } from "@/lib/booking/types";
import { googleRequest, userConnection } from "./accounts";

export async function googleConnection(): Promise<Connection | null> {
  const row = check(await database().from("google_calendar_connections").select("*").eq("id",true).maybeSingle());
  if(!row?.auth_user_id) return null;
  const account = await userConnection(row.auth_user_id);
  if(!account) return null;
  return {...row, encrypted_refresh_token: account.encrypted_refresh_token || "", status: account.status === "connected" ? row.status : account.status, last_error: account.last_error || row.last_error } as Connection;
}
async function access() {
  const connection = await googleConnection();
  if(!connection) throw new BookingError("Appointments are temporarily unavailable while the organizer connects Google Calendar.",503);
  return {connection,userId:connection.auth_user_id};
}
async function request(path:string,userId:string,options:RequestInit={}) {
  return googleRequest(userId,path,options);
}
export async function freeBusy(
  start: string,
  end: string,
  excludeEventId?: string | null,
): Promise<Interval[]> {
  const { connection, userId } = await access();
  const response = await request("freeBusy", userId, {
    method: "POST",
    body: JSON.stringify({
      timeMin: start,
      timeMax: end,
      items: connection.busy_calendar_ids.map((id) => ({ id })),
    }),
  });
  if (!response.ok)
    throw new BookingError(
      "Calendar availability cannot be checked right now. Please try again shortly.",
      503,
    );
  const data = (await response.json()) as {
    calendars: Record<string, { busy: Interval[]; errors?: unknown[] }>;
  };
  const ranges: Interval[] = [];
  for (const id of connection.busy_calendar_ids) {
    const calendar = data.calendars[id];
    if (!calendar || calendar.errors?.length)
      throw new BookingError(
        "A conflict calendar is unavailable. Please try again shortly.",
        503,
      );
    ranges.push(...calendar.busy);
  }
  // FreeBusy cannot exclude the current appointment during a reschedule. Use a precise
  // event listing for the organizer calendar, retaining every other external event.
  if (excludeEventId) {
    const organizer = connection.calendar_id;
    const withoutOrganizer: Interval[] = [];
    for (const id of connection.busy_calendar_ids.filter(
      (id) => id !== organizer,
    ))
      withoutOrganizer.push(...data.calendars[id].busy);
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({
        timeMin: start,
        timeMax: end,
        singleEvents: "true",
        maxResults: "2500",
        ...(pageToken ? { pageToken } : {}),
      });
      const events = await request(
        `calendars/${encodeURIComponent(organizer)}/events?${query}`,
        userId,
      );
      if (!events.ok)
        throw new BookingError(
          "Calendar availability cannot be checked right now.",
          503,
        );
      const page = (await events.json()) as {
        nextPageToken?: string;
        items: Array<{
          id: string;
          status: string;
          transparency?: string;
          start: { dateTime?: string; date?: string };
          end: { dateTime?: string; date?: string };
        }>;
      };
      for (const event of page.items)
        if (
          event.id !== excludeEventId &&
          event.status !== "cancelled" &&
          event.transparency !== "transparent"
        ) {
          // All-day busy events are conservatively represented by their full UTC dates.
          withoutOrganizer.push({
            start: event.start.dateTime || `${event.start.date}T00:00:00+14:00`,
            end: event.end.dateTime || `${event.end.date}T00:00:00-12:00`,
          });
        }
      pageToken = page.nextPageToken;
    } while (pageToken);
    return withoutOrganizer;
  }
  await database()
    .from("google_calendar_connections")
    .update({
      status: "connected",
      last_success_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", true).eq("auth_user_id", connection.auth_user_id);
  return ranges;
}
export async function syncEvent(order: BookingOrder) {
  const db = database(),
    { connection, userId } = await access();
  const details = check(
    await db
      .from("reading_details")
      .select("google_calendar_event_id")
      .eq("order_id", order.id)
      .single(),
  );
  if (!details) throw new Error("Reading snapshot is missing.");
  const eventId =
    details.google_calendar_event_id || `tak${order.id.replaceAll("-", "")}`;
  const base = `calendars/${encodeURIComponent(connection.calendar_id)}/events`;
  if (order.status === "cancelled") {
    if (details.google_calendar_event_id) {
      const response = await request(
        `${base}/${eventId}?sendUpdates=all`,
        userId,
        { method: "DELETE" },
      );
      if (!response.ok && ![404, 410].includes(response.status))
        throw new Error("Calendar cancellation failed.");
    }
    check(
      await db.rpc("booking_store_calendar", {
        p_order: order.id,
        p_version: order.booking_version,
        p_event: details.google_calendar_event_id,
        p_meet: null,
        p_invitation: "cancelled",
      }),
    );
    return;
  }
  const body = {
    summary: `TheAstroKaur — ${order.service_title}`,
    description: `Your astrology consultation. Manage your appointment: ${siteUrl()}/account/readings/${order.id}`,
    start: { dateTime: order.scheduled_at, timeZone: order.customer_timezone },
    end: {
      dateTime: order.scheduled_end_at,
      timeZone: order.customer_timezone,
    },
    attendees: [{ email: order.customer_email_snapshot }],
    extendedProperties: {
      private: {
        order_id: order.id,
        booking_version: String(order.booking_version),
      },
    },
    conferenceData: {
      createRequest: {
        requestId: `${order.id}-${order.booking_version}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };
  let response = await request(`${base}/${eventId}`, userId);
  if (response.status === 404 && !details.google_calendar_event_id) {
    response = await request(
      `${base}?conferenceDataVersion=1&sendUpdates=all`,
      userId,
      { method: "POST", body: JSON.stringify({ id: eventId, ...body }) },
    );
    if (response.status === 409)
      response = await request(`${base}/${eventId}`, userId);
  } else if (response.ok) {
    const existing = (await response.json()) as {
      status?: string;
      extendedProperties?: {
        private?: { order_id?: string; booking_version?: string };
      };
      conferenceData?: unknown;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    };
    if (existing.status === "cancelled")
      throw new Error(
        "The Google event was deleted externally. Owner attention is required.",
      );
    if (existing.extendedProperties?.private?.order_id !== order.id)
      throw new Error("Calendar event identity mismatch.");
    const matches =
      existing.extendedProperties?.private?.booking_version ===
        String(order.booking_version) &&
      Date.parse(existing.start?.dateTime || "") ===
        Date.parse(order.scheduled_at || "") &&
      Date.parse(existing.end?.dateTime || "") ===
        Date.parse(order.scheduled_end_at || "");
    // Recovery/polling must not send duplicate invitations.
    if (matches)
      response = new Response(JSON.stringify(existing), { status: 200 });
    else
      response = await request(
        `${base}/${eventId}?conferenceDataVersion=1&sendUpdates=all`,
        userId,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...body,
            conferenceData: existing.conferenceData || body.conferenceData,
          }),
        },
      );
  }
  if (!response.ok) throw new Error("Google event synchronization failed.");
  const event = (await response.json()) as {
    id: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType: string; uri: string }>;
    };
  };
  const meet =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")
      ?.uri ||
    null;
  check(
    await db.rpc("booking_store_calendar", {
      p_order: order.id,
      p_version: order.booking_version,
      p_event: event.id,
      p_meet: meet,
      p_invitation: "sent",
    }),
  );
  if (!meet) throw new Error("Google Meet generation is pending.");
  await db
    .from("google_calendar_connections")
    .update({
      status: "connected",
      last_success_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", true).eq("auth_user_id", connection.auth_user_id);
}
