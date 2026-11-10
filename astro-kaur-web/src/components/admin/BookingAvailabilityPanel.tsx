"use client";
import GoogleCalendarSettings from "@/components/services/GoogleCalendarSettings";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  AvailabilityOverride,
  AvailabilityWindow,
  Settings,
  Interval,
} from "@/lib/booking/types";
import SlotPicker, {
  bookingButton,
  bookingInput,
  formatAppointment,
  ZoneSelect,
} from "@/components/services/SlotPicker";
interface AdminData {
  settings: Settings;
  windows: AvailabilityWindow[];
  overrides: AvailabilityOverride[];
  connection: {
    organizer_email: string;
    calendar_id: string;
    busy_calendar_ids: string[];
    status: string;
    last_success_at: string | null;
    last_error: string | null;
  } | null;
  jobs: Array<{
    id: string;
    order_id: string;
    kind: string;
    status: string;
    last_error: string | null;
  }>;
  requests: Array<{
    id: string;
    order_id: string;
    kind: string;
    reason: string;
    created_at: string;
  }>;
  services: Array<{ id: string; title: string; format: string }>;
  busy: Interval[];
  busy_error: string | null;
}
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export default function BookingAvailabilityPanel() {
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const [tab, setTab] = useState("availability"),
    [preview, setPreview] = useState(""),
    [zone, setZone] = useState("Europe/Berlin"),
    [selected, setSelected] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/availability?busy=1", {
        cache: "no-store",
      }),
      result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, []);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    fetch("/api/admin/availability?busy=1", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (active) {
          setData(result);
          const requestedTab=query.get('tab');
          if(query.has('google'))setTab('integrations');
          else if(requestedTab && ['availability','integrations','operations'].includes(requestedTab))setTab(requestedTab);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save() {
    if (!data) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/availability", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({settings:data.settings,windows:data.windows,overrides:data.overrides}),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Availability saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <details
      id="booking-settings"
      className="rounded-2xl border border-[#E5B842]/30 bg-white dark:bg-[#0D1829] p-5 text-[#0F172A] dark:text-[#FAF8F5]"
      open
    >
      <summary className="font-serif text-xl cursor-pointer">
        Availability and booking operations
      </summary>
      <div className="space-y-5 mt-5">
        {data && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5B842]/30 p-3 text-sm">
          <p role="status">Google Calendar: <strong>{data.connection?.status==='connected'?'Connected':data.connection?.status.replaceAll('_',' ') || 'Not connected'}</strong>{data.connection?.organizer_email?` · ${data.connection.organizer_email}`:''}</p>
          <button className="underline" onClick={()=>setTab('integrations')}>View connection</button>
        </div>}
        <div
          className="flex gap-2 flex-wrap"
          role="tablist"
          aria-label="Booking settings"
        >
          {["availability", "integrations", "operations"].map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`px-4 py-2 rounded-full text-sm capitalize ${tab === name ? "bg-[#E5B842] text-[#0F172A]" : "border border-[#E5B842]/30"}`}
            >
              {name}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {!data ? (
          <p className="text-sm">Loading scheduling settings…</p>
        ) : (
          <>
            {tab === "availability" && (
              <div className="space-y-5">
                <p className="text-sm opacity-70">
                  One shared calendar for all calls. Written readings never use
                  these hours. Minimum notice: 15 minutes · advance window: 3
                  days · payment hold: 5 minutes.
                </p>
                <ZoneSelect
                  value={data.settings.timezone}
                  onChange={(timezone) =>
                    setData({
                      ...data,
                      settings: { ...data.settings, timezone },
                    })
                  }
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm">
                    Buffer after each call (minutes)
                    <input
                      type="number"
                      min={0}
                      max={120}
                      className={bookingInput}
                      value={data.settings.buffer_minutes}
                      onChange={(e) =>
                        setData({
                          ...data,
                          settings: {
                            ...data.settings,
                            buffer_minutes: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Start interval (minutes)
                    <select
                      className={bookingInput}
                      value={data.settings.slot_step_minutes}
                      onChange={(e) =>
                        setData({
                          ...data,
                          settings: {
                            ...data.settings,
                            slot_step_minutes: Number(e.target.value),
                          },
                        })
                      }
                    >
                      {[5, 10, 15, 20, 30, 60].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.settings.booking_enabled}
                    onChange={(e) =>
                      setData({
                        ...data,
                        settings: {
                          ...data.settings,
                          booking_enabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Enable call booking after Google is connected and working
                  hours are saved
                </label>
                <h3 className="font-serif text-lg">Weekly hours</h3>
                {data.windows.map((w, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end"
                  >
                    <label className="text-xs">
                      Day
                      <select
                        aria-label="Weekday"
                        className={bookingInput}
                        value={w.weekday}
                        onChange={(e) =>
                          setData({
                            ...data,
                            windows: data.windows.map((v, j) =>
                              i === j
                                ? { ...v, weekday: Number(e.target.value) }
                                : v,
                            ),
                          })
                        }
                      >
                        {days.map((day, n) => (
                          <option key={day} value={n}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs">
                      Start
                      <input
                        type="time"
                        className={bookingInput}
                        value={w.start_local.slice(0, 5)}
                        onChange={(e) =>
                          setData({
                            ...data,
                            windows: data.windows.map((v, j) =>
                              i === j
                                ? { ...v, start_local: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      End
                      <input
                        type="time"
                        className={bookingInput}
                        value={w.end_local.slice(0, 5)}
                        onChange={(e) =>
                          setData({
                            ...data,
                            windows: data.windows.map((v, j) =>
                              i === j ? { ...v, end_local: e.target.value } : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      className="p-3 text-sm underline"
                      onClick={() =>
                        setData({
                          ...data,
                          windows: data.windows.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove window
                    </button>
                  </div>
                ))}
                <button
                  className="text-sm underline"
                  onClick={() =>
                    setData({
                      ...data,
                      windows: [
                        ...data.windows,
                        {
                          weekday: 1,
                          start_local: "18:00",
                          end_local: "21:00",
                          enabled: true,
                        },
                      ],
                    })
                  }
                >
                  Add weekly window
                </button>
                <h3 className="font-serif text-lg">
                  Date exceptions and manual blocks
                </h3>
                <p className="text-sm opacity-70">
                  Empty start/end on a block closes the whole day. Blocks take
                  priority over weekly and extra hours. The call and its buffer
                  must fit within an opening.
                </p>
                {data.overrides.map((o, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                  >
                    <label className="text-xs">
                      Date
                      <input
                        type="date"
                        className={bookingInput}
                        value={o.local_date}
                        onChange={(e) =>
                          setData({
                            ...data,
                            overrides: data.overrides.map((v, j) =>
                              i === j
                                ? { ...v, local_date: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      Mode
                      <select
                        className={bookingInput}
                        value={o.mode}
                        onChange={(e) =>
                          setData({
                            ...data,
                            overrides: data.overrides.map((v, j) =>
                              i === j
                                ? {
                                    ...v,
                                    mode: e.target
                                      .value as AvailabilityOverride["mode"],
                                  }
                                : v,
                            ),
                          })
                        }
                      >
                        <option value="blocked">Blocked</option>
                        <option value="extra_open">Extra hours</option>
                      </select>
                    </label>
                    <label className="text-xs">
                      Start
                      <input
                        type="time"
                        className={bookingInput}
                        value={o.start_local?.slice(0, 5) || ""}
                        onChange={(e) =>
                          setData({
                            ...data,
                            overrides: data.overrides.map((v, j) =>
                              i === j
                                ? { ...v, start_local: e.target.value || null }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      End
                      <input
                        type="time"
                        className={bookingInput}
                        value={o.end_local?.slice(0, 5) || ""}
                        onChange={(e) =>
                          setData({
                            ...data,
                            overrides: data.overrides.map((v, j) =>
                              i === j
                                ? { ...v, end_local: e.target.value || null }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      className="p-3 text-sm underline"
                      onClick={() =>
                        setData({
                          ...data,
                          overrides: data.overrides.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  className="text-sm underline"
                  onClick={() =>
                    setData({
                      ...data,
                      overrides: [
                        ...data.overrides,
                        {
                          local_date: new Date().toISOString().slice(0, 10),
                          mode: "blocked",
                          start_local: null,
                          end_local: null,
                        },
                      ],
                    })
                  }
                >
                  Add date exception
                </button>
                <button
                  className={`block ${bookingButton}`}
                  onClick={save}
                  disabled={working}
                >
                  {working ? "Saving…" : "Save availability"}
                </button>
                <h3 className="font-serif text-lg">
                  Preview saved availability
                </h3>
                <select
                  aria-label="Preview service"
                  className={bookingInput}
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                >
                  <option value="">Select a call service</option>
                  {data.services
                    .filter((s) => s.format === "voice_call")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
                {preview && (
                  <>
                    <ZoneSelect value={zone} onChange={setZone} />
                    <SlotPicker
                      key={`${preview}:${data.settings.timezone}`}
                      serviceId={preview}
                      zone={zone}
                      value={selected}
                      onChange={setSelected}
                    />
                    {selected && (
                      <p className="text-sm">
                        Owner:{" "}
                        {formatAppointment(selected, data.settings.timezone)} (
                        {data.settings.timezone})<br />
                        Customer: {formatAppointment(selected, zone)} ({zone})
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {tab === "integrations" && (
              <div className="space-y-4 text-sm">
                <p>
                  Booking worker last seen:{" "}
                  {data.settings.worker_last_seen_at || "Not running yet"}.
                  Checkout requires a worker heartbeat within the past two
                  minutes.
                </p>
                <p>
                  Google: {data.connection?.organizer_email || "Not connected"}{" "}
                  · {data.connection?.status || "Setup required"}
                </p>
                <GoogleCalendarSettings purpose="organizer" onConnectionChange={()=>{void load().catch(err=>setError(err.message));}} />
                <p>
                  The selected personal Google account organizes calls. Use
                  free/busy sharing for additional personal calendars. Do not
                  connect an employer calendar.
                </p>
                <h3 className="font-serif text-lg">
                  External busy periods (read only)
                </h3>
                {data.busy_error && <p role="alert">{data.busy_error}</p>}
                {data.busy.slice(0, 30).map((range, i) => (
                  <p key={i} className="p-2 border-l-2 border-[#6B3448]">
                    External busy ·{" "}
                    {formatAppointment(range.start, data.settings.timezone)} —{" "}
                    {formatAppointment(range.end, data.settings.timezone)}
                  </p>
                ))}
              </div>
            )}
            {tab === "operations" && (
              <div className="space-y-5 text-sm">
                <h3 className="font-serif text-lg">
                  Withdrawal / refund requests
                </h3>
                {!data.requests.length && <p>No pending requests.</p>}
                {data.requests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-[#E5B842]/20 p-3 rounded-xl"
                  >
                    <Link
                      className="underline"
                      href={`/admin/readings/${request.order_id}`}
                    >
                      {request.kind} · {request.order_id.slice(0, 8)}
                    </Link>
                    <p>{request.reason}</p>
                  </div>
                ))}
                <h3 className="font-serif text-lg">
                  Pending jobs and integration failures
                </h3>
                {!data.jobs.length && <p>No pending jobs.</p>}
                {data.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border-b border-[#E5B842]/20 pb-2"
                  >
                    <Link
                      className="underline"
                      href={`/admin/readings/${job.order_id}`}
                    >
                      {job.kind} · {job.status} · {job.order_id.slice(0, 8)}
                    </Link>
                    {job.last_error && <p>{job.last_error}</p>}
                    {job.status === "failed" && (
                      <button
                        className="text-xs underline"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                                "/api/admin/availability",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ job_id: job.id }),
                                },
                              ),
                              result = await response.json();
                            if (!response.ok) throw new Error(result.error);
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Unable to retry.",
                            );
                          }
                        }}
                      >
                        Retry failed job
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="underline"
                  onClick={() => load().catch((err) => setError(err.message))}
                >
                  Refresh operations
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
