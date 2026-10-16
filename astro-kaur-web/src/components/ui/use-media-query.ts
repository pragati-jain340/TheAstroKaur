"use client";

import { useCallback, useSyncExternalStore } from "react";

export const COMPACT_MOTION_QUERY =
  "(max-width: 639px), (max-width: 1023px) and (max-height: 600px)";

export function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
