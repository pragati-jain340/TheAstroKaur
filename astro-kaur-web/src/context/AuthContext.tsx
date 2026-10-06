"use client";

import { uploadUserAvatar } from "@/lib/avatar/imageToWebP";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type CustomerProfile = Database["public"]["Tables"]["customer_profiles"]["Row"];

export interface BookingService {
  id: string;
  title: string;
  format: string;
  isCall: boolean;
  price: string;
  description?: string;
}

interface AuthContextType {
  user: User | null;
  profile: CustomerProfile | null;
  loading: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  authModalTab: "signin" | "signup";
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: "signin" | "signup") => void;
  openAuthModal: (tab?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  profileModalTab: "profile" | "orders" | "receipts" | "users" | "dashboard";
  setProfileModalTab: (tab: "profile" | "orders" | "receipts" | "users" | "dashboard") => void;
  openProfileModal: (tab?: "profile" | "orders" | "receipts" | "users" | "dashboard") => void;
  closeProfileModal: () => void;
  bookingModalOpen: boolean;
  selectedBookingService: BookingService | null;
  openBookingModal: (service?: BookingService) => void;
  closeBookingModal: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    avatarSeed?: string | null,
    birthDetails?: {
      dateOfBirth?: string;
      timeOfBirth?: string;
      placeOfBirth?: string;
      timeUncertain?: boolean;
    },
    avatarBlob?: Blob | null
  ) => Promise<{ error: string | null }>;
  updateProfile: (updates: {
    displayName?: string;
    avatarSeed?: string | null;
    avatarUrl?: string | null;
    dateOfBirth?: string | null;
    timeOfBirth?: string | null;
    placeOfBirth?: string | null;
    timeUncertain?: boolean;
    partnerName?: string | null;
    partnerDateOfBirth?: string | null;
    partnerTimeOfBirth?: string | null;
    partnerTimeUncertain?: boolean;
    partnerPlaceOfBirth?: string | null;
  }) => Promise<{ error: string | null; data?: CustomerProfile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "orders" | "receipts" | "users" | "dashboard">("profile");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingService, setSelectedBookingService] = useState<BookingService | null>(null);

  const supabase = createClient();

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch customer profile:", error.message);
        return null;
      }

      if (data) {
        setProfile(data);
        return data;
      }

      // If user exists in Auth but not in customer_profiles yet, create initial record
      if (userEmail) {
        const newProfile = {
          auth_user_id: userId,
          email: userEmail,
          display_name: userEmail.split("@")[0] || "User",
          role: "customer" as const,
          account_status: "active" as const,
        };
        const { data: created } = await supabase
          .from("customer_profiles")
          .insert(newProfile)
          .select()
          .single();
        if (created) {
          setProfile(created);
          return created;
        }
      }
    } catch (err) {
      console.error("Error in fetchProfile:", err);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        }
      } catch (err) {
        console.error("Error initializing session:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (tab: "signin" | "signup" = "signin") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email);
      }
      closeAuthModal();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Failed to sign in" };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    avatarSeed?: string | null,
    birthDetails?: {
      dateOfBirth?: string;
      timeOfBirth?: string;
      placeOfBirth?: string;
      timeUncertain?: boolean;
    },
    avatarBlob?: Blob | null
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            avatar_seed: avatarSeed || null,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);

        let uploadedAvatarUrl: string | null = null;
        if (avatarBlob) {
          try {
            const uploadRes = await uploadUserAvatar(supabase, data.user.id, avatarBlob);
            if (uploadRes.publicUrl) {
              uploadedAvatarUrl = uploadRes.publicUrl;
            }
          } catch (uploadErr) {
            console.error("Non-blocking avatar upload error during signup:", uploadErr);
          }
        }

        // Create associated customer_profiles record with birth details and avatar
        const { data: profileData } = await supabase
          .from("customer_profiles")
          .insert({
            auth_user_id: data.user.id,
            email,
            display_name: displayName,
            role: "customer",
            avatar_seed: uploadedAvatarUrl ? null : avatarSeed || null,
            avatar_url: uploadedAvatarUrl || null,
            date_of_birth: birthDetails?.dateOfBirth || null,
            time_of_birth: birthDetails?.timeOfBirth || null,
            place_of_birth: birthDetails?.placeOfBirth || null,
            time_uncertain: birthDetails?.timeUncertain || false,
          })
          .select()
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      closeAuthModal();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Failed to create account" };
    }
  };

  const openProfileModal = (tab?: "profile" | "orders" | "receipts" | "users" | "dashboard") => {
    if (tab) {
      setProfileModalTab(tab);
    }
    setProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
  };

  const updateProfile = async (updates: {
    displayName?: string;
    avatarSeed?: string | null;
    avatarUrl?: string | null;
    dateOfBirth?: string | null;
    timeOfBirth?: string | null;
    placeOfBirth?: string | null;
    timeUncertain?: boolean;
    partnerName?: string | null;
    partnerDateOfBirth?: string | null;
    partnerTimeOfBirth?: string | null;
    partnerTimeUncertain?: boolean;
    partnerPlaceOfBirth?: string | null;
  }) => {
    if (!user) return { error: "User is not logged in." };
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.displayName !== undefined) payload.display_name = updates.displayName;
      if (updates.avatarSeed !== undefined) payload.avatar_seed = updates.avatarSeed;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
      if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
      if (updates.timeOfBirth !== undefined) payload.time_of_birth = updates.timeOfBirth;
      if (updates.placeOfBirth !== undefined) payload.place_of_birth = updates.placeOfBirth;
      if (updates.timeUncertain !== undefined) payload.time_uncertain = updates.timeUncertain;

      if (updates.partnerName !== undefined) payload.partner_name = updates.partnerName;
      if (updates.partnerDateOfBirth !== undefined) payload.partner_date_of_birth = updates.partnerDateOfBirth;
      if (updates.partnerTimeOfBirth !== undefined) payload.partner_time_of_birth = updates.partnerTimeOfBirth;
      if (updates.partnerTimeUncertain !== undefined) payload.partner_time_uncertain = updates.partnerTimeUncertain;
      if (updates.partnerPlaceOfBirth !== undefined) payload.partner_place_of_birth = updates.partnerPlaceOfBirth;

      const { data, error } = await supabase
        .from("customer_profiles")
        .update(payload)
        .eq("auth_user_id", user.id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      if (data) {
        setProfile(data);
      }
      return { error: null, data };
    } catch (err: any) {
      return { error: err.message || "Failed to update profile." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  const openBookingModal = (service?: BookingService) => {
    if (service) {
      setSelectedBookingService(service);
    }
    setBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
  };

  // Admin authorization is determined strictly from database profile role (no hardcoded emails)
  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        authModalOpen,
        authModalTab,
        setAuthModalOpen,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        profileModalOpen,
        setProfileModalOpen,
        profileModalTab,
        setProfileModalTab,
        openProfileModal,
        closeProfileModal,
        bookingModalOpen,
        selectedBookingService,
        openBookingModal,
        closeBookingModal,
        signIn,
        signUp,
        updateProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
