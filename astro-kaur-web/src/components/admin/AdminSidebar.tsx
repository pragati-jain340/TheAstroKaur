"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  name: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: (active) => (
      <svg
        className={`w-4 h-4 ${active ? "text-[#E5B842]" : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
        />
      </svg>
    ),
  },
  {
    name: "Calendar",
    href: "/admin/calendar",
    icon: (active) => (
      <svg
        className={`w-4 h-4 ${active ? "text-[#E5B842]" : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
      </svg>
    ),
  },
  {
    name: "Readings",
    href: "/admin/readings",
    icon: (active) => (
      <svg
        className={`w-4 h-4 ${active ? "text-[#E5B842]" : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: (active) => (
      <svg
        className={`w-4 h-4 ${active ? "text-[#E5B842]" : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
  },
  {
    name: "Testimonials",
    href: "/admin/testimonials",
    icon: (active) => (
      <svg
        className={`w-4 h-4 ${active ? "text-[#E5B842]" : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
        />
      </svg>
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ─── Mobile Header Bar ─── */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#FAF8F5]/95 dark:bg-[#0D1829]/95 backdrop-blur-md border-b border-[#E5B842]/20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 flex-shrink-0">
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
          <div>
            <span className="font-serif text-sm font-semibold tracking-wide text-[#0F172A] dark:text-[#FAF8F5]">
              TheAstroKaur
            </span>
            <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#E5B842] text-[#0F172A]">
              ADMIN
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/15 transition-colors cursor-pointer"
          aria-label="Toggle Navigation Drawer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* ─── Mobile Drawer Backdrop ─── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Persistent Sidebar (Desktop & Mobile Drawer) ─── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FAF8F5] dark:bg-[#0D1829] border-r border-[#E5B842]/20 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="p-6 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-11 h-11 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
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
              <div>
                <p className="font-serif text-base font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight">
                  TheAstroKaur
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#E5B842] text-[#0F172A] shadow-xs">
                    ADMIN
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-[#E5B842]/15 text-[#B8871E] dark:text-[#E5B842] border-l-2 border-[#E5B842] font-semibold shadow-xs"
                      : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5"
                  }`}
                >
                  {item.icon(active)}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: My Account & Sign Out */}
        <div className="p-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8 space-y-1">
          {/* User Profile Snippet */}
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-[#0F172A] dark:text-[#FAF8F5] truncate">
              {profile?.display_name || "Administrator"}
            </p>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 truncate">
              {profile?.email}
            </p>
          </div>

          {/* My Account (Personal) */}
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 transition-colors"
          >
            <span className="text-[#E5B842] text-sm">✦</span>
            <span>My Account</span>
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <span>Sign Out</span>
            <span>→</span>
          </button>
        </div>
      </aside>
    </>
  );
}
