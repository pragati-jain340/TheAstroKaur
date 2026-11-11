"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export interface ReviewModalOrder {
  id: string;
  service_title: string;
  review_rating?: number | null;
  review_text?: string | null;
  review_created_at?: string | null;
  created_at?: string | null;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ReviewModalOrder;
  initialMode?: "write" | "edit" | "view";
  onSuccess?: (updated: { rating: number; content: string; review_created_at: string }) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good & Clear",
  4: "Very Insightful",
  5: "Truly Transformative & Deeply Accurate",
};

export default function ReviewModal(props: ReviewModalProps) {
  return props.isOpen ? <ReviewDialog key={`${props.order.id}:${props.initialMode}`} {...props} /> : null;
}

function ReviewDialog({
  onClose,
  order,
  initialMode = "write",
  onSuccess,
}: ReviewModalProps) {
  const [mode, setMode] = useState<"write" | "edit" | "view">(initialMode);
  const [rating, setRating] = useState<number>(order.review_rating || 5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>(order.review_text || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg("Please select a star rating between 1 and 5.");
      return;
    }

    if (!content.trim()) {
      setErrorMsg("Please provide written feedback for your reading.");
      return;
    }

    setSubmitting(true);

    try {
      // Get auth token if present
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({
          order_id: order.id,
          rating,
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save review. Please try again.");
      }

      setSuccessMsg(data.message || "Thank you! Your review has been saved.");

      if (onSuccess) {
        onSuccess({
          rating,
          content: content.trim(),
          review_created_at: data.review?.review_created_at || new Date().toISOString(),
        });
      }

      // Close modal smoothly after brief success feedback
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-describedby={undefined} className="block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-[#E5B842]/30 bg-[#FAF8F5] p-6 text-[#0F172A] dark:bg-[#0D1829] dark:text-[#FAF8F5] sm:max-w-lg sm:p-8">
        {/* ── Mode A: VIEW ONLY ── */}
        {mode === "view" ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#E5B842] text-sm">✦</span>
              <span className="text-[11px] font-bold tracking-widest text-[#E5B842] uppercase">
                YOUR REFLECTION
              </span>
            </div>

            <DialogTitle className="font-serif text-2xl font-normal text-[#0F172A] dark:text-[#FAF8F5]">
              Your Reading Review
            </DialogTitle>

            {/* Reading badge */}
            <div className="mt-3">
              <Badge variant="outline" className="border-[#E5B842]/30 bg-[#E5B842]/10 text-[#0F172A]/80 dark:text-[#FAF8F5]/90">
                {order.service_title}
              </Badge>
            </div>

            {/* Stars */}
            <div className="mt-6 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= (order.review_rating ?? 0)
                      ? "text-[#E5B842]"
                      : "text-[#0F172A]/15 dark:text-[#FAF8F5]/15"
                  }`}
                >
                  ★
                </span>
              ))}
              <span className="text-xs font-semibold ml-2 text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                ({order.review_rating}/5 · {RATING_LABELS[order.review_rating || 5] || "Rated"})
              </span>
            </div>

            {/* Content */}
            <div className="mt-5 p-5 rounded-2xl bg-[#0F172A]/[0.03] dark:bg-[#FAF8F5]/[0.03] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <p className="text-sm font-light text-[#0F172A]/90 dark:text-[#FAF8F5]/90 leading-relaxed italic">
                &ldquo;{order.review_text || "No feedback text provided."}&rdquo;
              </p>
            </div>

            {order.review_created_at && (
              <p className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-3">
                Submitted on{" "}
                {new Date(order.review_created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-2 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
              >
                <span>✎ Edit Review</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Mode B: WRITE or EDIT ── */
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#E5B842] text-sm">✦</span>
              <span className="text-[11px] font-bold tracking-widest text-[#E5B842] uppercase">
                {mode === "edit" ? "UPDATE REVIEW" : "SHARE YOUR EXPERIENCE"}
              </span>
            </div>

            <DialogTitle className="font-serif text-2xl font-normal text-[#0F172A] dark:text-[#FAF8F5]">
              {mode === "edit" ? "Edit Your Review" : "Leave a Review"}
            </DialogTitle>

            <p className="text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-1">
              For <span className="font-semibold text-[#0F172A] dark:text-[#FAF8F5]">{order.service_title}</span>
            </p>

            {/* Success message banner */}
            {successMsg && (
              <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <span className="text-base">✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error message banner */}
            {errorMsg && (
              <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <span className="text-base">⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-[#0F172A]/80 dark:text-[#FAF8F5]/80 mb-2">
                Overall Rating <span className="text-[#E5B842]">*</span>
              </label>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className="h-9 w-9 p-0 text-3xl hover:bg-transparent hover:scale-125 active:scale-95 transition-transform"
                  >
                    <span
                      className={`transition-colors duration-150 ${
                        activeRating >= star
                          ? "text-[#E5B842] drop-shadow-[0_2px_8px_rgba(229,184,66,0.35)]"
                          : "text-[#0F172A]/20 dark:text-[#FAF8F5]/20 hover:text-[#E5B842]/50"
                      }`}
                    >
                      ★
                    </span>
                  </Button>
                ))}
              </div>

              <p className="text-[11px] font-medium text-[#E5B842] mt-1.5 min-h-[18px]">
                {RATING_LABELS[activeRating] || "Select star rating"}
              </p>
            </div>

            {/* Written Feedback Textarea */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="review-feedback"
                  className="text-xs font-semibold text-[#0F172A]/80 dark:text-[#FAF8F5]/80"
                >
                  Your Experience &amp; Reflection <span className="text-[#E5B842]">*</span>
                </label>
                <span className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                  {content.length} characters
                </span>
              </div>

              <Textarea
                id="review-feedback"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share how this reading resonated with you, the clarity or guidance you received, and any reflections that stood out..."
                rows={5}
                required
                className="w-full text-sm p-4 rounded-2xl bg-[#0F172A]/[0.03] dark:bg-[#FAF8F5]/[0.03] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/35 dark:placeholder:text-[#FAF8F5]/35 resize-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 focus:border-[#E5B842] transition-all"
              />
              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1.5 font-light">
                Your feedback helps guide other seekers on their astrological journey.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting || !!successMsg}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin text-sm">✦</span>
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "edit" ? "Save Changes" : "Submit Review"}</span>
                    <span className="text-sm">→</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
