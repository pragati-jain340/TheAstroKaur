"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";
import {
  CalendarDays,
  ExternalLink,
  LayoutGrid,
  ListPlus,
  LogOut,
  SquarePen,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: "overview" },
  { label: "Voice Call Booking", href: "/admin/calendar", icon: "calendar" },
  { label: "Text Booking", href: "/admin/text-booking", icon: "text" },
  { label: "Website Content", href: "/admin/content", icon: "content" },
] as const;

const NAV_ICONS = { overview: LayoutGrid, calendar: CalendarDays, text: ListPlus, content: SquarePen };

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="border-b border-[#0F172A]/10 bg-[#FFFDF9] dark:border-white/10 dark:bg-[#0F172A]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#805b11] dark:focus-visible:outline-[#E5B842]">
          <span className="relative h-9 w-9 shrink-0">
            <Image src="/astro-emblem-light.png?v=6" alt="" fill unoptimized className="object-contain dark:hidden" />
            <Image src="/astro-emblem-dark.png?v=6" alt="" fill unoptimized className="hidden object-contain dark:block" />
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-base font-semibold leading-tight text-[#0F172A] dark:text-[#FAF8F5]">The Astro Kaur</span>
            <span className="block text-xs text-[#46505F] dark:text-[#BCC4D0]">Admin workspace</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-2 py-1 px-2.5 rounded-full bg-[#0F172A]/5 dark:bg-white/5 border border-[#E5B842]/25">
            <AvatarDisplay
              avatarUrl={profile?.avatar_url}
              avatarSeed={profile?.avatar_seed}
              name={profile?.display_name || profile?.email || "Admin"}
              size="xs"
              showBorder={false}
            />
            <span
              className="max-w-36 truncate text-xs font-medium text-[#0F172A] dark:text-[#FAF8F5]"
              title={profile?.email || undefined}
            >
              {profile?.display_name || profile?.email || "Administrator"}
            </span>
          </div>

          {/* View Site Button */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 gap-1.5 rounded-lg border-[#E5B842]/30 bg-background/80 hover:bg-[#E5B842]/10 hover:border-[#E5B842] text-xs font-medium text-foreground transition-all shadow-2xs"
          >
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <span>View site</span>
              <ExternalLink className="h-3 w-3 text-[#B87936] dark:text-[#E5B842]" />
            </Link>
          </Button>

          {/* Sign Out Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </Button>

          {/* Theme Toggle */}
          <div className="pl-1 border-l border-[#0F172A]/10 dark:border-white/10">
            <ThemeToggle className="w-8 h-8" />
          </div>
        </div>
      </div>

      <nav aria-label="Admin sections" className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4 sm:px-6 lg:px-10">
        {NAV_ITEMS.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#805b11] dark:focus-visible:outline-[#E5B842] sm:px-4 ${active ? "bg-[#E5B842]/20 text-[#0F172A] dark:bg-[#E5B842]/20 dark:text-[#FFF8E7]" : "text-[#46505F] hover:bg-[#0F172A]/5 hover:text-[#0F172A] dark:text-[#BCC4D0] dark:hover:bg-white/5 dark:hover:text-white"}`}>
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
