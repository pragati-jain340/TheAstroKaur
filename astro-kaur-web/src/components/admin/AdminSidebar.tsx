"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";
import { ArrowLeft, CalendarDays, ChevronDown, LayoutGrid, ListPlus, LogOut, SquarePen, Users } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutGrid },
  { label: "Voice call booking", href: "/admin/calendar", icon: CalendarDays },
  { label: "Text booking", href: "/admin/text-booking", icon: ListPlus },
  { label: "Website content", href: "/admin/content", icon: SquarePen },
  { label: "Users", href: "/admin/users", icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  const current = NAV_ITEMS.find(item => isActive(item.href));

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const brand = (
    <Link href="/admin" className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <span className="relative h-9 w-9 shrink-0">
        <Image src="/astro-emblem-light.png?v=6" alt="" fill unoptimized className="object-contain dark:hidden" />
        <Image src="/astro-emblem-dark.png?v=6" alt="" fill unoptimized className="hidden object-contain dark:block" />
      </span>
      <span>
        <span className="block font-serif text-lg font-semibold leading-tight">TheAstroKaur</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">Admin workspace</span>
      </span>
    </Link>
  );

  const navigation = NAV_ITEMS.map(item => (
    <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={isActive(item.href) ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isActive(item.href) ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      <item.icon aria-hidden="true" className="size-4 shrink-0" />
      {item.label}
    </Link>
  ));

  const account = (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <div className="flex min-w-0 items-center gap-2.5 px-1">
        <AvatarDisplay avatarUrl={profile?.avatar_url} avatarSeed={profile?.avatar_seed} name={profile?.display_name || "Administrator"} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium">{profile?.display_name || "Administrator"}</span>
          <span className="block text-[11px] text-muted-foreground">Administrator</span>
        </span>
        <ThemeToggle className="h-8 w-8 shrink-0" />
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" asChild className="flex-1 justify-start text-xs text-muted-foreground">
          <Link href="/" onClick={() => setMobileOpen(false)}><ArrowLeft aria-hidden="true" className="size-3.5" />Home</Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-destructive">
          <LogOut aria-hidden="true" className="size-3.5" />Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside aria-label="Admin workspace" className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col overflow-y-auto border-r border-border/60 bg-[#FAF8F5] px-4 py-6 dark:bg-[#0D1829] lg:flex">
        {brand}
        <p className="mb-3 mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <nav aria-label="Admin sections" className="space-y-1.5">{navigation}</nav>
        <div className="mt-auto pt-10">{account}</div>
      </aside>
      <header className="border-b border-border/60 bg-card px-4 py-4 lg:hidden">
        {brand}
        <details open={mobileOpen} onToggle={event => setMobileOpen(event.currentTarget.open)} className="group mt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg border border-border/60 px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            {current?.label || "Admin sections"}<ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="pt-3">
            <nav aria-label="Mobile admin sections" className="space-y-1">{navigation}</nav>
            <div className="pt-4">{account}</div>
          </div>
        </details>
      </header>
    </>
  );
}
