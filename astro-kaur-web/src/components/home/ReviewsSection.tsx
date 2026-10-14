"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ReviewItem {
  id: string;
  author_name: string;
  avatar_url?: string | null;
  rating: number;
  service_title: string;
  content: string;
  created_at: string;
  formatted_date: string;
}

const FALLBACK_REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    author_name: "Pragati J.",
    avatar_url: null,
    rating: 5,
    service_title: "Extensive Birth Chart Reading",
    formatted_date: "12 Aug 2024",
    content:
      "The extensive birth chart reading was deeply insightful and accurate. Astrologer Kaur identified life themes and transition periods that felt so true to my journey. The explanations felt thoughtful, grounded, and surprisingly personal. I left the session with profound clarity, reassurance, and peace of mind.",
    created_at: "2024-08-12T10:15:00Z",
  },
  {
    id: "rev-2",
    author_name: "Meera R.",
    avatar_url: null,
    rating: 5,
    service_title: "Relationship Compatibility",
    formatted_date: "3 Jul 2024",
    content:
      "I appreciated how clearly the strengths and challenges were explained. It gave me a fresh perspective on relationship patterns without making anything feel fixed or predetermined. It felt like a grounded, empowering conversation that answered all my recurring questions.",
    created_at: "2024-07-03T14:20:00Z",
  },
  {
    id: "rev-3",
    author_name: "Arjun K.",
    avatar_url: null,
    rating: 5,
    service_title: "Career & Money Reading",
    formatted_date: "21 Jun 2024",
    content:
      "The session gave me a clearer way to reflect on my choices and the direction I want to take next. It felt calm, insightful, and practical. Astrologer Kaur has a rare gift for combining analytical clarity with compassionate wisdom that genuinely empowers your decisions.",
    created_at: "2024-06-21T16:00:00Z",
  },
  {
    id: "rev-4",
    author_name: "Priya S.",
    avatar_url: null,
    rating: 5,
    service_title: "Future Partner Reading",
    formatted_date: "8 Jun 2024",
    content:
      "The reading was gentle yet illuminating. It gave me clarity on what I was feeling and how to approach partnerships with greater self-assurance. Everything about the timing windows and partner qualities felt remarkably accurate and deeply reassuring.",
    created_at: "2024-06-08T11:30:00Z",
  },
  {
    id: "rev-5",
    author_name: "Marcus V.",
    avatar_url: null,
    rating: 5,
    service_title: "Career Guidance (Voice Call)",
    formatted_date: "19 May 2024",
    content:
      "Astrologer Kaur has a remarkable ability to explain complex Vedic astrological charts in clear, relatable terms. Navigating a major career shift felt daunting, but the insights gave me the grounding I needed.",
    created_at: "2024-05-19T09:45:00Z",
  },
];

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

