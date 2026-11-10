"use client";
import { useEffect, useState } from "react";
import type { Interval } from "@/lib/booking/types";
export const bookingInput =
  "w-full rounded-xl border border-[#E5B842]/30 bg-white dark:bg-[#1E293B] p-3 text-sm text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]";
export const bookingButton =
  "rounded-full bg-[#E5B842] px-5 py-3 text-sm font-semibold text-[#0F172A] disabled:opacity-50";
export function formatAppointment(value: string, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
export function ZoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (zone: string) => void;
}) {
  const zones = [
    ...new Set([
      value,
      "Europe/Berlin",
      "Asia/Calcutta",
      "Asia/Kolkata",
      "Europe/London",
      "America/New_York",
      "America/Los_Angeles",
      "Australia/Sydney",
      "UTC",
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  ];
  return (
    <label className="block text-sm">
      Time zone
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${bookingInput} mt-1`}
      >
        {zones.map((zone) => (
          <option key={zone}>{zone}</option>
        ))}
      </select>
    </label>
  );
}
export default function SlotPicker({
  serviceId,
  orderId,
  zone,
  value,
  onChange,
}: {
  serviceId: string;
  orderId?: string;
  zone: string;
  value: string;
  onChange: (start: string) => void;
}) {
  const [slots, setSlots] = useState<Interval[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    fetch(
      `/api/availability?service=${encodeURIComponent(serviceId)}${orderId ? `&order=${encodeURIComponent(orderId)}` : ""}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (active) {
          setSlots(data.slots);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setSlots([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [serviceId, orderId, refresh]);
  const day = (start: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(start));
  const dates = [...new Set(slots.map((s) => day(s.start)))];
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm opacity-75">
        Available consultations over the next 3 days. Times shown in {zone}.
      </p>
      {loading ? (
        <p>Checking availability…</p>
      ) : error ? (
        <p role="alert" className="text-red-600 dark:text-red-300">
          {error}
        </p>
      ) : !slots.length ? (
        <p>
          No appointments are available right now. Please check again later.
        </p>
      ) : null}
      {dates.map((date) => (
        <div key={date} className="space-y-2">
          <h4 className="font-serif text-lg">{date}</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots
              .filter((s) => day(s.start) === date)
              .map((s) => (
                <button
                  key={s.start}
                  type="button"
                  aria-pressed={value === s.start}
                  onClick={() => onChange(s.start)}
                  className={`rounded-xl p-3 border text-sm ${value === s.start ? "bg-[#E5B842] border-[#E5B842] text-[#0F172A]" : "border-[#E5B842]/30 hover:border-[#E5B842]"}`}
                >
                  {new Intl.DateTimeFormat("en-GB", {
                    timeZone: zone,
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(s.start))}
                </button>
              ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="text-sm underline underline-offset-4"
        onClick={() => {
          setLoading(true);
          onChange("");
          setRefresh((n) => n + 1);
        }}
      >
        Refresh availability
      </button>
    </div>
  );
}
