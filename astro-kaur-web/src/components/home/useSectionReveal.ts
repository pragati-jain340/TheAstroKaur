"use client";

import { useEffect, useState } from "react";

export function useSectionReveal(sectionId: string, reduceMotion: boolean) {
  const [revealed, setRevealed] = useState(false);
  const [revealRun, setRevealRun] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;

    function replayOnAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.hash !== `#${sectionId}` || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      if (link.origin !== window.location.origin || link.pathname !== window.location.pathname || link.search !== window.location.search) return;

      // Reobserve the heading even when the link points to the current position.
      setRevealed(false);
      setRevealRun((run) => run + 1);
    }

    document.addEventListener("click", replayOnAnchorClick);
    return () => document.removeEventListener("click", replayOnAnchorClick);
  }, [sectionId, reduceMotion]);

  return { revealed, setRevealed, revealRun };
}
