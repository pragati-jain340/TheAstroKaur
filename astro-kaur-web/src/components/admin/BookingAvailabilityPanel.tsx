"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useCallback, useEffect, useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";
import { coversBooking } from "@/lib/booking/slots";
import type {
  AvailabilityOverride,
  AvailabilityWindow,
  Settings,
  Interval,
} from "@/lib/booking/types";
import {
  formatAppointment,
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
type ScheduledCall = { id: string; client_name: string | null; scheduled_at: string | null; scheduled_end_at: string | null };

function coversCall(data: AdminData, call: ScheduledCall) {
  if (!call.scheduled_at || !call.scheduled_end_at) return false;
  return coversBooking(data.settings, data.windows, data.overrides, call.scheduled_at, call.scheduled_end_at);
}

export default function BookingAvailabilityPanel({ onSaved, calls = [], initialData }: { onSaved?: () => void; calls?: ScheduledCall[]; initialData?: AdminData | null }) {
  const [data, setData] = useState<AdminData | null>(initialData || null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const [savedData, setSavedData] = useState<AdminData | null>(initialData || null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setSavedData(initialData);
      if (!initialData.windows.length && !initialData.overrides.length || window.location.hash === '#booking-settings') setExpanded(true);
    }
  }, [initialData]);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/availability", {
        cache: "no-store",
      }),
      result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
    setSavedData(result);
  }, []);
  useEffect(() => {
    if (initialData) return;
    let active = true;
    fetch("/api/admin/availability", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (active) {
          setData(result);
          setSavedData(result);
          if (!result.windows.length && !result.overrides.length || window.location.hash === '#booking-settings') setExpanded(true);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [initialData]);
  async function save() {
    if (!data) return;
    const affected = savedData ? calls.filter((call) => coversCall(savedData, call) && !coversCall(data, call)) : [];
    if (affected.length && !window.confirm(`These confirmed calls will remain booked outside the new hours:\n\n${affected.map((call) => `${call.client_name || "Customer"}: ${formatAppointment(call.scheduled_at!, data.settings.timezone)}`).join("\n")}\n\nSave these hours?`)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/availability", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({settings:{...data.settings, booking_enabled: true},windows:data.windows,overrides:data.overrides}),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Availability saved.");
      setExpanded(false);
      await load();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <details
      id="booking-settings"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="rounded-2xl border border-[#E5B842]/20 bg-card p-5 text-[#0F172A] dark:border-white/10 dark:text-[#FAF8F5] sm:p-6 shadow-xs"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#805b11] dark:focus-visible:outline-[#E5B842] select-none">
        <div className="flex items-center gap-2.5">
          <CalendarRange className="w-5 h-5 text-[#B87936] dark:text-[#E5B842]" />
          <h2 className="font-serif text-2xl font-medium tracking-tight">
            {expanded ? "Set availability" : "Edit availability"}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{expanded ? "Hide settings" : "Weekly hours & overrides"}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </summary>
      <div className="space-y-5 mt-5">
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
              <div className="space-y-5">
                <p className="text-sm opacity-70">
                  Choose when customers can book a call.
                </p>
                <div className="border-t border-[#0F172A]/10 pt-5 dark:border-white/10"><h3 className="text-sm font-semibold">Weekly hours</h3><p className="mt-1 text-sm text-[#46505F] dark:text-[#BCC4D0]">Repeat the same hours each week.</p></div>
                {data.windows.map((w, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-3 items-end"
                  >
                    <label className="text-xs">
                      Day
                      <NativeSelect
                        aria-label="Weekday"
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
                      </NativeSelect>
                    </label>
                    <label className="text-xs">
                      Start
                      <Input
                        type="time"
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
                      <Input
                        type="time"
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
                    <Button
                      variant="link" className="justify-self-start px-0"
                      onClick={() =>
                        setData({
                          ...data,
                          windows: data.windows.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove hours
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
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
                  + Add weekly hours
                </Button>
                <div className="border-t border-[#0F172A]/10 pt-5 dark:border-white/10"><h3 className="text-sm font-semibold">Specific dates</h3><p className="mt-1 text-sm text-[#46505F] dark:text-[#BCC4D0]">Add hours or block time on a particular date.</p></div>
                {data.overrides.map((o, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-3 items-end"
                  >
                    <label className="text-xs">
                      Date
                      <Input
                        type="date"
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
                      <NativeSelect
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
                      </NativeSelect>
                    </label>
                    <label className="text-xs">
                      Start
                      <Input
                        type="time"
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
                      <Input
                        type="time"
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
                    <Button
                      variant="link" className="justify-self-start px-0"
                      onClick={() =>
                        setData({
                          ...data,
                          overrides: data.overrides.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setData({
                      ...data,
                      overrides: [
                        ...data.overrides,
                        {
                          local_date: new Date().toISOString().slice(0, 10),
                          mode: "extra_open",
                          start_local: "14:00",
                          end_local: "17:00",
                        },
                      ],
                    })
                  }
                >
                  + Add date and hours
                </Button>
                <Button
                  size="lg"
                  onClick={save}
                  disabled={working}
                >
                  {working ? "Saving…" : "Save availability"}
                </Button>

              </div>
          </>
        )}
      </div>
    </details>
  );
}
