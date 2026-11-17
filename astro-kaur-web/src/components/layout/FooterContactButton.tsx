"use client";

import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/context/AuthContext";

export default function FooterContactButton() {
  const { openContactModal } = useAuth();
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={() => openContactModal()}
      initial={false}
      animate="closed"
      whileHover="open"
      whileFocus="open"
      className="group inline-flex cursor-pointer items-center gap-2.5 rounded-sm text-sm text-[#0F172A]/75 transition-colors hover:text-[#6B3448] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6B3448] dark:text-[#FAF8F5]/75 dark:hover:text-[#E5B842]"
    >
      <motion.span
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6B3448]/10 text-[#6B3448] dark:bg-[#E5B842]/15 dark:text-[#E5B842]"
        variants={{ closed: { scale: 1 }, open: { scale: reduceMotion ? 1 : 1.1 } }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true" className="absolute"
          variants={{
            closed: { opacity: 1, scale: 1, transition: { duration: 0.2, repeat: 0 } },
            open: reduceMotion
              ? { opacity: 0, transition: { duration: 0.15, repeat: 0 } }
              : {
                  opacity: [1, 0, 0, 1, 1], scale: [1, 0.8, 0.8, 1, 1],
                  transition: { duration: 1.8, times: [0, 0.15, 0.65, 0.85, 1], repeat: Infinity, ease: "easeInOut" },
                },
          }}
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </motion.svg>
        <motion.svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true" className="absolute overflow-visible"
          variants={{
            closed: { opacity: 0, x: 0, y: 0, transition: { duration: 0.15, repeat: 0 } },
            open: reduceMotion
              ? { opacity: 1, x: 0, y: 0, transition: { duration: 0.15, repeat: 0 } }
              : {
                  opacity: [0, 1, 0, 0, 0], x: [-6, 0, 20, 20, -6], y: [6, 0, -20, -20, 6],
                  transition: { duration: 1.8, times: [0, 0.2, 0.65, 0.85, 1], repeat: Infinity, ease: "easeInOut" },
                },
          }}
        >
          <path d="m21 3-6.5 18-4-7.5L3 9.5 21 3Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M10.5 13.5 21 3" />
        </motion.svg>
      </motion.span>
      <span className="border-b border-[#0F172A]/15 pb-0.5 font-light tracking-wide transition-colors group-hover:border-[#6B3448] dark:border-[#FAF8F5]/20 dark:group-hover:border-[#E5B842]">
        Contact us
      </span>
      <span aria-hidden="true" className="text-xs text-[#6B3448]/60 transition-colors group-hover:text-[#6B3448] dark:text-[#E5B842]/60 dark:group-hover:text-[#E5B842]">↗</span>
    </motion.button>
  );
}
