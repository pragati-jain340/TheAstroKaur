export default function FinalCTASection() {
  return (
    <section className="w-full bg-[#0F172A]/85 backdrop-blur-sm text-[#FAF8F5] py-20 lg:py-28 px-6 lg:px-16 relative overflow-hidden border-t border-[#E5B842]/20">
      {/* Starfield / Glow Accent Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(229, 184, 66, 0.15) 0%, rgba(107, 52, 72, 0.15) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
        {/* Celestial Star Icon */}
        <div className="w-13 h-13 rounded-full bg-[#1E293B] border border-[#E5B842]/40 flex items-center justify-center text-[#E5B842] mb-6 shadow-md p-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#FAF8F5] font-normal tracking-tight mb-5 max-w-2xl">
          Begin Your Journey Towards Greater Clarity
        </h2>

        <p className="text-base sm:text-lg text-[#FAF8F5]/80 max-w-xl mb-10 font-light leading-relaxed">
          Explore the readings and find the one that feels relevant to your path, or get in touch to ask any preliminary questions.
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          <a
            href="#readings"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all group"
          >
            <span>Explore My Readings</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>

          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-[#FAF8F5]/30 hover:border-[#E5B842] text-[#FAF8F5] font-medium text-xs tracking-wider uppercase hover:bg-[#E5B842]/10 transition-all"
          >
            <span>Contact Me</span>
          </a>
        </div>

        {/* Reassurance Badge */}
        <div className="inline-flex items-center gap-2 text-xs text-[#FAF8F5]/60 bg-[#1E293B]/70 px-4 py-2 rounded-full border border-[#FAF8F5]/10">
          <svg className="w-4 h-4 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span>100% private &amp; confidential · Conducted via Google Meet or thorough written reading</span>
        </div>
      </div>
    </section>
  );
}
