"use client";

import React, { useState, useRef } from "react";

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

export default function ContactSection() {
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

  const formRef = useRef<HTMLFormElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Smoothly scroll to the form and focus the name input
  const handleScrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 500);
    }
  };

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
      errs.subject = "Please select a valid subject topic.";
    }

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      errs.message = "Please enter a message (at least 5 characters).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear inline error on change
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

      // Reset form fields while preserving state
      setFormData({
        name: "",
        email: "",
        subject: "Choosing a Reading",
        message: "",
        _hp: "",
      });
      setErrors({});
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
    <section
      id="contact"
      className="scroll-mt-24 sm:scroll-mt-28 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-16 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* ── 1. Introductory Card matching Screenshot 2 ── */}
        <div className="w-full rounded-3xl bg-[#FAF8F5] dark:bg-[#1E2536] border border-[#E5B842]/25 p-8 sm:p-12 md:p-14 text-center shadow-[0_12px_40px_rgba(229,184,66,0.06)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.4)] relative overflow-hidden">
          {/* Subtle Star Sparkle Deco */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/25 text-[#6B3448] dark:text-[#E5B842] text-[11px] font-semibold tracking-widest uppercase mb-4">
            <span className="text-[#E5B842] text-xs">✦</span>
            WE&apos;RE HERE TO HELP
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight mb-4">
            Have a Question?
          </h2>

          <p className="text-sm sm:text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-lg mx-auto mb-8 font-light leading-relaxed">
            Whether you&apos;re unsure which reading to choose or simply need more information, feel free to reach out.
          </p>

          <button
            type="button"
            onClick={handleScrollToForm}
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>SEND AN ENQUIRY</span>
            <span className="text-sm">→</span>
          </button>
        </div>

        {/* ── 2. Contact Information & Enquiry Form Container ── */}
        <div className="w-full rounded-3xl bg-[#0F172A] text-[#FAF8F5] border border-white/10 dark:border-[#E5B842]/20 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Top Email Info Banner matching Screenshot 2 */}
          <div className="p-6 sm:p-8 border-b border-white/10 bg-[#162133] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Gold Envelope Icon */}
              <div className="w-11 h-11 rounded-2xl bg-[#E5B842]/10 border border-[#E5B842]/30 text-[#E5B842] flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-serif text-lg sm:text-xl font-normal text-white">
                  Email
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] font-light mt-0.5">
                  For questions about readings, bookings, or general enquiries.
                </p>
              </div>
            </div>

            <div className="sm:text-right pl-15 sm:pl-0">
              <a
                href="mailto:pragatiijain841@gmail.com"
                className="text-xs sm:text-sm font-semibold text-[#E5B842] hover:text-[#d8ab34] transition-colors inline-flex items-center gap-1.5"
              >
                <span>pragatiijain841@gmail.com</span>
                <span>↗</span>
              </a>
              <p className="text-[11px] text-[#64748B] mt-0.5 font-light">
                Average reply within 24–48 hours
              </p>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-10 lg:p-12">
            {/* Success Banner */}
            {submitSuccess && (
              <div
                role="status"
                className="mb-8 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3.5 animate-in fade-in"
              >
                <span className="text-emerald-400 text-lg leading-none mt-0.5">✓</span>
                <div>
                  <p className="font-medium text-emerald-200">Enquiry Received</p>
                  <p className="text-xs text-emerald-300/90 mt-1 leading-relaxed">
                    {submitSuccess}
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {submitError && (
              <div
                role="alert"
                className="mb-8 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3.5 animate-in fade-in"
              >
                <span className="text-rose-400 text-lg leading-none mt-0.5">⚠</span>
                <div>
                  <p className="font-medium text-rose-200">Unable to Send</p>
                  <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-6"
            >
              {/* Anti-spam honeypot field */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-hp">Website</label>
                <input
                  type="text"
                  id="contact-hp"
                  name="_hp"
                  value={formData._hp}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Name & Email Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-2"
                  >
                    Full Name <span className="text-[#E5B842]">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="contact-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Pragati Jain"
                    required
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={`w-full text-sm px-4 py-3.5 rounded-2xl bg-[#1E293B]/70 border transition-all text-white placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 ${
                      errors.name
                        ? "border-rose-500/60 focus:border-rose-500"
                        : "border-white/10 hover:border-white/20 focus:border-[#E5B842]"
                    }`}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <span>•</span> {errors.name}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-2"
                  >
                    Email Address <span className="text-[#E5B842]">*</span>
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={`w-full text-sm px-4 py-3.5 rounded-2xl bg-[#1E293B]/70 border transition-all text-white placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 ${
                      errors.email
                        ? "border-rose-500/60 focus:border-rose-500"
                        : "border-white/10 hover:border-white/20 focus:border-[#E5B842]"
                    }`}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                      <span>•</span> {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Subject Dropdown */}
              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider mb-2"
                >
                  Subject <span className="text-[#E5B842]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    aria-invalid={!!errors.subject}
                    aria-describedby={errors.subject ? "subject-error" : undefined}
                    className={`w-full text-sm px-4 py-3.5 rounded-2xl bg-[#1E293B]/70 border transition-all text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 cursor-pointer ${
                      errors.subject
                        ? "border-rose-500/60 focus:border-rose-500"
                        : "border-white/10 hover:border-white/20 focus:border-[#E5B842]"
                    }`}
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0F172A] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                  {/* Select arrow indicator */}
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
                {errors.subject && (
                  <p id="subject-error" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <span>•</span> {errors.subject}
                  </p>
                )}
              </div>

              {/* Message Multiline Text Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-[#CBD5E1] uppercase tracking-wider"
                  >
                    Message <span className="text-[#E5B842]">*</span>
                  </label>
                  <span className="text-[11px] text-[#64748B]">
                    {formData.message.length} / 5000
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us what guidance you're seeking, questions about birth times, or anything else you'd like to ask..."
                  required
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "message-error" : undefined}
                  className={`w-full text-sm p-4 rounded-2xl bg-[#1E293B]/70 border transition-all text-white placeholder:text-[#64748B] resize-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/50 ${
                    errors.message
                      ? "border-rose-500/60 focus:border-rose-500"
                      : "border-white/10 hover:border-white/20 focus:border-[#E5B842]"
                  }`}
                />
                {errors.message && (
                  <p id="message-error" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <span>•</span> {errors.message}
                  </p>
                )}
              </div>

              {/* Submit Button & Privacy Reassurance */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_4px_18px_rgba(229,184,66,0.3)] hover:shadow-[0_6px_24px_rgba(229,184,66,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

                <p className="text-[11px] text-[#64748B] text-center sm:text-right font-light">
                  🔒 Your information is confidential and will never be shared.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
