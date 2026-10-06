"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/lib/supabase/types";

interface ScheduledOrder extends Order {
  customerEmail?: string;
  google_calendar_event_id?: string | null;
}

export default function AdminCalendarPage() {
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<ScheduledOrder[]>([]);
  const [unscheduledOrders, setUnscheduledOrders] = useState<ScheduledOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar View & Navigation
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ScheduledOrder | null>(null);

  // Reschedule / Schedule Modal
  const [schedulingOrder, setSchedulingOrder] = useState<ScheduledOrder | null>(null);
  const [scheduleDatetime, setScheduleDatetime] = useState<string>("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Google Calendar Integration Drawer / Modal
  const [isGCalModalOpen, setIsGCalModalOpen] = useState(false);

  // Unscheduled drawer toggle
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCalendarData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      // 2. Fetch Customer Profiles for emails
      const { data: profilesData } = await supabase
        .from("customer_profiles")
        .select("id, email, display_name");

      const profileMap = new Map<string, { email: string; display_name: string | null }>();
      (profilesData || []).forEach((p: { id: string; email: string; display_name: string | null }) => {
        profileMap.set(p.id, { email: p.email, display_name: p.display_name });
      });

      // 3. Fetch Reading Details for Google Calendar Event IDs
      const { data: detailsData } = await supabase
        .from("reading_details")
        .select("id, order_id, google_calendar_event_id");

      const detailsMap = new Map<string, string | null>();
      (detailsData || []).forEach((d: { id: string; order_id: string; google_calendar_event_id: string | null }) => {
        if (d.order_id) {
          detailsMap.set(d.order_id, d.google_calendar_event_id);
        }
      });

      const all: ScheduledOrder[] = (ordersData || []).map((o: Order) => ({
        ...o,
        customerEmail: o.auth_user_id ? profileMap.get(o.auth_user_id)?.email || "" : "",
        google_calendar_event_id: detailsMap.get(o.id) || null,
      }));

      const scheduled = all.filter((o) => !!o.scheduled_at);
      const unscheduled = all.filter((o) => !o.scheduled_at && o.status !== "cancelled");

      setOrders(scheduled);
      setUnscheduledOrders(unscheduled);
    } catch (err: unknown) {
      console.error("Error fetching calendar orders:", err);
      setError((err as Error).message || "Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Navigation handlers
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  // Month Grid Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 - 11

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Map of date string "YYYY-MM-DD" -> ScheduledOrder[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduledOrder[]>();
    for (const order of orders) {
      if (!order.scheduled_at) continue;
      const datePart = order.scheduled_at.split("T")[0];
      if (!map.has(datePart)) {
        map.set(datePart, []);
      }
      map.get(datePart)!.push(order);
    }
    return map;
  }, [orders]);

  // Week View Calculations
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 Sun.. 6 Sat
    d.setDate(d.getDate() - dayOfWeek); // start from Sunday
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // Save / Reschedule handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingOrder || !scheduleDatetime) return;

    setIsSavingSchedule(true);
    try {
      const isoString = new Date(scheduleDatetime).toISOString();
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          scheduled_at: isoString,
          status: schedulingOrder.status === "pending" ? "confirmed" : schedulingOrder.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedulingOrder.id);

      if (updateErr) throw updateErr;

      setToastMessage("Appointment scheduled successfully!");
      setSchedulingOrder(null);
      setScheduleDatetime("");
      setTimeout(() => setToastMessage(null), 3000);
      await fetchCalendarData();
    } catch (err: unknown) {
      alert("Failed to update schedule: " + ((err as Error).message || "Unknown error"));
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const openScheduleModal = (order: ScheduledOrder) => {
    setSchedulingOrder(order);
    if (order.scheduled_at) {
      // Convert to local YYYY-MM-DDTHH:mm format for input
      const d = new Date(order.scheduled_at);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      setScheduleDatetime(localISOTime);
    } else {
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setScheduleDatetime(localISOTime);
    }
  };

  // Helper for status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "confirmed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Header & Breadcrumb */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase hover:underline"
            >
              ADMIN
            </Link>
            <span className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">/</span>
            <span className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
              CALENDAR
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            READINGS CALENDAR
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Astrology consultation appointments, scheduled readings, and calendar integration status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Google Calendar Status Badge / Action */}
          <button
            onClick={() => setIsGCalModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/40 transition-colors shadow-xs flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
              Google Calendar: Not Connected
            </span>
          </button>

          {/* Unscheduled Drawer Toggle */}
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors shadow-xs flex items-center gap-1.5 ${
              showUnscheduled
                ? "bg-[#E5B842] text-[#070D18] border-[#E5B842]"
                : "border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/40"
            }`}
          >
            <span>Unscheduled</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0F172A]/10 dark:bg-[#FAF8F5]/10">
              {unscheduledOrders.length}
            </span>
          </button>

          <button
            onClick={fetchCalendarData}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/40 transition-colors shadow-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Unscheduled Orders Banner (Collapsible) */}
      {showUnscheduled && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 dark:text-amber-400 text-sm">📅</span>
              <h3 className="font-serif text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                Unscheduled Readings Requiring Appointment Times ({unscheduledOrders.length})
              </h3>
            </div>
            <button
              onClick={() => setShowUnscheduled(false)}
              className="text-xs text-[#0F172A]/40 hover:text-[#0F172A]"
            >
              ✕ Close
            </button>
          </div>

          {unscheduledOrders.length === 0 ? (
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 italic">
              All active readings are scheduled on the calendar!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unscheduledOrders.map((uo) => (
                <div
                  key={uo.id}
                  className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-xl p-3.5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-medium text-xs text-[#0F172A] dark:text-[#FAF8F5] truncate">
                        {uo.client_name || "Client"}
                      </h4>
                      <span className="text-[10px] text-[#0F172A]/40">
                        {new Date(uo.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#E5B842] font-serif font-medium truncate">
                      {uo.service_title}
                    </p>
                    <p className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5 truncate">
                      {uo.customerEmail || "No account email"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#0F172A]/5 dark:border-[#FAF8F5]/5">
                    <Link
                      href={`/admin/readings/${uo.id}`}
                      className="text-[10px] font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#E5B842]"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => openScheduleModal(uo)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wider uppercase bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors"
                    >
                      Schedule Time →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Controls Bar */}
      <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842] text-[#0F172A] dark:text-[#FAF8F5] transition-colors shadow-2xs"
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-xl border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-center text-sm hover:border-[#E5B842] transition-colors text-[#0F172A] dark:text-[#FAF8F5]"
            >
              ‹
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-xl border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-center text-sm hover:border-[#E5B842] transition-colors text-[#0F172A] dark:text-[#FAF8F5]"
            >
              ›
            </button>
          </div>

          <h2 className="font-serif text-lg font-bold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight pl-2">
            {viewMode === "day"
              ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
              : monthName}
          </h2>
        </div>

        {/* View Switcher (Month / Week / Day) */}
        <div className="flex items-center rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] p-1 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs self-start md:self-auto">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === "month"
                ? "bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] shadow-xs font-semibold"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === "week"
                ? "bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] shadow-xs font-semibold"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === "day"
                ? "bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] shadow-xs font-semibold"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Main Calendar View Area */}
      {loading ? (
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-16 text-center text-xs text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
          Loading calendar appointments...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-6 text-xs">
          <p className="font-bold mb-1">Failed to load calendar</p>
          <p>{error}</p>
        </div>
      ) : viewMode === "month" ? (
        /* ================= MONTH VIEW ================= */
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl overflow-hidden shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 text-center bg-[#FAF8F5] dark:bg-[#0D1829]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, idx) => (
              <div key={idx} className="py-2.5 text-[11px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
                {dayName}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#0F172A]/5 dark:divide-[#FAF8F5]/5">
            {/* Blank leading days from previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => {
              const dayNum = daysInPrevMonth - firstDayOfMonth + idx + 1;
              return (
                <div
                  key={`prev-${idx}`}
                  className="min-h-[105px] p-2 bg-[#FAF8F5]/40 dark:bg-[#0D1829]/40 opacity-40 text-xs"
                >
                  <span className="font-medium text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                    {dayNum}
                  </span>
                </div>
              );
            })}

            {/* Current Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isToday =
                new Date().toISOString().split("T")[0] === dateStr;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                    isToday ? "bg-[#E5B842]/5 dark:bg-[#E5B842]/5" : "hover:bg-[#FAF8F5]/60 dark:hover:bg-[#0D1829]/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-semibold inline-flex items-center justify-center ${
                          isToday
                            ? "w-6 h-6 rounded-full bg-[#E5B842] text-[#070D18]"
                            : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-[#E5B842]">
                          {dayEvents.length} {dayEvents.length === 1 ? "appt" : "appts"}
                        </span>
                      )}
                    </div>

                    {/* Event Badges */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const timeStr = event.scheduled_at
                          ? new Date(event.scheduled_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "";
                        return (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="w-full text-left p-1.5 rounded-lg text-[10px] leading-tight bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842] transition-colors truncate block group"
                          >
                            <span className="font-semibold text-[#E5B842] mr-1">{timeStr}</span>
                            <span className="text-[#0F172A] dark:text-[#FAF8F5] group-hover:underline">
                              {event.client_name || "Client"}
                            </span>
                          </button>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <p className="text-[9px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 pl-1 font-medium">
                          +{dayEvents.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* ================= WEEK VIEW ================= */
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 text-center bg-[#FAF8F5] dark:bg-[#0D1829]">
            {weekDays.map((d, idx) => {
              const dateStr = d.toISOString().split("T")[0];
              const isToday = new Date().toISOString().split("T")[0] === dateStr;
              return (
                <div key={idx} className={`py-3 ${isToday ? "bg-[#E5B842]/10" : ""}`}>
                  <p className="text-[10px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p className={`text-base font-serif font-bold ${isToday ? "text-[#E5B842]" : "text-[#0F172A] dark:text-[#FAF8F5]"}`}>
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-[#0F172A]/5 dark:divide-[#FAF8F5]/5 min-h-[420px]">
            {weekDays.map((d, idx) => {
              const dateStr = d.toISOString().split("T")[0];
              const dayEvents = eventsByDate.get(dateStr) || [];
              return (
                <div key={idx} className="p-2 space-y-2">
                  {dayEvents.length === 0 ? (
                    <div className="text-center pt-8 text-[11px] text-[#0F172A]/30 dark:text-[#FAF8F5]/30">
                      No appts
                    </div>
                  ) : (
                    dayEvents.map((event) => {
                      const timeStr = event.scheduled_at
                        ? new Date(event.scheduled_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "";
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="cursor-pointer p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842] transition-colors shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[#E5B842]">{timeStr}</span>
                            <span className={`px-1.5 py-0.2 rounded-full font-bold uppercase ${getStatusBadge(event.status)}`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="font-serif font-semibold text-xs text-[#0F172A] dark:text-[#FAF8F5] leading-tight">
                            {event.service_title}
                          </p>
                          <p className="text-[11px] text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                            {event.client_name || "Client"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= DAY VIEW ================= */
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#0F172A] dark:text-[#FAF8F5]">
                {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                Detailed appointment timeline for this day.
              </p>
            </div>
          </div>

          {(() => {
            const dateStr = currentDate.toISOString().split("T")[0];
            const dayEvents = eventsByDate.get(dateStr) || [];
            if (dayEvents.length === 0) {
              return (
                <div className="py-16 text-center space-y-2">
                  <p className="text-2xl text-[#0F172A]/20 dark:text-[#FAF8F5]/20 font-serif">☕</p>
                  <p className="font-serif text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    No Appointments Scheduled for this Date
                  </p>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                    Use the navigation arrows above or the Unscheduled tab to book reading sessions.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {dayEvents.map((event) => {
                  const timeStr = event.scheduled_at
                    ? new Date(event.scheduled_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={event.id}
                      className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#E5B842]/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#E5B842]/15 text-[#E5B842] flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider">Time</span>
                          <span className="text-xs font-bold font-serif">{timeStr.split(" ")[0]}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif font-bold text-sm text-[#0F172A] dark:text-[#FAF8F5]">
                              {event.service_title}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(event.status)}`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                            Client: {event.client_name || "Client"} {event.customerEmail ? `(${event.customerEmail})` : ""}
                          </p>
                          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                            Format: {event.format === "voice_call" ? "Voice Consultation" : "Detailed Text Report"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openScheduleModal(event)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842] text-[#0F172A] dark:text-[#FAF8F5]"
                        >
                          Reschedule
                        </button>
                        <Link
                          href={`/admin/readings/${event.id}`}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors uppercase tracking-wider"
                        >
                          View Reading →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Appointment Detail Popup / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                  Appointment Details
                </span>
                <h3 className="font-serif text-lg font-bold text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">
                  {selectedEvent.service_title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 flex items-center justify-center text-xs hover:bg-[#0F172A]/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/6 dark:border-[#FAF8F5]/6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Scheduled Date & Time</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    {selectedEvent.scheduled_at
                      ? new Date(selectedEvent.scheduled_at).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Unscheduled"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Client Name</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    {selectedEvent.client_name || "Client"}
                  </span>
                </div>
                {selectedEvent.customerEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Client Email</span>
                    <span className="text-[#0F172A] dark:text-[#FAF8F5]">{selectedEvent.customerEmail}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Delivery Format</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                    {selectedEvent.format === "voice_call" ? "Voice Consultation" : "Detailed Text Report"}
                  </span>
                </div>
              </div>

              {/* Google Calendar Status in Event Detail */}
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                  <span>📅</span>
                  <span>Google Calendar Sync Status</span>
                </div>
                {selectedEvent.google_calendar_event_id ? (
                  <p className="text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                    Synced with Google Calendar (Event ID: {selectedEvent.google_calendar_event_id})
                  </p>
                ) : (
                  <p className="text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                    Not synced to external Google Calendar. Managed locally via AstroKaur order scheduler.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                onClick={() => {
                  const ev = selectedEvent;
                  setSelectedEvent(null);
                  openScheduleModal(ev);
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842] text-[#0F172A] dark:text-[#FAF8F5]"
              >
                Change Date / Time
              </button>

              <Link
                href={`/admin/readings/${selectedEvent.id}`}
                className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors shadow-xs"
              >
                Open Full Reading →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule / Schedule Modal */}
      {schedulingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-3">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                  Schedule Consultation Time
                </h3>
                <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5">
                  {schedulingOrder.service_title} • {schedulingOrder.client_name || "Client"}
                </p>
              </div>
              <button
                onClick={() => setSchedulingOrder(null)}
                className="w-8 h-8 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 flex items-center justify-center text-xs hover:bg-[#0F172A]/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1.5">
                  Select Date & Time (Local Time) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDatetime}
                  onChange={(e) => setScheduleDatetime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] dark:bg-[#0D1829] rounded-xl border border-[#0F172A]/6 dark:border-[#FAF8F5]/6 text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                Saving will set <code>orders.scheduled_at</code> and update order status to confirmed.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingSchedule ? "Saving..." : "Save Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Calendar OAuth Configuration Info Drawer */}
      {isGCalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-3">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                  Integration Center
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">
                  Google Calendar Integration
                </h3>
              </div>
              <button
                onClick={() => setIsGCalModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 flex items-center justify-center text-xs hover:bg-[#0F172A]/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl">
                <p className="font-bold mb-1">Status: OAuth Credentials Required</p>
                <p>
                  To sync consultation bookings directly to your personal Google Calendar account, Google OAuth 2.0 API credentials must be configured in your environment.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[#0F172A] dark:text-[#FAF8F5]">
                  Required Environment Variables:
                </p>
                <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 font-mono text-[11px] space-y-1 text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                  <p>GOOGLE_CALENDAR_CLIENT_ID</p>
                  <p>GOOGLE_CALENDAR_CLIENT_SECRET</p>
                  <p>GOOGLE_CALENDAR_REDIRECT_URI</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-700 dark:text-emerald-400">
                <p className="font-bold mb-0.5">Local Scheduling Fully Active</p>
                <p className="text-[11px]">
                  While Google Calendar is disconnected, the AstroKaur internal calendar is 100% operational. All appointment dates and times are stored and linked with client orders.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                onClick={() => setIsGCalModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
