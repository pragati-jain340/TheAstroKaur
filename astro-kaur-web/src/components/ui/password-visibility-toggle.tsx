"use client";

import { Button } from "@/components/ui/button";

export function PasswordVisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      onClick={onToggle}
      className="absolute right-1 top-1/2 h-7 -translate-y-1/2 cursor-pointer bg-[#F4EFE4] px-2 text-xs font-medium text-[#46505F] hover:bg-[#EAE1D1] hover:text-[#0F172A] dark:bg-[#263349] dark:text-[#F3CE6D] dark:hover:bg-[#344154] dark:hover:text-white"
    >
      {visible ? "Hide" : "Show"}
    </Button>
  );
}
