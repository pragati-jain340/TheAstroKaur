"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

export default function ContactButton({ children, className }: { children: ReactNode; className?: string }) {
  const { openContactModal } = useAuth();

  return (
    <button type="button" onClick={() => openContactModal()} className={className}>
      {children}
    </button>
  );
}