function truncateReview(text: string, maxLen = 140): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "...";
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<ReviewItem[]>(FALLBACK_REVIEWS);
  const [activeModalReview, setActiveModalReview] = useState<ReviewItem | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load live published reviews with real customer avatars
  useEffect(() => {
    async function fetchLiveReviews() {
      try {
        // 1. Fetch from /api/reviews (server route has access to safely join avatars across accounts)
        const res = await fetch("/api/reviews", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.reviews && Array.isArray(json.reviews) && json.reviews.length > 0) {
            setReviews(
              json.reviews.length >= 3
                ? json.reviews
                : [...json.reviews, ...FALLBACK_REVIEWS.slice(json.reviews.length)]
            );
            return;
          }
        }
      } catch (err) {
        console.warn("Could not fetch /api/reviews, falling back to client query:", err);
      }

      // Fallback direct client query
      try {
        const supabase = createClient();
        const { data: testimonials } = await supabase
          .from("testimonials")
          .select("id, author_name, rating, content, created_at, customer_id, order_id")
          .eq("is_published", true)
          .order("sort_order", { ascending: true });

        if (!testimonials || testimonials.length === 0) return;

        const liveList: ReviewItem[] = testimonials.map((t: any) => ({
          id: t.id,
          author_name: t.author_name || "Seeker",
          avatar_url: null,
          rating: t.rating || 5,
          service_title: "Vedic Reading",
          content: t.content,
          created_at: t.created_at,
          formatted_date: formatDate(t.created_at),
        }));

        setReviews(liveList.length >= 3 ? liveList : [...liveList, ...FALLBACK_REVIEWS.slice(liveList.length)]);
      } catch (err) {
        console.warn("Could not fetch live reviews, using fallback:", err);
      }
    }

    fetchLiveReviews();
  }, []);

  // Keyboard shortcut (Escape) to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveModalReview(null);
      }
    }
    if (activeModalReview) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeModalReview]);

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.querySelector<HTMLElement>(".shrink-0");
      const scrollAmount = card ? card.offsetWidth + 24 : 390;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });

      // Briefly pause continuous marquee so user can comfortably browse via arrows
      setIsPaused(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsPaused(false);
      }, 4000);
    }
  };

  return (
    <section
      id="reviews"
      className="scroll-mt-28 sm:scroll-mt-32 py-20 lg:py-28 px-6 lg:px-16 bg-transparent relative overflow-hidden"
    >
      {/* ── Seamless Marquee Styles for Continuous Horizontal Slide ── */}
      <style>{`
        @keyframes reviewsInfiniteMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .reviews-marquee-track {
          animation: reviewsInfiniteMarquee 45s linear infinite;
          will-change: transform;
        }

        @media (hover: hover) and (pointer: fine) {
          .reviews-marquee-track:hover {
            animation-play-state: paused;
          }
        }

        .reviews-marquee-track:focus-within {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* ── Section Header with Title & Arrow Controls ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 mb-3.5">
              <span className="text-[#E5B842] text-sm">✦</span>
              REVIEWS &amp; REFLECTIONS
            </div>

            {/* Main Heading */}
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight">
              A Closer Look at Their Experiences
            </h2>

            {/* Subtitle */}
            <p className="text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-3 font-light leading-relaxed">
              Read what people have to say about their readings and the perspectives they&apos;ve gained.
            </p>
          </div>

          {/* Carousel Arrow Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll reviews left"
              className="w-11 h-11 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white/70 dark:bg-[#1E293B]/70 hover:bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll reviews right"
              className="w-11 h-11 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white/70 dark:bg-[#1E293B]/70 hover:bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] flex items-center justify-center transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Continuous Horizontal Slider (Matches Readings Section) ── */}
        <div className="relative w-full overflow-hidden">
          {/* Edge fade masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-r from-[#FAF8F5] dark:from-[#0F172A] to-transparent opacity-85" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10 bg-gradient-to-l from-[#FAF8F5] dark:from-[#0F172A] to-transparent opacity-85" />

          {/* Scrollable Container with Smooth Marquee Track */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              className="flex w-max reviews-marquee-track"
              style={isPaused ? { animationPlayState: "paused" } : undefined}
            >
              {/* Primary Track */}
              <div className="flex shrink-0 gap-6 pr-6">
                {reviews.map((review) => (
                  <ReviewCard
                    key={`primary-${review.id}`}
                    review={review}
                    onOpenModal={() => setActiveModalReview(review)}
                  />
                ))}
              </div>

              {/* Duplicate Track for Seamless Infinite Loop */}
              <div className="flex shrink-0 gap-6 pr-6" aria-hidden="true">
                {reviews.map((review) => (
                  <ReviewCard
                    key={`duplicate-${review.id}`}
                    review={review}
                    onOpenModal={() => setActiveModalReview(review)}
                    isDuplicate
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Option A: Centered Modal Overlay (Read More) ── */}
      {activeModalReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalReview(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-review-author"
        >
          <div
            className="relative w-full max-w-lg bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/35 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.45)] text-[#0F172A] dark:text-[#FAF8F5] max-h-[90vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalReview(null)}
              aria-label="Close review modal"
              className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/15 bg-black/5 dark:bg-white/5 hover:bg-[#E5B842]/20 flex items-center justify-center text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Customer Header in Modal */}
            <div className="flex items-center gap-4 pr-10 mb-6">
              {/* Profile Image / Initial */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#E5B842]/40 bg-gradient-to-br from-[#E5B842]/20 via-[#6B3448]/15 to-transparent flex items-center justify-center shrink-0 shadow-sm">
                {activeModalReview.avatar_url ? (
                  <img
                    src={activeModalReview.avatar_url}
                    alt={activeModalReview.author_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-serif font-medium text-lg text-[#0F172A] dark:text-[#FAF8F5]">
                    {activeModalReview.author_name.charAt(0)}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 id="modal-review-author" className="font-serif text-lg font-medium">
                    {activeModalReview.author_name}
                  </h3>
                  <span className="text-[10px] tracking-wider uppercase font-semibold text-[#6B3448] dark:text-[#E5B842] px-2 py-0.5 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/25">
                    Verified Seeker
                  </span>
                </div>
                <p className="text-xs text-[#0F172A]/65 dark:text-[#FAF8F5]/65 mt-0.5 font-light">
                  {activeModalReview.service_title}
                </p>
                <p className="text-[11px] text-[#0F172A]/45 dark:text-[#FAF8F5]/45 mt-0.5">
                  {activeModalReview.formatted_date}
                </p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-1.5 text-[#E5B842] mb-5">
              {[...Array(activeModalReview.rating || 5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-[#0F172A]/10 dark:bg-[#FAF8F5]/10 mb-5 relative flex items-center justify-center">
              <span className="bg-[#FAF8F5] dark:bg-[#0D1829] px-2 text-[#E5B842] text-xs">✦</span>
            </div>

            {/* Complete Full Review Text */}
            <blockquote className="text-sm sm:text-[15px] text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light italic whitespace-pre-line">
              &ldquo;{activeModalReview.content}&rdquo;
            </blockquote>

            {/* Modal Bottom Close Action */}
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModalReview(null)}
                className="px-6 py-2.5 rounded-full border border-[#0F172A]/20 dark:border-[#FAF8F5]/20 hover:border-[#E5B842] text-xs font-semibold tracking-wider uppercase text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Individual Review Card Component for the Carousel
 */
function ReviewCard({
  review,
  onOpenModal,
  isDuplicate = false,
}: {
  review: ReviewItem;
  onOpenModal: () => void;
  isDuplicate?: boolean;
}) {
  return (
    <div className="w-[320px] sm:w-[360px] md:w-[380px] shrink-0 rounded-2xl sm:rounded-3xl bg-white/85 dark:bg-[#1E293B]/80 backdrop-blur-sm border border-[#E5B842]/20 p-6 sm:p-7 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:border-[#E5B842]/45 transition-all duration-300 group">
      <div>
        {/* Top Header: Avatar + Details on Left, Stars on Right */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Customer Profile Avatar */}
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#E5B842]/35 bg-gradient-to-br from-[#E5B842]/20 via-[#6B3448]/15 to-transparent flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
              {review.avatar_url ? (
                <img
                  src={review.avatar_url}
                  alt={review.author_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-serif font-medium text-base text-[#0F172A] dark:text-[#FAF8F5]">
                  {review.author_name.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <h4 className="font-serif text-sm sm:text-[15px] font-medium text-[#0F172A] dark:text-[#FAF8F5] leading-snug">
                {review.author_name}
              </h4>
              <p className="text-[11.5px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-light leading-snug mt-0.5">
                {review.service_title}
              </p>
              <p className="text-[10.5px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 leading-snug mt-0.5">
                {review.formatted_date}
              </p>
            </div>
          </div>

          {/* 5 Golden Stars */}
          <div className="flex items-center gap-0.5 text-[#E5B842] shrink-0 pt-1">
            {[...Array(review.rating || 5)].map((_, i) => (
              <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        {/* Truncated Review Snippet */}
        <p className="text-xs sm:text-[13px] text-[#0F172A]/75 dark:text-[#FAF8F5]/75 font-light leading-relaxed italic line-clamp-3">
          &ldquo;{truncateReview(review.content, 145)}&rdquo;
        </p>
      </div>

      {/* Read More Trigger Link */}
      <div className="pt-4 mt-2">
        <button
          type="button"
          tabIndex={isDuplicate ? -1 : 0}
          onClick={onOpenModal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B4254] dark:text-[#E5B842] hover:text-[#B8871E] transition-colors cursor-pointer group/link"
        >
          <span>Read more</span>
          <span className="transition-transform group-hover/link:translate-x-1">→</span>
        </button>
      </div>
    </div>
  );
}
