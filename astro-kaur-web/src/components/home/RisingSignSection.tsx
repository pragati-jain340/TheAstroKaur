"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ASCENDANT_READINGS } from "@/lib/astrology/ascendantData";
import { DEFAULT_FREE_READING_CONTENT, FreeReadingContent } from "@/lib/astrology/freeReadingContent";
import ZodiacIcon from "@/components/ui/ZodiacIcon";

interface PlaceSuggestion {
  id: number | string;
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryCode: string;
  timezone: number;
}

interface SavedReading {
  id: string;
  ascendant: string;
  readingContent: any;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  createdAt: string;
}

export default function RisingSignSection() {
  const { user, profile, isAdmin, loading: authLoading, openAuthModal } = useAuth();
  const supabase = createClient();

  // Eligibility & Claim Status
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState<string | null>(null);
  const [savedReading, setSavedReading] = useState<SavedReading | null>(null);
  const [adminTestingMode, setAdminTestingMode] = useState(false);
  const [pageContent, setPageContent] = useState<FreeReadingContent>(DEFAULT_FREE_READING_CONTENT);

  // Admin controls belong only to the signed-in user's own admin profile.
  const isEffectiveAdmin = Boolean(user && isAdmin && profile?.auth_user_id === user.id);

  useEffect(() => {
    fetch("/api/content")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.freeReading) {
          setPageContent({ ...DEFAULT_FREE_READING_CONTENT, ...data.freeReading });
        }
      })
      .catch(() => {});
  }, []);

  // Form Fields
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
    timezone: number;
  } | null>(null);
  const [confirmedDetails, setConfirmedDetails] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Place Autocomplete State
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const placeDropdownRef = useRef<HTMLDivElement>(null);

  // Submission Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill fields from customer profile
  useEffect(() => {
    if (profile) {
      if (profile.date_of_birth && !dob) setDob(profile.date_of_birth);
      if (profile.time_of_birth && !tob) {
        // Strip seconds if present for HH:MM input format
        const cleanTob = profile.time_of_birth.slice(0, 5);
        setTob(cleanTob);
      }
      if (profile.place_of_birth && !pob) {
        setPob(profile.place_of_birth);
      }
    }
  }, [profile]);

  // Check Eligibility when user state changes
  useEffect(() => {
    let isCancelled = false;

    async function checkUserEligibility() {
      if (!user) {
        setAlreadyClaimed(false);
        setSavedReading(null);
        return;
      }

      setCheckingEligibility(true);
      setErrorMsg(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) return;

        const res = await fetch("/api/free-reading", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json();
          if (!isCancelled) {
            console.warn("Eligibility check response:", err);
          }
          return;
        }

        const data = await res.json();
        if (isCancelled) return;

        if (isEffectiveAdmin && data.isAdmin) {
          // Admin has unlimited testing access
          setAlreadyClaimed(false);
          if (data.lastReading) {
            setSavedReading(data.lastReading);
          }
        } else if (data.alreadyClaimed && data.reading) {
          setAlreadyClaimed(true);
          setSavedReading(data.reading);
          setEligibilityMessage(data.message);
        } else {
          setAlreadyClaimed(false);
          setSavedReading(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Eligibility check error:", err);
        }
      } finally {
        if (!isCancelled) {
          setCheckingEligibility(false);
        }
      }
    }

    if (!authLoading) {
      checkUserEligibility();
    }

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading, isEffectiveAdmin]);

  // Place Autocomplete Debounced Search
  useEffect(() => {
    if (!pob || pob.trim().length < 2 || selectedCoordinates) {
      setPlaceSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPlace(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(pob.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setPlaceSuggestions(data.places || []);
          setShowPlaceDropdown(true);
        }
      } catch (err) {
        console.warn("Geocode search error:", err);
      } finally {
        setSearchingPlace(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pob, selectedCoordinates]);

  // Close place dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        placeDropdownRef.current &&
        !placeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPlaceDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setPob(place.displayName);
    setSelectedCoordinates({
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    });
    setShowPlaceDropdown(false);
    setPlaceSuggestions([]);
  };

  const handlePlaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPob(e.target.value);
    setSelectedCoordinates(null); // Reset coordinates when user types
  };

  // Submission Handler
  const handleSubmitCalculation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      openAuthModal("signin");
      return;
    }

    if (!dob) {
      setErrorMsg("Please enter your date of birth.");
      return;
    }

    // Validate past date
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
      setErrorMsg("Please enter a valid past birth date.");
      return;
    }

    if (!tob) {
      setErrorMsg(
        "Exact time of birth (hours and minutes) is required for accurate Vedic Ascendant calculation."
      );
      return;
    }

    if (!pob.trim()) {
      setErrorMsg("Please enter your birthplace city and country.");
      return;
    }

    if (!confirmedDetails) {
      setErrorMsg("Please confirm that your birth details are accurate before continuing.");
      return;
    }

    setSubmitting(true);

    try {
      // If user typed birthplace without clicking dropdown suggestion, resolve coordinates first
      let coords = selectedCoordinates;
      if (!coords) {
        const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(pob.trim())}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.places && geoData.places.length > 0) {
            const first = geoData.places[0];
            coords = {
              latitude: first.latitude,
              longitude: first.longitude,
              timezone: first.timezone,
            };
            setSelectedCoordinates(coords);
          }
        }
      }

      if (!coords) {
        setErrorMsg(
          "Could not accurately locate the coordinates for this birthplace. Please pick from the city dropdown suggestions."
        );
        setSubmitting(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setErrorMsg("Session expired. Please sign in again.");
        openAuthModal("signin");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/free-reading", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date_of_birth: dob,
          time_of_birth: tob,
          place_of_birth: pob.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          timezone: coords.timezone,
          update_profile: saveToProfile,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to calculate your Vedic reading. Please try again.");
        return;
      }

      if (data.reading) {
        setSavedReading(data.reading);
        if (isEffectiveAdmin) {
          setAdminTestingMode(false);
          setAlreadyClaimed(false);
        } else {
          setAlreadyClaimed(true);
        }
        if (data.message) {
          setEligibilityMessage(data.message);
        }
      }
    } catch (err: any) {
      console.error("Free reading calculation error:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="free-reading"
      className="scroll-mt-28 sm:scroll-mt-32 py-16 lg:py-24 px-4 sm:px-6 lg:px-16 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header Badge & Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight">
            {pageContent.section_heading}
          </h2>
          <p className="text-sm sm:text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-3 font-light leading-relaxed">
            {pageContent.section_intro}
          </p>
          {!isEffectiveAdmin && (
            <div className="inline-block mt-3 text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
              {pageContent.eligibility_note}
            </div>
          )}
        </div>

        {/* Main Card Container */}
        <div className="bg-white/90 dark:bg-[#1E293B]/85 backdrop-blur-md border border-[#E5B842]/35 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-all duration-300">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#E5B842]/15 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-[#6B3448]/10 dark:from-[#E5B842]/10 to-transparent rounded-tr-full pointer-events-none" />

          {/* ──────────────── CASE 1: USER IS NOT LOGGED IN ──────────────── */}
          {!user && (
            <div className="text-center py-8 sm:py-12 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#E5B842]/20 border border-[#E5B842]/50 flex items-center justify-center text-3xl shadow-sm">
                🔒
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-serif text-2xl sm:text-3xl text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                  {pageContent.sign_in_heading}
                </h3>
                <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-2 font-light leading-relaxed">
                  {pageContent.sign_in_description}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer"
                >
                  Sign In to Continue ✦
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("signup")}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-[#0F172A]/20 dark:border-[#FAF8F5]/20 text-xs font-semibold tracking-wider uppercase text-[#0F172A] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Create New Account
                </button>
              </div>
            </div>
          )}

          {/* ───────────── LOADING STATE WHILE CHECKING ELIGIBILITY ───────────── */}
          {user && checkingEligibility && (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-2 border-[#E5B842] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 uppercase tracking-widest font-medium">
                Checking reading eligibility...
              </p>
            </div>
          )}

          {/* ── CASE 2: READING VIEW (SAVED FOR CLIENT, OR LATEST FOR ADMIN) ── */}
          {user && !checkingEligibility && savedReading && (alreadyClaimed || (isEffectiveAdmin && !adminTestingMode)) && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Notice Banner */}
              {isEffectiveAdmin ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👑</span>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-300">
                        Admin Test Verification Mode
                      </p>
                      <p className="text-[11px] text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                        Client limits are bypassed. You can recalculate as many times as needed to verify charts.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminTestingMode(true)}
                    className="shrink-0 px-4 py-2 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-xs transition-all cursor-pointer"
                  >
                    ✦ Calculate Another Chart
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#E5B842]/10 border border-[#E5B842]/30 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/90 flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✦</span>
                    <span>
                      {eligibilityMessage ||
                        "You have already used your free reading. You can revisit your previous reading below."}
                    </span>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Claimed
                  </span>
                </div>
              )}

              {/* Ascendant Result Header Banner with Zodiac Icon */}
              {(() => {
                const content = savedReading.readingContent || {};
                const staticDoc = ASCENDANT_READINGS[savedReading.ascendant] || {};
                const glyph = content.glyph || staticDoc.glyph || "✦";
                const sanskritName = content.sanskritName || staticDoc.sanskritName || "";
                const ruler = content.ruler || staticDoc.ruler || "";
                const element = content.element || staticDoc.element || "";
                const quality = content.quality || staticDoc.quality || "";

                const coreEnergy = content.coreEnergy || staticDoc.coreEnergy;
                const careerSuccess = content.careerSuccess || staticDoc.careerSuccess;
                const loveRelationships = content.loveRelationships || staticDoc.loveRelationships;
                const moneySecurity = content.moneySecurity || staticDoc.moneySecurity;
                const emotionalWorld = content.emotionalWorld || staticDoc.emotionalWorld;
                const hiddenPotential = content.hiddenPotential || staticDoc.hiddenPotential;
                const firstLayerBullets = content.firstLayerBullets || staticDoc.firstLayerBullets;

                return (
                  <>
                    <div className="text-center py-8 px-4 rounded-3xl bg-gradient-to-b from-[#E5B842]/20 via-[#E5B842]/5 to-transparent border border-[#E5B842]/35 relative overflow-hidden">
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E5B842]/25 to-[#6B3448]/15 border border-[#E5B842]/40 flex items-center justify-center p-3.5 shadow-lg shadow-[#E5B842]/10">
                          <ZodiacIcon sign={savedReading.ascendant} size={52} glyph={glyph} />
                        </div>
                      </div>
                      <h3 className="font-serif text-3xl sm:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight">
                        {savedReading.ascendant} Ascendant
                      </h3>
                      <p className="text-sm font-medium text-[#E5B842] mt-1 font-serif">
                        {pageContent.result_label}
                      </p>
                      {sanskritName && (
                        <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-1 font-serif italic">
                          {sanskritName} Lagna · Ruled by {ruler}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[11px]">
                        {element && (
                          <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-[#0F172A]/70 border border-[#0F172A]/10 dark:border-white/10 text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                            Element: <strong>{element}</strong>
                          </span>
                        )}
                        {quality && (
                          <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-[#0F172A]/70 border border-[#0F172A]/10 dark:border-white/10 text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                            Modality: <strong>{quality}</strong>
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-full bg-[#E5B842]/15 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/30 font-medium">
                          Lahiri Ayanamsha
                        </span>
                      </div>
                    </div>

                    {/* Rich Reading Sections */}
                    <div className="space-y-6 text-sm text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                      {/* 1. Core Energy */}
                      {coreEnergy && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{coreEnergy.emoji || "🔥"}</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {coreEnergy.title || "Your Core Energy"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                            {coreEnergy.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                          {coreEnergy.challenge && (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs sm:text-sm text-[#0F172A]/90 dark:text-[#FAF8F5]/90 whitespace-pre-line leading-relaxed">
                              {coreEnergy.challenge}
                            </div>
                          )}
                          {coreEnergy.quote && (
                            <div className="p-4 rounded-2xl bg-[#E5B842]/10 border-l-4 border-[#E5B842] text-xs sm:text-sm italic font-serif text-[#6B3448] dark:text-[#E5B842]">
                              {coreEnergy.quote}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Career & Success */}
                      {careerSuccess && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">💼</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {careerSuccess.title || "Career & Success"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                            {careerSuccess.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                          {careerSuccess.lessonQuote && (
                            <div className="p-4 rounded-2xl bg-[#E5B842]/10 border-l-4 border-[#E5B842] text-xs sm:text-sm italic font-serif text-[#6B3448] dark:text-[#E5B842] whitespace-pre-line">
                              {careerSuccess.lessonQuote}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Love & Relationships */}
                      {loveRelationships && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">❤️</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {loveRelationships.title || "Love & Relationships"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                            {loveRelationships.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                          {loveRelationships.values && loveRelationships.values.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm text-center text-rose-800 dark:text-rose-200 font-medium">
                              {loveRelationships.values.join("  •  ")}
                            </div>
                          )}
                          {loveRelationships.questionOrLesson && (
                            <div className="p-4 rounded-2xl bg-[#E5B842]/10 border-l-4 border-[#E5B842] text-xs sm:text-sm font-serif italic text-[#6B3448] dark:text-[#E5B842] whitespace-pre-line leading-relaxed">
                              {loveRelationships.questionOrLesson}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 4. Money & Security */}
                      {moneySecurity && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">💰</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {moneySecurity.title || "Money & Security"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                            {moneySecurity.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                          {moneySecurity.quote && (
                            <div className="p-4 rounded-2xl bg-[#E5B842]/10 border-l-4 border-[#E5B842] text-xs sm:text-sm italic font-serif text-[#6B3448] dark:text-[#E5B842]">
                              {moneySecurity.quote}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 5. Your Emotional World */}
                      {emotionalWorld && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">🌙</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {emotionalWorld.title || "Your Emotional World"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light">
                            {emotionalWorld.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. Your Hidden Potential */}
                      {hiddenPotential && (
                        <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-white/10 shadow-sm space-y-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{hiddenPotential.emoji || "✨"}</span>
                            <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              {hiddenPotential.title || "Your Hidden Potential"}
                            </h4>
                          </div>
                          <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light whitespace-pre-line">
                            {hiddenPotential.paragraphs.map((p: string, idx: number) => (
                              <p key={idx}>{p}</p>
                            ))}
                          </div>
                          {hiddenPotential.buildSteps && hiddenPotential.buildSteps.length > 0 && (
                            <div className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-[#0F172A]/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                              {hiddenPotential.buildSteps.map((step: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/70 dark:bg-black/40">
                                  <span className="text-[#0F172A]/80 dark:text-[#FAF8F5]/80 capitalize font-medium">{step.label}</span>
                                  <span className="text-[#6B3448] dark:text-[#E5B842] font-semibold">→ {step.pacing}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {hiddenPotential.conclusion && hiddenPotential.conclusion.length > 0 && (
                            <div className="space-y-3 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85 leading-relaxed font-light whitespace-pre-line">
                              {hiddenPotential.conclusion.map((paragraph: string, idx: number) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 7. This Is Only Your First Layer */}
                      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#6B3448]/10 via-[#E5B842]/10 to-transparent border border-[#E5B842]/30 space-y-5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">🔮</span>
                          <h4 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                            This Is Only Your First Layer
                          </h4>
                        </div>
                        <p className="text-sm sm:text-base text-[#0F172A]/80 dark:text-[#FAF8F5]/80 font-light">
                          Your {savedReading.ascendant} Ascendant gives us the beginning of your story.
                        </p>
                        <p className="text-xs sm:text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 font-medium">
                          Your complete birth chart can reveal much more about:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {(firstLayerBullets || []).map((b: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-[#0F172A]/70 border border-[#0F172A]/10 dark:border-white/10 text-xs sm:text-sm text-[#0F172A]/85 dark:text-[#FAF8F5]/85"
                            >
                              <span className="text-base shrink-0 mt-0.5">{b.emoji}</span>
                              <span className="leading-snug">{b.text}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 italic pt-2 font-serif">
                          And this is why two people with the same {savedReading.ascendant} Ascendant can live completely different stories.
                        </p>
                      </div>
                    </div>

                    {/* Birth Details Snapshot */}
                    <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[#0F172A]/10 dark:border-white/10 text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 flex flex-wrap justify-between items-center gap-2">
                      <span>Calculated for: <strong>{savedReading.placeOfBirth}</strong></span>
                      <span>Date: <strong>{savedReading.dateOfBirth}</strong></span>
                      <span>Time: <strong>{savedReading.timeOfBirth}</strong></span>
                    </div>

                    {/* 🌟 Want to Discover YOUR Story? + Book Link / Button */}
                    <div className="text-center p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#E5B842]/25 via-[#E5B842]/10 to-transparent border-2 border-[#E5B842]/50 shadow-xl space-y-6">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#E5B842]/25 border border-[#E5B842]/60 flex items-center justify-center text-2xl shadow-sm">
                        🌟
                      </div>
                      <div className="max-w-xl mx-auto space-y-3">
                        <h3 className="font-serif text-2xl sm:text-3xl text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                          {pageContent.cta_heading}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#0F172A]/80 dark:text-[#FAF8F5]/80 font-light leading-relaxed">
                          {pageContent.cta_description}
                        </p>
                        <p className="text-sm font-semibold text-[#6B3448] dark:text-[#E5B842]">
                          ✨ {pageContent.cta_accent}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center justify-center">
                        <Link
                          href="/#readings"
                          className="w-full sm:w-auto px-10 py-4 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-bold text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-[#E5B842]/25 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>{pageContent.cta_primary_label} ✦</span>
                          <span className="text-base">→</span>
                        </Link>
                      </div>

                      <div className="pt-3 border-t border-[#0F172A]/10 dark:border-white/10 max-w-md mx-auto">
                        <p className="font-serif italic text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                          &ldquo;{pageContent.cta_quote}&rdquo;
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ────── CASE 3: BIRTH DETAILS FORM (ELIGIBLE CLIENT OR ADMIN TEST MODE) ────── */}
          {user &&
            !checkingEligibility &&
            (!alreadyClaimed || isEffectiveAdmin) &&
            (!savedReading || (isEffectiveAdmin && adminTestingMode)) && (
              <form onSubmit={handleSubmitCalculation} className="space-y-6">
                {/* Admin Mode Form Header */}
                {isEffectiveAdmin && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">👑</span>
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                          Admin Unlimited Testing Active
                        </p>
                        <p className="text-[11px] text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                          Enter any birth details below to test and verify Vedic Ascendant readings without client limits.
                        </p>
                      </div>
                    </div>
                    {savedReading && (
                      <button
                        type="button"
                        onClick={() => setAdminTestingMode(false)}
                        className="shrink-0 text-xs font-semibold text-[#6B3448] dark:text-[#E5B842] hover:underline cursor-pointer"
                      >
                        ← View Last Calculated Reading
                      </button>
                    )}
                  </div>
                )}

                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Explanatory Notice */}
                <div className="p-4 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/85 flex items-start gap-2.5">
                  <span className="text-base mt-0.5">✨</span>
                  <span>
                    In Vedic astrology, the Ascendant changes signs approximately every 2 hours. An accurate birth time and birthplace are crucial to calculate your exact Rising Sign.
                  </span>
                </div>

              {/* Date of Birth & Time of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Date of Birth (DOB) *
                  </label>
                  <input
                    id="birth-date-input"
                    type="date"
                    required
                    value={dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                  <span className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1 block">
                    Day / Month / Year
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Exact Time of Birth *
                  </label>
                  <input
                    id="birth-time-input"
                    type="time"
                    required
                    value={tob}
                    onChange={(e) => setTob(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                  <span className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1 block">
                    Exact local birth time (e.g. 14:30)
                  </span>
                </div>
              </div>

              {/* Place of Birth (with Geocoding Search) */}
              <div className="relative" ref={placeDropdownRef}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Place of Birth (City & Country) *
                </label>
                <div className="relative">
                  <input
                    id="birth-place-input"
                    type="text"
                    required
                    placeholder="Search city, state, or country (e.g. Berlin, New Delhi, London)..."
                    value={pob}
                    onChange={handlePlaceInputChange}
                    onFocus={() => {
                      if (placeSuggestions.length > 0) setShowPlaceDropdown(true);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                  {searchingPlace && (
                    <div className="absolute right-3.5 top-3.5 w-4 h-4 border-2 border-[#E5B842] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showPlaceDropdown && placeSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5B842]/40 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {placeSuggestions.map((place) => (
                      <button
                        type="button"
                        key={place.id}
                        onClick={() => handleSelectPlace(place)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#E5B842]/15 text-[#0F172A] dark:text-[#FAF8F5] transition-colors flex items-center justify-between border-b border-black/5 dark:border-white/5 last:border-0 cursor-pointer"
                      >
                        <span className="truncate pr-2">{place.displayName}</span>
                        <span className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 shrink-0">
                          UTC {place.timezone >= 0 ? `+${place.timezone}` : place.timezone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCoordinates ? (
                  <div className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>✓ Location &amp; Timezone verified</span>
                    <span>
                      ({selectedCoordinates.latitude.toFixed(2)}°, {selectedCoordinates.longitude.toFixed(2)}°, UTC {selectedCoordinates.timezone >= 0 ? `+${selectedCoordinates.timezone}` : selectedCoordinates.timezone})
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1 block">
                    Type and select your birthplace to automatically determine coordinates and timezone.
                  </span>
                )}
              </div>

              {/* Checkbox Confirmation & Profile Sync */}
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[#0F172A]/10 dark:border-white/10 space-y-3">
                <label htmlFor="confirm-birth-details" className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="confirm-birth-details"
                    type="checkbox"
                    required
                    checked={confirmedDetails}
                    onChange={(e) => setConfirmedDetails(e.target.checked)}
                    className="mt-0.5 rounded text-[#E5B842] focus:ring-[#E5B842] cursor-pointer"
                  />
                  <span className="text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80 leading-normal">
                    I confirm that the birth date, exact time, and birthplace entered above are accurate for this reading.
                  </span>
                </label>

                <label htmlFor="save-profile-details" className="flex items-start gap-3 cursor-pointer">
                  <input
                    id="save-profile-details"
                    type="checkbox"
                    checked={saveToProfile}
                    onChange={(e) => setSaveToProfile(e.target.checked)}
                    className="mt-0.5 rounded text-[#E5B842] focus:ring-[#E5B842] cursor-pointer"
                  />
                  <span className="text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-normal">
                    Save these birth details to my profile for future readings.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="calculate-reading-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-full bg-[#E5B842] hover:bg-[#d6a935] disabled:opacity-60 text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
                      <span>Calculating Vedic Ascendant...</span>
                    </>
                  ) : (
                    <span>
                      {isEffectiveAdmin
                        ? "Calculate Vedic Ascendant ✦"
                        : "Calculate My Vedic Ascendant & Reveal Reading ✦"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
