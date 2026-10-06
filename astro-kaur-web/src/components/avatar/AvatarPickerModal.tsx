"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";
import { CELESTIAL_AVATARS } from "@/lib/avatar/celestialAvatars";
import {
  validateImageFile,
  convertImageToWebP,
  uploadUserAvatar,
  deleteUserAvatar,
} from "@/lib/avatar/imageToWebP";

export interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  currentAvatarSeed?: string | null;
  userName?: string | null;
  userId: string;
  onSaved: (result: { avatarUrl: string | null; avatarSeed: string | null }) => void;
}

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  currentAvatarSeed,
  userName,
  userId,
  onSaved,
}: AvatarPickerModalProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pending selection state
  const [selectedSeed, setSelectedSeed] = useState<string | null>(currentAvatarSeed || null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentAvatarUrl || null);
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);

  const [processingImage, setProcessingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSeed(currentAvatarSeed || null);
      setSelectedUrl(currentAvatarUrl || null);
      setSelectedBlob(null);
      setErrorMessage(null);
    }
  }, [isOpen, currentAvatarSeed, currentAvatarUrl]);

  if (!isOpen) return null;

  // Handle local file selection -> convert to WebP
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setProcessingImage(true);
    try {
      // In-browser center crop & WebP compression (512x512)
      const { blob, previewUrl } = await convertImageToWebP(file, 512, 0.85);

      // Set custom photo active
      setSelectedBlob(blob);
      setSelectedUrl(previewUrl);
      setSelectedSeed(null); // Clear preset avatar when custom is selected
    } catch (err: unknown) {
      console.error("WebP conversion failed:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to process photo. Please try a different image."
      );
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle selecting a predefined celestial avatar
  const handleSelectCelestial = (id: string) => {
    setErrorMessage(null);
    setSelectedSeed(id);
    setSelectedUrl(null); // Clear custom photo when celestial preset is picked
    setSelectedBlob(null);
  };

  // Handle removing all avatars -> initials fallback
  const handleRemoveAvatar = () => {
    setErrorMessage(null);
    setSelectedSeed(null);
    setSelectedUrl(null);
    setSelectedBlob(null);
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      let finalAvatarUrl: string | null = null;
      let finalAvatarSeed: string | null = null;

      // Case 1: User chose a custom photo
      if (selectedBlob) {
        // Upload new WebP file to storage: custom_profle_photo/{userId}/avatar.webp
        const uploadRes = await uploadUserAvatar(supabase, userId, selectedBlob);
        if (uploadRes.error) {
          throw new Error(uploadRes.error);
        }
        finalAvatarUrl = uploadRes.publicUrl;
        finalAvatarSeed = null;
      } else if (selectedUrl && !selectedSeed) {
        // Existing custom photo retained without change
        finalAvatarUrl = selectedUrl;
        finalAvatarSeed = null;
      } else if (selectedSeed) {
        // Case 2: User chose a celestial preset
        finalAvatarSeed = selectedSeed;
        finalAvatarUrl = null;

        // If user previously had a custom photo in storage, clean it up
        if (currentAvatarUrl) {
          await deleteUserAvatar(supabase, userId).catch(() => {});
        }
      } else {
        // Case 3: User chose to remove avatar completely
        finalAvatarUrl = null;
        finalAvatarSeed = null;

        if (currentAvatarUrl) {
          await deleteUserAvatar(supabase, userId).catch(() => {});
        }
      }

      // Update customer_profiles table
      const { error: dbError } = await supabase
        .from("customer_profiles")
        .update({
          avatar_url: finalAvatarUrl,
          avatar_seed: finalAvatarSeed,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userId);

      if (dbError) {
        throw new Error(dbError.message || "Failed to update profile avatar in database.");
      }

      onSaved({ avatarUrl: finalAvatarUrl, avatarSeed: finalAvatarSeed });
      onClose();
    } catch (err: unknown) {
      console.error("Save avatar error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save avatar. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const hasAnyAvatar = Boolean(selectedUrl || selectedSeed);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/35 shadow-2xl p-6 sm:p-7 text-[#0F172A] dark:text-[#FAF8F5] space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
              PROFILE PHOTO
            </span>
            <h3 className="font-serif text-lg font-semibold tracking-tight text-[#0F172A] dark:text-[#FAF8F5]">
              Choose Your Avatar
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 hover:bg-[#0F172A]/10 text-xs flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Live Avatar Preview */}
        <div className="flex flex-col items-center justify-center space-y-2 py-1">
          <div className="relative p-1 rounded-full border-2 border-[#E5B842]/40 shadow-sm">
            <AvatarDisplay
              avatarUrl={selectedUrl}
              avatarSeed={selectedSeed}
              name={userName}
              size="xl"
              showBorder={false}
            />
            {processingImage && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white text-xs">
                <span className="animate-spin">↻</span>
              </div>
            )}
          </div>
          <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-medium">
            {selectedUrl
              ? "Custom Photo (WebP)"
              : selectedSeed
              ? `Celestial Preset (${selectedSeed.toUpperCase()})`
              : "Initials Fallback"}
          </p>
        </div>

        {/* Option 1: Custom Photo Upload */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            Upload Your Own Photo
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processingImage || saving}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#E5B842]/60 hover:border-[#E5B842] hover:bg-[#E5B842]/5 transition-all text-xs font-semibold text-[#0F172A] dark:text-[#FAF8F5] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>📷</span>
            <span>{processingImage ? "Converting to WebP..." : "Upload Photo (PNG, JPG, JPEG)"}</span>
          </button>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 text-center">
            Automatically center-cropped & converted to lightweight WebP in browser.
          </p>
        </div>

        {/* Option 2: Predefined Celestial Avatars */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            Or Choose A Celestial Avatar
          </p>

          <div className="grid grid-cols-6 gap-2">
            {CELESTIAL_AVATARS.map((av) => {
              const active = selectedSeed?.toLowerCase() === av.id.toLowerCase();
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => handleSelectCelestial(av.id)}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    active
                      ? "border-[#E5B842] bg-[#E5B842]/20 scale-105 shadow-xs"
                      : "border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5"
                  }`}
                  title={`${av.label} — ${av.meaning}`}
                >
                  <span className="text-xl leading-none">{av.symbol}</span>
                  <span className="text-[9px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 truncate max-w-[48px]">
                    {av.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8 flex items-center justify-between gap-3">
          {hasAnyAvatar ? (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={saving}
              className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-500/10 border border-red-500/20 transition-colors cursor-pointer"
            >
              Remove Avatar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:bg-[#0F172A]/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || processingImage}
              className="px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Avatar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
