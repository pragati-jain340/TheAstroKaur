"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  _hp: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

const SUBJECT_OPTIONS = [
  "Choosing a Reading",
  "Reading & Pricing",
  "Booking Enquiry",
  "General Question",
  "Other",
];

export default function ContactModal() {
  const { contactModalOpen, closeContactModal } = useAuth();

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "Choosing a Reading",
    message: "",
    _hp: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (contactModalOpen) {
      document.body.style.overflow = "hidden";
      setSubmitError(null);
      setSubmitSuccess(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 200);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [contactModalOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && contactModalOpen) {
        closeContactModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contactModalOpen, closeContactModal]);

  if (!contactModalOpen) return null;

  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = "Please enter your full name (at least 2 characters).";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = "Email address is required.";
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address (e.g. name@example.com).";
    }

    if (!formData.subject || !SUBJECT_OPTIONS.includes(formData.subject)) {
      errs.subject = "Please select a subject topic.";
    }

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      errs.message = "Please enter your message (at least 5 characters).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to submit your enquiry at this time. Please check your connection or email us directly."
        );
      }

      // Success confirmed by backend and Resend
      setSubmitSuccess(
        result.message ||
          "Thank you for reaching out! Your enquiry has been submitted successfully. We'll get back to you as soon as possible."
      );

      // Reset form fields
      setFormData({
        name: "",
        email: "",
        subject: "Choosing a Reading",
        message: "",
        _hp: "",
      });
      setErrors({});

      // Close modal smoothly after brief success display
      setTimeout(() => {
        closeContactModal();
      }, 2500);
    } catch (err: unknown) {
      setSubmitError(
        (err as Error).message ||
          "An unexpected error occurred. Please try again or reach out directly via email."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeContactModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div
        className="relative w-full max-w-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-[#0F172A] dark:text-[#FAF8F5] max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeContactModal}
          aria-label="Close contact enquiry modal"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 hover:bg-[#E5B842]/15 text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Modal Header matching Screenshot 2 ── */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/25 text-[#6B3448] dark:text-[#E5B842] text-[11px] font-semibold tracking-widest uppercase mb-3">
            <span className="text-[#E5B842] text-xs">✦</span>
            WE&apos;RE HERE TO HELP
          </div>

          <h2
            id="contact-modal-title"
            className="font-serif text-2xl sm:text-3xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight"
          >
            Have a Question?
          </h2>

          <p className="text-xs sm:text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-1 font-light leading-relaxed">
            Whether you&apos;re unsure which reading to choose or simply need more information, feel free to reach out.
          </p>
        </div>

        {/* ── Direct Email Banner ── */}
        <div className="mb-6 p-4 rounded-2xl bg-white/80 dark:bg-[#162133] border border-[#E5B842]/25 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 text-[#E5B842] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white leading-tight">Email</p>
              <p className="text-[11px] text-[#0F172A]/60 dark:text-[#94A3B8] font-light">
                For questions about readings or bookings.
              </p>
            </div>
          </div>

          <a
            href="mailto:pragatiijain841@gmail.com"
            className="text-xs break-all font-semibold text-[#E5B842] hover:text-[#d8ab34] transition-colors"
          >
            pragatiijain841@gmail.com ↗
          </a>
        </div>

        {/* ── Success Banner ── */}
        {submitSuccess && (
          <div
            role="status"
            className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in"
          >
            <span className="text-emerald-600 dark:text-emerald-400 text-base leading-none mt-0.5">✓</span>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">Enquiry Received</p>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-0.5 leading-relaxed">
                {submitSuccess}
              </p>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {submitError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 animate-in fade-in"
          >
            <span className="text-rose-600 dark:text-rose-400 text-base leading-none mt-0.5">⚠</span>
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-200">Unable to Send</p>
              <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-0.5 leading-relaxed">
                {submitError}
              </p>
            </div>
          </div>
        )}

        {/* ── Contact Form ── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-5">
          {/* Honeypot field */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="modal-contact-hp">Website</label>
            <input
              type="text"
              id="modal-contact-hp"
              name="_hp"
              value={formData._hp}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Full Name & Email Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label
                htmlFor="modal-name"
                className="block text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#CBD5E1] uppercase tracking-wider mb-1.5"
              >
                Full Name <span className="text-[#E5B842]">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                id="modal-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Pragati Jain"
                required
                aria-invalid={!!errors.name}
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/35 dark:placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 ${
                  errors.name
                    ? "border-rose-500/60 focus:border-rose-500"
                    : "border-[#0F172A]/15 dark:border-white/10 hover:border-[#0F172A]/30 dark:hover:border-white/20 focus:border-[#E5B842]"
                }`}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="modal-email"
                className="block text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#CBD5E1] uppercase tracking-wider mb-1.5"
              >
                Email Address <span className="text-[#E5B842]">*</span>
              </label>
              <input
                type="email"
                id="modal-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                aria-invalid={!!errors.email}
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/35 dark:placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 ${
                  errors.email
                    ? "border-rose-500/60 focus:border-rose-500"
                    : "border-[#0F172A]/15 dark:border-white/10 hover:border-[#0F172A]/30 dark:hover:border-white/20 focus:border-[#E5B842]"
                }`}
              />
              {errors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Subject Dropdown */}
          <div>
            <label
              htmlFor="modal-subject"
              className="block text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#CBD5E1] uppercase tracking-wider mb-1.5"
            >
              Subject <span className="text-[#E5B842]">*</span>
            </label>
            <div className="relative">
              <select
                id="modal-subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 cursor-pointer ${
                  errors.subject
                    ? "border-rose-500/60 focus:border-rose-500"
                    : "border-[#0F172A]/15 dark:border-white/10 hover:border-[#0F172A]/30 dark:hover:border-white/20 focus:border-[#E5B842]"
                }`}
              >
                {SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-white">
                    {opt}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#0F172A]/40 dark:text-[#94A3B8]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="modal-message"
                className="block text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#CBD5E1] uppercase tracking-wider"
              >
                Message <span className="text-[#E5B842]">*</span>
              </label>
              <span className="text-[10px] text-[#0F172A]/40 dark:text-[#64748B]">
                {formData.message.length} / 5000
              </span>
            </div>
            <textarea
              id="modal-message"
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what guidance you're seeking, questions about birth times, or anything else you'd like to ask..."
              required
              className={`w-full text-sm p-3.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/35 dark:placeholder:text-[#64748B] resize-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 ${
                errors.message
                  ? "border-rose-500/60 focus:border-rose-500"
                  : "border-[#0F172A]/15 dark:border-white/10 hover:border-[#0F172A]/30 dark:hover:border-white/20 focus:border-[#E5B842]"
              }`}
            />
            {errors.message && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.message}</p>
            )}
          </div>

          {/* Action Buttons & Privacy Reassurance */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#0F172A]/8 dark:border-white/10 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">✦</span>
                  <span>SENDING MESSAGE…</span>
                </>
              ) : (
                <>
                  <span>SEND MESSAGE</span>
                  <span className="text-sm">→</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#64748B] text-center sm:text-right font-light">
              🔒 Confidential · Will never be shared.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
