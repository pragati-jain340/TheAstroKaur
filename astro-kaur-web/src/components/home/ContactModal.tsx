"use client";
import { NativeSelect } from "@/components/ui/native-select";

import React, { useState, useRef } from "react";
import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
  const { contactModalOpen } = useAuth();
  return contactModalOpen ? <ContactForm /> : null;
}

function ContactForm() {
  const { closeContactModal, contactBookingId, user, profile } = useAuth();

  const [formData, setFormData] = useState<ContactFormData>({
    name: contactBookingId ? profile?.display_name || "" : "",
    email: contactBookingId ? user?.email || "" : "",
    subject: contactBookingId ? "Booking Enquiry" : "Choosing a Reading",
    message: contactBookingId ? `Booking reference: ${contactBookingId}\n\nI need help with this booking: ` : "",
    _hp: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (form: HTMLFormElement): boolean => {
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
    const firstError = Object.keys(errs)[0];
    if (!firstError) return true;

    const field = form.elements.namedItem(firstError);
    if (field instanceof HTMLElement) field.focus();
    return false;
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!validate(e.currentTarget)) return;

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

      // The backend has accepted the enquiry.
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
      formRef.current?.scrollTo({ top: 0 });

      // Close modal smoothly after brief success display
      setTimeout(() => {
        closeContactModal();
      }, 2500);
    } catch (err: unknown) {
      setSubmitError(
        (err as Error).message ||
          "An unexpected error occurred. Please try again or reach out directly via email."
      );
      formRef.current?.scrollTo({ top: 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeContactModal(); }}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (window.matchMedia("(max-width: 639px)").matches) {
            if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
          } else {
            nameInputRef.current?.focus();
          }
        }}
        overlayClassName="max-sm:bg-black/25"
        className="flex max-h-[min(36rem,calc(100dvh-2rem))] max-w-[min(24rem,calc(100%-1.5rem))] flex-col gap-0 overflow-hidden rounded-2xl border-[#E5B842]/30 bg-[#FAF8F5] p-0 text-[#0F172A] dark:bg-[#0D1829] dark:text-[#FAF8F5] min-[320px]:max-sm:w-[calc(100%-3rem)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl max-sm:[&>[data-slot=dialog-close]]:top-1 max-sm:[&>[data-slot=dialog-close]]:right-1 max-sm:[&>[data-slot=dialog-close]]:grid max-sm:[&>[data-slot=dialog-close]]:size-11 max-sm:[&>[data-slot=dialog-close]]:place-items-center"
      >
        <form
          ref={formRef}
          id="contact-enquiry-form"
          onSubmit={handleSubmit}
          noValidate
          className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pt-3.5 pb-1 sm:px-8 sm:pt-8"
        >
          <div className="mb-3 sm:mb-6">
            <div className="flex items-center gap-2.5 pr-8 sm:gap-3 sm:pr-0">
              <div aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#E5B842]/35 bg-[#E5B842]/15 text-[#805B11] dark:text-[#E5B842] sm:size-11">
                <MessageCircle className="size-4.5 sm:size-5" />
              </div>
              <DialogTitle className="font-serif text-[1.375rem] leading-tight font-normal tracking-tight text-[#0F172A] dark:text-[#FAF8F5] sm:text-3xl">
                Have a Question?
              </DialogTitle>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#0F172A]/75 dark:text-[#FAF8F5]/75 sm:text-sm">
              Whether you&apos;re unsure which reading to choose or simply need more information, feel free to reach out.
            </p>
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
          <div className="space-y-2.5 sm:space-y-5">
            {/* Honeypot field */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="modal-contact-hp">Website</label>
              <Input
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="modal-name"
                  className="mb-1 block text-[11px] font-semibold tracking-wider text-[#0F172A]/80 uppercase dark:text-[#CBD5E1] sm:mb-1.5"
                >
                  Full Name <span className="text-[#E5B842]">*</span>
                </label>
                <Input
                  ref={nameInputRef}
                  type="text"
                  id="modal-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  aria-invalid={!!errors.name}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/45 dark:placeholder:text-[#BCC4D0] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 max-sm:min-h-11 max-sm:py-2 ${
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
                  className="mb-1 block text-[11px] font-semibold tracking-wider text-[#0F172A]/80 uppercase dark:text-[#CBD5E1] sm:mb-1.5"
                >
                  Email Address <span className="text-[#E5B842]">*</span>
                </label>
                <Input
                  type="email"
                  id="modal-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  aria-invalid={!!errors.email}
                  className={`w-full text-sm px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/45 dark:placeholder:text-[#BCC4D0] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 max-sm:min-h-11 max-sm:py-2 ${
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
                className="mb-1 block text-[11px] font-semibold tracking-wider text-[#0F172A]/80 uppercase dark:text-[#CBD5E1] sm:mb-1.5"
              >
                Subject <span className="text-[#E5B842]">*</span>
              </label>
              <div className="relative">
                <NativeSelect
                  id="modal-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  aria-invalid={!!errors.subject}
                  className={`h-11 w-full pl-3.5 pr-9 py-0 text-base sm:text-sm rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 cursor-pointer ${
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
                </NativeSelect>
              </div>
              {errors.subject && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Message Textarea */}
            <div>
              <div className="mb-1 flex items-center justify-between sm:mb-1.5">
                <label
                  htmlFor="modal-message"
                  className="block text-[11px] font-semibold text-[#0F172A]/80 dark:text-[#CBD5E1] uppercase tracking-wider"
                >
                  Message <span className="text-[#E5B842]">*</span>
                </label>
                <span className="text-[11px] tabular-nums text-[#0F172A]/60 dark:text-[#BCC4D0]">
                  {formData.message.length} / 5000
                </span>
              </div>
              <Textarea
                id="modal-message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help?"
                required
                aria-invalid={!!errors.message}
                className={`w-full text-base sm:text-sm p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#1E293B]/70 border transition-all text-[#0F172A] dark:text-white placeholder:text-[#0F172A]/45 dark:placeholder:text-[#BCC4D0] resize-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/35 max-sm:h-22 max-sm:field-sizing-fixed ${
                  errors.message
                    ? "border-rose-500/60 focus:border-rose-500"
                    : "border-[#0F172A]/15 dark:border-white/10 hover:border-[#0F172A]/30 dark:hover:border-white/20 focus:border-[#E5B842]"
                }`}
              />
              {errors.message && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.message}</p>
              )}
            </div>
          </div>
        </form>

        {/* Action Buttons & Privacy Reassurance */}
        <div className="mx-4 mt-1 flex shrink-0 flex-col items-center justify-between gap-1.5 border-t border-[#0F172A]/8 pt-2 pb-3 dark:border-white/10 sm:mx-8 sm:mt-5 sm:flex-row sm:gap-3 sm:pb-8">
          <Button
            type="submit"
            form="contact-enquiry-form"
            disabled={isSubmitting}
            className="h-11 w-full cursor-pointer rounded-full border border-[#a7721b]/20 bg-[#E5B842] bg-linear-to-r from-[#efc96c] to-[#e5b842] px-6 text-xs font-semibold text-[#211807] shadow-sm transition-colors hover:from-[#f5d583] hover:to-[#ebbf4f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <span aria-hidden="true" className="animate-spin text-sm motion-reduce:animate-none">✦</span>
                <span>Sending message…</span>
              </>
            ) : (
              <>
                <span>Send Message</span>
                <ArrowRight aria-hidden="true" className="size-4" />
              </>
            )}
          </Button>

          <p className="flex items-center gap-1.5 text-[11px] text-[#0F172A]/65 dark:text-[#BCC4D0]">
            <LockKeyhole aria-hidden="true" className="size-3 shrink-0 text-[#805B11] dark:text-[#E5B842]" />
            Used to respond to your enquiry.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
