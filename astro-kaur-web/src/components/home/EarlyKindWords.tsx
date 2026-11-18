"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Heart, Sparkles, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogClose, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useMediaQuery } from "@/components/ui/use-media-query";
import styles from "./EarlyKindWords.module.css";

const messages = [
  { width: 493, height: 521 },
  { width: 495, height: 587 },
  { width: 490, height: 425 },
  { width: 496, height: 568 },
  { width: 492, height: 557 },
  { width: 495, height: 493 },
  { width: 492, height: 225 },
  { width: 486, height: 725 },
  { width: 476, height: 537 },
  { width: 475, height: 662 },
].map((size, index) => ({
  ...size,
  src: `/early-feedback/message-${String(index + 1).padStart(2, "0")}.png`,
  alt: `Original client feedback message ${index + 1}, shared before TheAstroKaur website launched`,
}));

const arrowClass = "flex size-11 shrink-0 items-center justify-center rounded-full border border-[#B88B56]/30 bg-white/70 text-[#6B3448] transition-colors hover:bg-[#E5B842]/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B88B56] dark:bg-white/5 dark:text-[#F2DFCA]";
const columns = ["md:col-span-4", "md:col-span-5", "md:col-span-3", "md:col-span-3", "md:col-span-4", "md:col-span-5"];

function MessageCard({ message, index, reduceMotion, onOpen }: { message: typeof messages[number]; index: number; reduceMotion: boolean; onOpen: () => void }) {
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const rotation = (index % 2 === 0 ? -1 : 1) * (reduceMotion ? 0.75 : 2);

  return (
    <div className="relative h-full hover:z-10 focus-within:z-10">
      <motion.button type="button" onClick={onOpen}
        style={{ transformOrigin: "50% 65%" }}
        initial="rest" animate="rest" whileHover={finePointer ? "hover" : undefined} whileFocus={finePointer ? "hover" : undefined} whileTap={finePointer ? "hover" : "pressed"}
        variants={{ rest: { rotate: 0, y: 0, scale: 1, boxShadow: "0px 2px 5px rgba(70,42,52,0.06)" }, pressed: { scale: reduceMotion ? 1 : 0.98 }, hover: { rotate: rotation, y: reduceMotion ? 0 : -3, boxShadow: "0px 10px 24px rgba(70,42,52,0.16)" } }} transition={reduceMotion ? { duration: 0.25, ease: "easeOut" } : { type: "spring", stiffness: 160, damping: 19, mass: 0.8 }}
        aria-label={`Read original message ${index + 1} in full`}
        className={`${styles.message} relative flex h-[210px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl border border-[#B88B56]/20 bg-white p-2 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#B88B56] sm:h-[280px] md:h-[300px] lg:h-[320px]`}>
        <Image src={message.src} alt={message.alt} width={message.width} height={message.height} loading="eager" sizes="(max-width: 639px) 80vw, (max-width: 767px) 45vw, 400px" className="h-full w-full rounded-xl object-contain" />
        <motion.span aria-hidden="true" variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }} transition={{ duration: 0.25 }} className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-[#B88B56]/75 dark:ring-[#DEC58F]/85" />
      </motion.button>
    </div>
  );
}

