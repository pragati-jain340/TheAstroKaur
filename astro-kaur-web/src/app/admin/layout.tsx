"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SubpageBackground from "@/components/layout/SubpageBackground";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, isAdmin } = useAuth();
  const router = useRouter();

  // Route protection: unauthorized users redirected to home
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [user, isAdmin, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="text-3xl text-[#E5B842] animate-pulse font-serif">✦</div>
        <p className="mt-3 text-xs tracking-wider uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Verifying administrative credentials…
        </p>
      </div>
    );
  }

  // Access Restricted (non-admin protection)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-2xl text-[#E5B842] mb-4">
          ✦
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
          Administrative Access Restricted
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 max-w-md">
          This workspace is reserved exclusively for TheAstroKaur administrators. Redirecting to home…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col lg:flex-row relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />

      {/* Persistent Sidebar */}
      <AdminSidebar />

      {/* Main Workspace Canvas (Offset by sidebar width on desktop) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen relative z-10">
        <main className="flex-1 p-5 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
