"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CELESTIAL_AVATARS } from "@/lib/avatar/celestialAvatars";
import { validateImageFile, convertImageToWebP, uploadUserAvatar } from "@/lib/avatar/imageToWebP";

export default function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    signIn,
    updateProfile,
  } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("moon");
  const [customAvatarBlob, setCustomAvatarBlob] = useState<Blob | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP Signup States
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [signupOtp, setSignupOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Forgot Password States (Sign-in tab)
  const [signInView, setSignInView] = useState<"signin" | "forgot_request" | "forgot_otp">("signin");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);

  // Optional Astrological Birth Details
  const [showBirthDetails, setShowBirthDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [timeUncertain, setTimeUncertain] = useState(false);

  // Timer countdown effect for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!authModalOpen) return null;

  const handleCustomPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid image file.");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    setConvertingPhoto(true);
    try {
      const { blob, previewUrl } = await convertImageToWebP(file, 512, 0.85);
      setCustomAvatarBlob(blob);
      setCustomAvatarPreview(previewUrl);
      setSelectedAvatar(""); // Custom photo overrides preset
    } catch (err: unknown) {
      console.error("Photo processing failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setConvertingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await signIn(email.trim(), password);
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setEmail("");
      setPassword("");
    }
  };

  // Step 1: Send OTP for Signup
  const handleRequestSignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!displayName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          purpose: "signup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to send verification code.");
      }

      setSignupStep("otp");
      setResendCooldown(60);
      setSignupOtp("");
      setSuccessMsg(`We sent a 6-digit code to ${email.trim()}.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP and create confirmed account
  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanOtp = signupOtp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    setSubmitting(true);
    try {
      const birthPayload =
        showBirthDetails && (dateOfBirth || placeOfBirth || timeOfBirth || timeUncertain)
          ? {
              dateOfBirth: dateOfBirth || undefined,
              timeOfBirth: timeUncertain ? undefined : timeOfBirth || undefined,
              placeOfBirth: placeOfBirth.trim() || undefined,
              timeUncertain,
            }
          : undefined;

      const res = await fetch("/api/auth/otp/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
          password,
          displayName: displayName.trim(),
          avatarSeed: customAvatarBlob ? null : selectedAvatar || null,
          birthDetails: birthPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      // Automatically sign in the verified user
      const loginRes = await signIn(email.trim(), password);
      if (loginRes.error) {
        throw new Error(loginRes.error);
      }

      // Upload custom avatar if one was provided
      if (customAvatarBlob) {
        try {
          const supabase = createClient();
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            const uploadRes = await uploadUserAvatar(supabase, userData.user.id, customAvatarBlob);
            if (uploadRes.publicUrl) {
              await updateProfile({ avatarUrl: uploadRes.publicUrl, avatarSeed: null });
            }
          }
        } catch (uploadErr) {
          console.error("Non-blocking avatar upload error:", uploadErr);
        }
      }

      setSuccessMsg("Account verified and created successfully!");
      // Reset state
      setEmail("");
      setPassword("");
      setDisplayName("");
      setSignupOtp("");
      setSignupStep("details");
      setCustomAvatarBlob(null);
      setCustomAvatarPreview(null);
      setSelectedAvatar("moon");
      closeAuthModal();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to verify account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendSignUpOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setErrorMsg(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to resend code.");
      setResendCooldown(60);
      setSuccessMsg("A new verification code has been sent to your email.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Forgot Password: Request OTP
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = forgotEmail.trim() || email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, purpose: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send reset code.");

      setForgotEmail(targetEmail);
      setSignInView("forgot_otp");
      setResendCooldown(60);
      setSuccessMsg(`If an account exists, a verification code was sent to ${targetEmail}.`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send reset code.");
    } finally {
      setSubmitting(false);
    }
  };

  // Forgot Password: Confirm OTP & Set New Password
  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!/^\d{6}$/.test(forgotOtp.trim())) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    if (forgotNewPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg("Passwords do not match. Please verify both fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
          purpose: "reset_password",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

      setSuccessMsg("Password reset successfully! You can now sign in with your new password.");
      setEmail(forgotEmail);
      setSignInView("signin");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeAuthModal(); }}>
      <DialogContent aria-describedby={undefined} className="block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-[#E5B842]/35 bg-[#FAF8F5] p-6 text-[#0F172A] dark:bg-[#0D1829] dark:text-[#FAF8F5] sm:max-w-md sm:p-8">
        {/* Brand Emblem Logo Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative w-14 h-14 mb-2">
            <Image
              src="/astro-emblem-light.png?v=6"
              alt="TheAstroKaur"
              fill
              unoptimized
              className="object-contain dark:hidden"
            />
            <Image
              src="/astro-emblem-dark.png?v=6"
              alt="TheAstroKaur"
              fill
              unoptimized
              className="object-contain hidden dark:block"
            />
          </div>
          <DialogTitle className="font-serif text-2xl font-medium tracking-tight">
            TheAstroKaur
          </DialogTitle>
          <p className="text-xs text-[#6B3448] dark:text-[#E5B842] tracking-[0.2em] uppercase font-semibold mt-0.5">
            Written In The Stars
          </p>
        </div>

        <Tabs
          value={authModalTab}
          onValueChange={(value) => {
            setAuthModalTab(value as "signin" | "signup");
            setErrorMsg(null);
            setSuccessMsg(null);
            setSignupStep("details");
            setSignInView("signin");
          }}
        >
          <TabsList className="mb-5 grid h-10 w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground">
              Create Account
            </TabsTrigger>
          </TabsList>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs">
              {successMsg}
            </div>
          )}

          {/* ── TAB: SIGN IN ── */}
          <TabsContent value="signin">
            {signInView === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="auth-field-1" className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Email Address
                  </label>
                  <Input
                    id="auth-field-1"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                      Password
                    </label>
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setForgotEmail(email);
                        setSignInView("forgot_request");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="h-auto p-0 text-[11px] font-medium text-[#6B3448] dark:text-[#E5B842] hover:underline"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] hover:opacity-95 text-[#0F172A] font-bold text-xs tracking-widest uppercase shadow-[0_4px_16px_rgba(229,184,66,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}

            {signInView === "forgot_request" && (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="text-center pb-1">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">Reset Password</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We&apos;ll email you a 6-digit code to verify your identity.
                  </p>
                </div>

                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Email Address
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-full bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] font-bold text-xs tracking-widest uppercase shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Sending Code…" : "Send Verification Code"}
                </Button>

                <div className="text-center pt-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSignInView("signin");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Back to Sign In
                  </Button>
                </div>
              </form>
            )}

            {signInView === "forgot_otp" && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-3.5 animate-in fade-in duration-200">
                <div className="text-center pb-1">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">Set New Password</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the code sent to <strong className="text-foreground">{forgotEmail}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    6-Digit Verification Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center font-mono text-xl tracking-[0.3em] font-bold py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#E5B842]/50 focus:border-[#E5B842]"
                  />
                  <div className="flex justify-end mt-1">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      disabled={resendCooldown > 0 || resending}
                      onClick={handleRequestForgotOtp}
                      className="h-auto p-0 text-[11px] text-[#6B3448] dark:text-[#E5B842] disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showForgotNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs font-medium text-muted-foreground"
                    >
                      {showForgotNewPassword ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    type={showForgotNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-full bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] font-bold text-xs tracking-widest uppercase shadow-md transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Resetting Password…" : "Reset Password"}
                </Button>

                <div className="text-center pt-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSignInView("signin");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Cancel & Back to Sign In
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          {/* ── TAB: CREATE ACCOUNT ── */}
          <TabsContent value="signup">
            {signupStep === "details" && (
              <form onSubmit={handleRequestSignUpOtp} className="space-y-3.5">
                <div>
                  <label htmlFor="auth-field-2" className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="auth-field-2"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="auth-field-3" className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="auth-field-3"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] text-sm focus:outline-none transition-all ${
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                        ? "border border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                        : email.length > 2
                        ? "border border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                        : "border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842]"
                    }`}
                  />
                  {email.length > 2 && (
                    <div className="flex items-center gap-1.5 text-[11px] mt-1 transition-all">
                      {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>✓ Valid email address</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Please enter a full email (e.g. name@domain.com)</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPassword(val);
                        if (val.length >= 6 && errorMsg === "Password must be at least 6 characters long.") {
                          setErrorMsg(null);
                        }
                      }}
                      placeholder="At least 6 characters"
                      className={`w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] text-sm focus:outline-none transition-all pr-12 ${
                        password.length >= 6
                          ? "border border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                          : password.length > 0
                          ? "border border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                          : "border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842]"
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </div>

                  {password.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] mt-1.5 transition-all">
                      {password.length >= 6 ? (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <span>✓ Ready! Minimum 6 characters satisfied</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{6 - password.length} more character{6 - password.length > 1 ? "s" : ""} required (min 6)</span>
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                        password.length >= 6
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                          : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50 bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5"
                      }`}>
                        {password.length}/6
                      </span>
                    </div>
                  )}
                </div>

                {/* Profile Avatar selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                      Profile Avatar <span className="text-[10px] lowercase text-[#E5B842]">(optional)</span>
                    </label>
                    {(customAvatarPreview || selectedAvatar) && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedAvatar("");
                          setCustomAvatarBlob(null);
                          setCustomAvatarPreview(null);
                        }}
                        className="h-auto p-0 text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        Skip
                      </Button>
                    )}
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleCustomPhotoSelect}
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    {customAvatarPreview ? (
                      <div className="relative w-11 h-9 rounded-xl overflow-hidden border-2 border-[#E5B842] shrink-0 group">
                        <img src={customAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCustomAvatarBlob(null);
                            setCustomAvatarPreview(null);
                          }}
                          className="absolute inset-0 h-full w-full rounded-none bg-black/60 text-white text-[10px] p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove uploaded photo"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={convertingPhoto}
                        className="h-8 px-2.5 rounded-xl border-dashed border-[#E5B842]/60 hover:border-[#E5B842] hover:bg-[#E5B842]/10 text-xs font-semibold gap-1 shrink-0"
                        title="Upload your own photo (PNG, JPG)"
                      >
                        <span>📷</span>
                        <span className="text-[11px]">{convertingPhoto ? "…" : "+ Photo"}</span>
                      </Button>
                    )}

                    <div className="flex items-center gap-1 flex-1">
                      {CELESTIAL_AVATARS.map((av) => {
                        const active = !customAvatarPreview && selectedAvatar === av.id;
                        return (
                          <Button
                            key={av.id}
                            type="button"
                            variant={active ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setCustomAvatarBlob(null);
                              setCustomAvatarPreview(null);
                              setSelectedAvatar(av.id);
                            }}
                            className={`flex-1 h-8 py-0 rounded-xl ${
                              active ? "border-[#E5B842] bg-[#E5B842]/20 scale-105" : ""
                            }`}
                            title={`${av.label} — ${av.meaning}`}
                          >
                            <span>{av.symbol}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Birth Details Accordion */}
                <div className="pt-1 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBirthDetails(!showBirthDetails)}
                    className="w-full flex items-center justify-between py-2 h-auto text-xs font-medium text-[#6B3448] dark:text-[#E5B842] hover:bg-transparent"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✦</span>
                      <span className="font-semibold tracking-wide">
                        Birth Chart Details (Optional)
                      </span>
                    </span>
                    <span className="text-xs transition-transform duration-200">
                      {showBirthDetails ? "▲" : "▼"}
                    </span>
                  </Button>

                  {showBirthDetails && (
                    <div className="p-3.5 rounded-2xl bg-[#0F172A]/[0.03] dark:bg-[#FAF8F5]/[0.03] border border-[#E5B842]/20 space-y-3 mt-1 animate-in fade-in duration-200">
                      <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 leading-relaxed font-light">
                        Used to calculate your Vedic rising sign & planetary placements for consultations.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="auth-field-4" className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                            Date of Birth
                          </label>
                          <Input
                            id="auth-field-4"
                            type="date"
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                          />
                        </div>

                        <div>
                          <label htmlFor="auth-field-5" className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                            Time of Birth
                          </label>
                          <Input
                            id="auth-field-5"
                            type="time"
                            disabled={timeUncertain}
                            value={timeOfBirth}
                            onChange={(e) => setTimeOfBirth(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842] disabled:opacity-40"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="auth-field-6" className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                          Place of Birth
                        </label>
                        <Input
                          id="auth-field-6"
                          type="text"
                          value={placeOfBirth}
                          onChange={(e) => setPlaceOfBirth(e.target.value)}
                          placeholder="e.g. New Delhi, India or Berlin, Germany"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                        />
                      </div>

                      <label className="flex items-center gap-2 text-[11px] text-[#0F172A]/70 dark:text-[#FAF8F5]/70 cursor-pointer pt-0.5">
                        <Checkbox
                          checked={timeUncertain}
                          onCheckedChange={(checked) => setTimeUncertain(checked === true)}
                        />
                        <span>I don&apos;t know my exact birth time</span>
                      </label>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] hover:opacity-95 text-[#0F172A] font-bold text-xs tracking-widest uppercase shadow-[0_4px_16px_rgba(229,184,66,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? "Sending Code…" : "Continue with Email Verification"}
                </Button>
              </form>
            )}

            {signupStep === "otp" && (
              <form onSubmit={handleVerifySignUpOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="text-center pb-1">
                  <div className="w-10 h-10 rounded-full bg-[#E5B842]/15 text-[#E5B842] flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                    ✉
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    Verify Your Email
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    We sent a 6-digit verification code to<br />
                    <strong className="text-foreground">{email}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 text-center">
                    Enter Verification Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                    value={signupOtp}
                    onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-2.5 rounded-xl bg-white dark:bg-[#131F33] border-2 border-[#E5B842]/60 focus:border-[#E5B842]"
                  />
                  <div className="flex items-center justify-between text-xs mt-2 px-1">
                    <span className="text-muted-foreground text-[11px]">Valid for 10 minutes</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      disabled={resendCooldown > 0 || resending}
                      onClick={handleResendSignUpOtp}
                      className="h-auto p-0 text-[11px] text-[#6B3448] dark:text-[#E5B842] disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || signupOtp.trim().length !== 6}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] hover:opacity-95 text-[#0F172A] font-bold text-xs tracking-widest uppercase shadow-[0_4px_16px_rgba(229,184,66,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Verifying & Creating Account…" : "Verify & Create Account"}
                </Button>

                <div className="text-center pt-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setSignupStep("details");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Edit signup details / email
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Note */}
        <p className="mt-4 text-center text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
          By signing in, you agree to our{" "}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#6B3448] dark:hover:text-[#E5B842] transition-colors"
          >
            Terms of Service
          </a>{" "}
          &amp;{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#6B3448] dark:hover:text-[#E5B842] transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