export default function EarlyKindWords() {
  const [page, setPage] = useState(0);
  const [activeMessage, setActiveMessage] = useState<number | null>(null);
  const imageTrigger = useRef<HTMLElement | null>(null);
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressSwipeClick = useRef(false);
  // The media-query hook uses the same snapshot on the server and during
  // hydration, then subscribes to the browser's accessibility preference.
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const phoneLayout = useMediaQuery("(max-width: 639px)");
  const collections = phoneLayout ? [[0, 3], [3, 6], [6, 10]] : [[0, 5], [5, 10]];
  const pageCount = collections.length;
  const currentPage = Math.min(page, pageCount - 1);
  const duration = reduceMotion ? 0 : 0.45;
  const reveal = {
    hidden: { opacity: 0, y: 24, transition: { duration: 0 } },
    visible: { opacity: 1, y: 0, transition: { duration } },
  };

  function changePage(nextPage: number) {
    setPage(nextPage);
  }

  function browseMessage(step: number) {
    setActiveMessage(current => current === null ? null : (current + step + messages.length) % messages.length);
  }

  return (
    <section id="early-kind-words" aria-labelledby="early-kind-words-title" className={`${styles.section} relative px-4 py-16 sm:px-6 lg:px-16 lg:py-24`}>
      <div className={`${styles.panel} mx-auto max-w-6xl rounded-[2rem] border border-[#B88B56]/15 bg-[#F8F5EF]/95 p-4 shadow-[0_16px_70px_-45px_#6B344840] sm:p-8 lg:p-12 dark:bg-[#172231]/95`}>
        <motion.div initial="hidden" animate={reduceMotion ? "visible" : "hidden"} whileInView="visible" variants={reveal} className={`${styles.header} mx-auto mb-2 max-w-2xl text-center`}>
          <p className={`${styles.eyebrow} mb-4 text-[10px] font-semibold tracking-[0.2em] text-[#956A37] sm:text-xs dark:text-[#E5B842]`}>✦ WORDS FROM PAST READINGS ✦</p>
          <h2 id="early-kind-words-title" className={`${styles.heading} font-serif text-3xl font-normal leading-tight tracking-tight text-[#302731] sm:text-4xl lg:text-5xl dark:text-[#FAF8F5]`}>In Their Own Words</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#77695E] sm:text-base dark:text-[#FAF8F5]/65">A little collection of heartfelt messages and kind words shared along the way.</p>
        </motion.div>

        <div role="region" aria-roledescription="carousel" aria-label="Early client messages">
          <motion.div id="early-messages-grid"
            onPointerDown={event => {
              suppressSwipeClick.current = false;
              const mouseDrag = !phoneLayout && event.pointerType === "mouse" && event.button === 0;
              const touchSwipe = phoneLayout && event.pointerType !== "mouse";
              if (!event.isPrimary || (!mouseDrag && !touchSwipe)) return;
              swipeStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
            }}
            onPointerMove={event => {
              const start = swipeStart.current;
              if (!start || start.pointerId !== event.pointerId || event.pointerType !== "mouse") return;
              const distanceX = Math.abs(event.clientX - start.x);
              const distanceY = Math.abs(event.clientY - start.y);
              if (distanceX < 8 || distanceX < distanceY * 1.25) return;
              suppressSwipeClick.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onDragStartCapture={event => {
              if (!phoneLayout) event.preventDefault();
            }}
            onPointerUp={event => {
              const start = swipeStart.current;
              swipeStart.current = null;
              if (!start || start.pointerId !== event.pointerId) return;
              const distanceX = event.clientX - start.x;
              const distanceY = event.clientY - start.y;
              if (Math.abs(distanceX) < 48 || Math.abs(distanceX) < Math.abs(distanceY) * 1.25) return;
              suppressSwipeClick.current = true;
              changePage((currentPage + (distanceX < 0 ? 1 : -1) + pageCount) % pageCount);
            }}
            onPointerCancel={() => { swipeStart.current = null; }}
            onClickCapture={event => {
              if (!suppressSwipeClick.current) return;
              suppressSwipeClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            initial="hidden" animate={reduceMotion ? "visible" : "hidden"} whileInView="visible" variants={reveal} className={`${styles.gallery} overflow-hidden rounded-2xl`}>
            {/* Keep all grids mounted so navigation never waits for a reveal
                sequence or newly mounted images, and the viewport stays stable. */}
            <motion.div initial={false} animate={{ x: reduceMotion ? "0%" : `${currentPage * -100 / pageCount}%` }} transition={{ duration: reduceMotion ? 0 : 0.85, ease: [0.65, 0, 0.35, 1] }} className={reduceMotion ? "grid" : "grid will-change-transform"} style={reduceMotion ? undefined : { width: `${pageCount * 100}%`, gridTemplateColumns: `repeat(${pageCount}, minmax(0, 1fr))` }}>
              {collections.map(([start, end], slide) => (
              <motion.div key={slide} initial={false} animate={{ opacity: reduceMotion && slide !== currentPage ? 0 : 1 }} transition={{ duration: 0.65, ease: "easeInOut" }} inert={slide !== currentPage} aria-hidden={slide !== currentPage} role="group" aria-roledescription="slide" aria-label={`Collection ${slide + 1} of ${pageCount}`} className={`${styles.collection} grid min-w-0 grid-cols-2 gap-3 p-2 pt-14 md:grid-cols-12 md:gap-4 md:pt-16 ${reduceMotion ? "col-start-1 row-start-1" : ""}`}>
                {messages.slice(start, end).map((message, index) => {
                  const messageIndex = start + index;
                  return (
                    <div key={message.src} className={`${styles.tile} min-w-0 ${columns[index + slide]}`}>
                      <MessageCard message={message} index={messageIndex} reduceMotion={reduceMotion} onOpen={() => setActiveMessage(messageIndex)} />
                    </div>
                  );
                })}
                {(phoneLayout ? (slide < 2 ? [slide] : []) : [slide]).map(quoteIndex => (
                <motion.div key={`quote-${quoteIndex}`} whileHover={reduceMotion ? undefined : { y: -3 }} transition={{ duration: 0.25 }} className={`${styles.tile} ${styles.quote} ${quoteIndex === 1 ? styles.quoteFirst : ""} relative isolate z-20 h-[210px] rounded-2xl border border-[#B88B56]/25 p-3 shadow-[0_4px_20px_-12px_#6B344830] sm:h-[280px] sm:p-4 md:h-[300px] lg:h-[320px] dark:border-[#D1B880]/30 dark:shadow-[0_8px_30px_-12px_#00000060] ${quoteIndex === 1 ? `order-first ${columns[0]} bg-[#F5ECEB] dark:bg-[#243C42]` : `${columns[5]} bg-[#F5F0E5] dark:bg-[#24344B]`}`}>
                  <Image src="/early-feedback/dream-card-character.png" alt="" aria-hidden="true" width={1776} height={888} sizes="(max-width: 767px) 120px, 144px" className={`${styles.character} pointer-events-none absolute -top-[50px] left-1/2 z-10 h-auto w-[120px] -translate-x-1/2 select-none md:-top-[60px] md:w-36`} />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
                    <div className="absolute -right-16 -bottom-20 size-56 rounded-full border border-[#B88B56]/15 before:absolute before:inset-5 before:rounded-full before:border before:border-[#B88B56]/15 after:absolute after:inset-10 after:rounded-full after:border after:border-[#B88B56]/10 dark:border-[#D1B880]/15 dark:before:border-[#D1B880]/15 dark:after:border-[#D1B880]/10" />
                  </div>
                  <div className="flex h-full flex-col items-center gap-3 rounded-xl border border-[#B88B56]/25 px-3 py-4 text-center sm:gap-4 sm:px-5 sm:py-6 dark:border-[#D1B880]/25">
                    <div aria-hidden="true" className="flex items-center gap-3 text-[#A78043] dark:text-[#DEC58F]">
                      <span className="h-px w-6 bg-current opacity-40 sm:w-9" />
                      <Sparkles className="size-4 sm:size-5" strokeWidth={1.2} />
                      <span className="h-px w-6 bg-current opacity-40 sm:w-9" />
                    </div>
                    <p className="max-w-[17rem] font-serif text-[18px] font-normal italic leading-snug text-[#63384B] sm:text-2xl lg:text-[28px] dark:text-[#FFF7E8]">{quoteIndex === 0 ? "Sometimes, a little clarity means everything." : "Every message holds a story worth remembering."}</p>
                    <p className="mt-auto flex max-w-[15rem] items-center justify-center gap-2 text-[10px] leading-relaxed text-[#806859] sm:text-xs dark:text-[#CBD5DE]"><Heart className="size-3 shrink-0 text-[#AB7D66] dark:text-[#DEC58F]" strokeWidth={1.3} aria-hidden="true" />{quoteIndex === 0 ? "Thoughtful words, meaningful moments." : "Shared with warmth and gratitude."}</p>
                  </div>
                </motion.div>
                ))}
              </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <div className={`${styles.controls} mt-6 flex items-center justify-center gap-5`}>
            <button type="button" className={arrowClass} onClick={() => changePage((currentPage - 1 + pageCount) % pageCount)} aria-label="Previous collection of early messages" aria-controls="early-messages-grid"><ArrowLeft size={18} /></button>
            <p aria-live="polite" aria-atomic="true" className="min-w-20 text-center text-xs tracking-widest text-[#77695E] dark:text-[#FAF8F5]/65">0{currentPage + 1} <span className="mx-2 opacity-40">/</span> 0{pageCount}</p>
            <button type="button" className={arrowClass} onClick={() => changePage((currentPage + 1) % pageCount)} aria-label="Next collection of early messages" aria-controls="early-messages-grid"><ArrowRight size={18} /></button>
          </div>
        </div>

        <div className={`${styles.footer} mt-7 text-center max-sm:hidden`}>
          <p className="text-xs text-[#77695E] dark:text-[#FAF8F5]/65">A glimpse into our earliest conversations</p>
        </div>
      </div>

      <Dialog open={activeMessage !== null} onOpenChange={open => { if (!open) setActiveMessage(null); }}>
        <DialogPortal forceMount>
          <AnimatePresence>
            {activeMessage !== null && (
              <motion.div key="image-viewer" className="fixed inset-0 z-[120]" initial="closed" animate="open" exit="closed">
                <DialogPrimitive.Overlay forceMount asChild>
                  <motion.div className="absolute inset-0 bg-[#17121C]/80 backdrop-blur-md" variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }} transition={{ duration: reduceMotion ? 0 : 0.3 }} />
                </DialogPrimitive.Overlay>
                <DialogPrimitive.Content forceMount aria-describedby={undefined} onOpenAutoFocus={() => { imageTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }} onCloseAutoFocus={event => { event.preventDefault(); imageTrigger.current?.focus(); }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); browseMessage(event.key === "ArrowLeft" ? -1 : 1); } }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 outline-none" style={{ width: `min(calc(100vw - 3rem), ${82 * messages[activeMessage].width / messages[activeMessage].height}dvh, 1000px)` }}>
                  <DialogTitle className="sr-only">Original client message {activeMessage + 1}</DialogTitle>
                  <motion.div variants={{ closed: { opacity: 0, scale: reduceMotion ? 1 : 0.88, y: reduceMotion ? 0 : 28, filter: reduceMotion ? "blur(0px)" : "blur(8px)" }, open: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" } }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 230, damping: 27, mass: 0.8 }} className="relative">
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div key={activeMessage} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="overflow-hidden rounded-2xl bg-white shadow-[0_32px_100px_-16px_rgba(0,0,0,0.65)] ring-1 ring-white/20">
                        <Image src={messages[activeMessage].src} alt={messages[activeMessage].alt} width={messages[activeMessage].width} height={messages[activeMessage].height} sizes="(max-width: 768px) 95vw, 1000px" className="block h-auto max-h-[82dvh] w-full object-contain" />
                      </motion.div>
                    </AnimatePresence>
                    <DialogClose asChild>
                      <motion.button type="button" aria-label="Close image" whileHover={reduceMotion ? undefined : { rotate: 90 }} whileTap={reduceMotion ? undefined : { scale: 0.92 }} transition={{ duration: 0.2 }} className="absolute -top-5 -right-3 flex size-10 items-center justify-center rounded-full border border-white/25 bg-[#F8F5EF] text-[#6B3448] shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:-right-5"><X size={18} strokeWidth={1.5} /></motion.button>
                    </DialogClose>
                  </motion.div>
                </DialogPrimitive.Content>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogPortal>
      </Dialog>
    </section>
  );
}
