"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
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
        <p role="status" className="text-sm text-[#46505F] dark:text-[#BCC4D0]">Checking admin access…</p>
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
    <div className="min-h-screen bg-[#FFFDF9] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <AdminSidebar />
      <main className="mx-auto min-h-[calc(100vh-116px)] w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
