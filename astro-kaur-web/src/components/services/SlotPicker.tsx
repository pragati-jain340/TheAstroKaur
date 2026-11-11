"use client";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import type { Interval } from "@/lib/booking/types";
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
      <NativeSelect
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      >
        {zones.map((zone) => (
          <option key={zone}>{zone}</option>
        ))}
      </NativeSelect>
    </label>
  );
}
export default function SlotPicker({
  serviceId,
  orderId,
  admin = false,
  zone,
  value,
  onChange,
}: {
  serviceId: string;
  orderId?: string;
  admin?: boolean;
  zone: string;
  value: string;
  onChange: (start: string) => void;
}) {
  const [slots, setSlots] = useState<Interval[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [selectedDate, setSelectedDate] = useState("");
  useEffect(() => {
    let active = true;
    fetch(
      `/api/availability?service=${encodeURIComponent(serviceId)}${orderId ? `&order=${encodeURIComponent(orderId)}` : ""}${admin ? "&admin=1" : ""}`,
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
  }, [serviceId, orderId, refresh, admin]);
  const groupedSlots = useMemo(() => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const groups = new Map<string, { start: string; time: string }[]>();
    for (const slot of slots) {
      const instant = new Date(slot.start), date = day.format(instant);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push({ start: slot.start, time: time.format(instant) });
    }
    return groups;
  }, [slots, zone]);
  const dates = [...groupedSlots.keys()];
  const selected = dates.includes(selectedDate) ? selectedDate : "";
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm opacity-75">
        Available consultations over the next {admin ? 90 : 30} days. Times shown in {zone}.
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
      {dates.length > 0 && (
        <>
          <label className="block text-sm">
            Choose a date
            <NativeSelect className="mt-1" value={selected} onChange={(event) => setSelectedDate(event.target.value)}>
              <option value="">All available dates</option>
              {dates.map((date) => <option key={date} value={date}>{date}</option>)}
            </NativeSelect>
          </label>
        </>
      )}
      {dates.filter((date) => !selected || date === selected).map((date) => (
        <div key={date} className="space-y-2">
          <h4 className="font-serif text-lg">{date}</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {groupedSlots.get(date)!.map((s) => (
                <Button variant="outline" size="lg"
                  key={s.start}
                  type="button"
                  aria-pressed={value === s.start}
                  onClick={() => onChange(s.start)}
                  className={`rounded-xl p-3 border text-sm ${value === s.start ? "bg-[#E5B842] border-[#E5B842] text-[#0F172A]" : "border-[#E5B842]/30 hover:border-[#E5B842]"}`}
                >
                  {s.time}
                </Button>
              ))}
          </div>
        </div>
      ))}
      <Button variant="link"
        type="button"
        onClick={() => {
          setLoading(true);
          onChange("");
          setSelectedDate("");
          setRefresh((n) => n + 1);
        }}
      >
        Refresh availability
      </Button>
    </div>
  );
}
