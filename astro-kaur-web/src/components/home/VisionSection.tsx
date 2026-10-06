export default function VisionSection() {
  const pillars = [
    {
      title: "Self-Awareness",
      description: "Understand your unique life path and underlying karmic inclinations.",
      icon: (
        <svg className="w-6 h-6 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
    {
      title: "Conscious Choices",
      description: "Approach life, career, and partnership decisions with higher discernment.",
      icon: (
        <svg className="w-6 h-6 text-[#6B3448] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52v11.455m0 0a24.255 24.255 0 0 1-3-.424m3 .424c-.99.195-2.02.34-3.08.434M5.25 4.97c-.99.143-1.99.317-3 .52m3-.52v11.455m0 0c1.01.143 2.01.317 3 .52m-3-.52a24.255 24.255 0 0 0 3-.424" />
        </svg>
      ),
    },
    {
      title: "Personal Growth",
      description: "Recognise your core strengths and navigate recurring tests gracefully.",
      icon: (
        <svg className="w-6 h-6 text-[#B87936] dark:text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
      ),
    },
    {
      title: "A More Aligned Life",
      description: "Live with clear intentional purpose, anchored in self-understanding.",
      icon: (
        <svg className="w-6 h-6 text-[#E5B842]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
    },
  ];

  return (
    <section id="vision" className="scroll-mt-28 sm:scroll-mt-32 py-20 lg:py-28 px-6 lg:px-16 bg-transparent relative">
      <div className="max-w-7xl mx-auto">
        {/* Intro Vision Block */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25 mb-4">
            The Philosophy
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight mb-6">
            Ancient Vedic Wisdom, Made Relevant to Modern Life
          </h2>
          <p className="text-base sm:text-lg text-[#0F172A]/75 dark:text-[#FAF8F5]/80 font-light leading-relaxed mb-5">
            My vision is to bridge the gap between ancient Vedic wisdom and the modern world. I aspire to make Vedic astrology accessible, practical, and empowering for people across the globe—not as a tool to predict or fear the future, but as a guide for self-awareness, conscious choices, and personal transformation.
          </p>
          <p className="text-sm sm:text-base text-[#0F172A]/65 dark:text-[#FAF8F5]/65 font-light leading-relaxed">
            Through authentic Vedic knowledge, compassion, and practical guidance, I hope to help people understand their unique life path, embrace their strengths, navigate challenges with confidence, and live with greater purpose and clarity.
          </p>
        </div>

        {/* 4 Visual Highlight Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white dark:bg-[#1E293B]/70 p-7 rounded-2xl flex flex-col items-center text-center border border-[#0F172A]/6 dark:border-[#FAF8F5]/8 shadow-sm hover:shadow-md hover:border-[#E5B842]/35 transition-all group"
            >
              <div className="w-13 h-13 rounded-full bg-[#FAF8F5] dark:bg-[#0F172A] border border-[#E5B842]/25 flex items-center justify-center p-3 mb-5 transition-transform group-hover:scale-110">
                {pillar.icon}
              </div>
              <h3 className="font-serif text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-2">
                {pillar.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-relaxed font-light">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
