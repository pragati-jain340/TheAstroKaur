"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";
import BookingControls from "@/components/services/BookingControls";
import ReviewModal from "@/components/reviews/ReviewModal";
import { isUpcomingVoiceCall } from "@/lib/booking/display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface OrderDetail {
  id: string;
  service_title: string;
  format: "text" | "voice_call";
  price_eur: number;
  status: "pending" | "pending_payment" | "awaiting_schedule" | "confirmed" | "completed" | "cancelled" | "expired" | "payment_review";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  scheduled_at: string | null;
  stripe_receipt_url: string | null;
  client_name: string | null;
  client_dob: string | null;
  client_tob: string | null;
  client_pob: string | null;
  client_time_uncertain: boolean;
  requires_partner: boolean;
  partner_name: string | null;
  partner_dob: string | null;
  partner_tob: string | null;
  partner_pob: string | null;
  partner_time_uncertain: boolean;
  review_rating: number | null;
  review_text: string | null;
  review_created_at: string | null;
  created_at: string;
}

interface ReadingSnapshot {
  client_name?: string | null;
  client_date_of_birth?: string | null;
  client_time_of_birth?: string | null;
  client_place_of_birth?: string | null;
  client_time_uncertain?: boolean;
  partner_name?: string | null;
  partner_date_of_birth?: string | null;
  partner_time_of_birth?: string | null;
  partner_place_of_birth?: string | null;
  partner_time_uncertain?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBirthTime(t: string | null): string {
  if (!t) return "—";
  const parts = t.split(":");
  const hour = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatPrice(eur: number): string {
  return `€${Number(eur).toFixed(2)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">{label}</p>
      <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5] text-base">{value}</p>
    </div>
  );
}

function ReadingSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm">
      <CardHeader className="p-0 pb-6">
        <CardTitle className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-6">{children}</CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isUpcoming = status === "confirmed" || status === "pending";
  const isCompleted = status === "completed";
  return (
    <Badge
      variant={isCompleted ? "default" : isUpcoming ? "secondary" : "destructive"}
      className="text-[10px] font-bold tracking-widest uppercase"
    >
      {status}
    </Badge>
  );
}

function BirthDetailsCard({
  title,
  name,
  dob,
  tob,
  pob,
  uncertain,
}: {
  title: string;
  name?: string | null;
  dob: string | null;
  tob: string | null;
  pob: string | null;
  uncertain: boolean;
}) {
  return (
    <ReadingSectionCard title={title}>
      {name && (
        <div>
          <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Name</p>
          <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5] text-base">{name}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Row label="Date of Birth" value={formatDate(dob)} />
        <Row label="Time of Birth" value={formatBirthTime(tob)} />
      </div>
      <div>
        <Row label="Place of Birth" value={pob || "—"} />
      </div>
      <div className="pt-2 flex items-center gap-2 text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
        <span className="font-semibold text-[#E5B842]">{uncertain ? "☐" : "☑"}</span>
        <span>{uncertain ? "Birth time is approximate" : "Birth time is accurate"}</span>
      </div>
    </ReadingSectionCard>
  );
}

export default function ReadingDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [snapshot, setSnapshot] = useState<ReadingSnapshot | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalMode, setReviewModalMode] = useState<"write" | "edit">("write");
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }
    if (!user || !params?.id) return;

    (async () => {
      // 1. Fetch order details
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id as string)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (orderErr || !orderData) {
        setNotFound(true);
        setFetching(false);
        return;
      }

      setOrder(orderData as OrderDetail);

      // 2. Fetch snapshot from reading_details if available (EXCLUDING admin_notes!)
      const { data: readData } = await supabase
        .from("reading_details")
        .select(
          "client_name, client_date_of_birth, client_time_of_birth, client_time_uncertain, client_place_of_birth, partner_name, partner_date_of_birth, partner_time_of_birth, partner_time_uncertain, partner_place_of_birth"
        )
        .eq("order_id", params.id as string)
        .maybeSingle();

      if (readData) {
        setSnapshot(readData as ReadingSnapshot);
      }

      setFetching(false);
    })();
  }, [user, loading, params?.id]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-[#E5B842] text-3xl animate-pulse font-serif">✦</div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4 text-[#E5B842] font-serif">✦</p>
            <h2 className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              Reading not found
            </h2>
            <p className="text-sm text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-2">
              This reading could not be loaded or may belong to another account.
            </p>
            <Button
              onClick={() => router.push("/account?tab=readings")}
              className="mt-6 rounded-full px-6 py-2.5 text-xs font-semibold"
            >
              ← Back to My Readings
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isUpcoming = isUpcomingVoiceCall(order);
  const needsCallTime = order.format === "voice_call" && order.payment_status === "paid" && order.status === "awaiting_schedule";
  const isCompleted = order.status === "completed";
  const statusMessage = isCompleted
    ? order.format === "text" ? "Reading delivered" : `Completed · ${formatDate(order.scheduled_at || order.created_at)}`
    : order.format === "text" && order.payment_status === "paid" && !["cancelled", "expired"].includes(order.status)
      ? "The owner will contact you"
      : needsCallTime
        ? "Paid · choose a time"
        : isUpcoming
          ? `Upcoming · ${formatDate(order.scheduled_at)} · ${formatTime(order.scheduled_at)}`
          : order.format === "voice_call" && order.scheduled_at
            ? `Call · ${formatDate(order.scheduled_at)} · ${formatTime(order.scheduled_at)}`
            : order.status.replaceAll("_", " ");

  // Sourced birth details (prioritizing stable snapshot from reading_details, fallback to order)
  const clientName = snapshot?.client_name ?? order.client_name;
  const clientDob = snapshot?.client_date_of_birth ?? order.client_dob;
  const clientTob = snapshot?.client_time_of_birth ?? order.client_tob;
  const clientPob = snapshot?.client_place_of_birth ?? order.client_pob;
  const clientUncertain = snapshot?.client_time_uncertain ?? order.client_time_uncertain;

  const partnerName = snapshot?.partner_name ?? order.partner_name;
  const partnerDob = snapshot?.partner_date_of_birth ?? order.partner_dob;
  const partnerTob = snapshot?.partner_time_of_birth ?? order.partner_tob;
  const partnerPob = snapshot?.partner_place_of_birth ?? order.partner_pob;
  const partnerUncertain = snapshot?.partner_time_uncertain ?? order.partner_time_uncertain;

  return (
    <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />
      <Navbar />

      <main className="flex-1 pt-10 sm:pt-28 pb-20 relative z-10">
        <div className="max-w-2xl mx-auto px-5">
          {/* Back Navigation & Home Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/account?tab=readings")}
              className="h-auto p-0 inline-flex items-center gap-2 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#E5B842] hover:bg-transparent group"
            >
              <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
              <span>Back to My Readings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="h-auto p-0 inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#E5B842] hover:bg-transparent"
            >
              <span>Home Page</span>
              <span>→</span>
            </Button>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide">
              {order.service_title}
            </h1>
            <p className="mt-2 text-sm text-[#46505F] dark:text-[#BCC4D0] font-medium">{statusMessage}</p>
          </div>

          <div className="space-y-8">
            {/* Section A — Reading / Booking Overview */}
            <ReadingSectionCard title="READING DETAILS">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Row label="Service" value={order.service_title} />
                <Row
                  label="Format"
                  value={order.format === "voice_call" ? "Voice Call" : "Text Reading"}
                />
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Status</p>
                  <StatusBadge status={order.status} />
                </div>
                {order.format === "voice_call" && order.scheduled_at && <Row label="Call time" value={`${formatDate(order.scheduled_at)} · ${formatTime(order.scheduled_at)}`} />}
                {order.format === "voice_call" && !order.scheduled_at && needsCallTime && <Row label="Next step" value="Choose a time" />}
                {order.format === "text" && order.payment_status === "paid" && !isCompleted && !["cancelled", "expired"].includes(order.status) && <Row label="Next step" value="The owner will contact you" />}
                <Row label="Price" value={formatPrice(order.price_eur)} />
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Payment</p>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm uppercase tracking-wider">
                    {order.payment_status === "paid" ? "Paid" : order.payment_status}
                  </span>
                </div>
              </div>
            </ReadingSectionCard>

            {/* Section B — Birth Details */}
            {(clientDob || clientName || clientPob) && (
              <BirthDetailsCard
                title="YOUR BIRTH DETAILS"
                name={clientName}
                dob={clientDob}
                tob={clientTob}
                pob={clientPob}
                uncertain={clientUncertain}
              />
            )}

            {/* Partner's Birth Details (Matchmaking / Relationship Readings) */}
            {(order.requires_partner || partnerName || partnerDob) && (
              <BirthDetailsCard
                title="PARTNER'S BIRTH DETAILS"
                name={partnerName}
                dob={partnerDob}
                tob={partnerTob}
                pob={partnerPob}
                uncertain={partnerUncertain}
              />
            )}

            <BookingControls id={order.id} />

            {/* Review Section for Completed Reading */}
            {isCompleted && (
              <ReadingSectionCard title="YOUR REVIEW">
                {order.review_rating ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 text-xl">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={
                              s <= (order.review_rating ?? 0)
                                ? "text-[#E5B842]"
                                : "text-[#0F172A]/15 dark:text-[#FAF8F5]/15"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReviewModalMode("edit");
                          setReviewModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E5B842] hover:text-[#d8ab34] cursor-pointer"
                      >
                        <span>✎ Edit Review</span>
                      </Button>
                    </div>
                    {order.review_text && (
                      <p className="text-sm italic text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-relaxed">
                        "{order.review_text}"
                      </p>
                    )}
                    <p className="text-xs text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                      Submitted · {formatDate(order.review_created_at)}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="font-serif text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                        Share your experience
                      </p>
                      <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                        How was your consultation? Your reflection helps others on their journey.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setReviewModalMode("write");
                        setReviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full text-xs font-semibold bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] shadow-sm cursor-pointer shrink-0"
                    >
                      <span>✦ Write a Review</span>
                    </Button>
                  </div>
                )}
              </ReadingSectionCard>
            )}

            {/* Quick Link to Receipt */}
            {order.payment_status === "paid" && (
              <div className="pt-2 flex justify-end">
                <Button
                  variant="link"
                  onClick={() => router.push("/account?tab=receipts")}
                  className="text-xs font-semibold cursor-pointer"
                >
                  View Payment Receipt →
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {order && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          order={order}
          initialMode={reviewModalMode}
          onSuccess={(updated) => {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    review_rating: updated.rating,
                    review_text: updated.content,
                    review_created_at: updated.review_created_at,
                  }
                : null
            );
          }}
        />
      )}

      <Footer />
    </div>
  );
}
