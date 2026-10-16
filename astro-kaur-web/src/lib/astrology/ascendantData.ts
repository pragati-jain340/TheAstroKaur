export interface MiniReadingSection {
  title: string;
  emoji: string;
  paragraphs: string[];
  quote?: string;
  bullets?: string[];
}

export interface AscendantReading {
  sign: string;
  sanskritName: string;
  ruler: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  quality: "Cardinal" | "Fixed" | "Mutable";
  glyph: string;
  iconPath: string;
  // Legacy fields for backward compatibility
  overview: string;
  personalityTraits: string;
  lifePathGuidance: string;
  strengths: string[];
  growthAreas: string[];
  // Rich Mini Reading Structured Content
  coreEnergy: {
    emoji: string;
    title: string;
    paragraphs: string[];
    challenge: string;
    quote: string;
  };
  careerSuccess: {
    title: string;
    paragraphs: string[];
    lessonQuote?: string;
  };
  loveRelationships: {
    title: string;
    paragraphs: string[];
    values?: string[];
    questionOrLesson: string;
  };
  moneySecurity: {
    title: string;
    paragraphs: string[];
    quote?: string;
  };
  emotionalWorld: {
    title: string;
    paragraphs: string[];
  };
  hiddenPotential: {
    emoji: string;
    title: string;
    paragraphs: string[];
    buildSteps?: { label: string; pacing: string }[];
    conclusion?: string[];
  };
  firstLayerBullets: { emoji: string; text: string }[];
}

export const ASCENDANT_READINGS: Record<string, AscendantReading> = {
  Aries: {
    sign: "Aries",
    sanskritName: "Mesha",
    ruler: "Mars (Mangal)",
    element: "Fire",
    quality: "Cardinal",
    glyph: "♈",
    iconPath: "/zodiac/aries.svg",
    overview:
      "You are naturally independent, action-oriented and courageous. You often feel best when you are moving forward rather than waiting.",
    personalityTraits:
      "You take the first step, speak directly and prefer figuring things out yourself. There is a strong desire to create your own identity rather than following expectations.",
    lifePathGuidance:
      "Your biggest growth comes from learning when to act, when to pause and what is actually worth your energy.",
    strengths: [
      "Natural courage and resilience in times of uncertainty",
      "Decisive problem solver with exceptional clarity of purpose",
      "Pioneering mindset that fearlessly ventures into new territories",
      "Warmhearted, transparent, and protective towards loved ones",
    ],
    growthAreas: [
      "Channeling natural restlessness into disciplined, sustainable routines",
      "Practicing mindful pause before reacting in emotionally charged moments",
      "Recognizing that true strength often lies in patience and collaborative grace",
    ],
    coreEnergy: {
      emoji: "🔥",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally independent, action-oriented and courageous.",
        "You often feel best when you are moving forward rather than waiting. You may be someone who takes the first step, speaks directly and prefers figuring things out yourself.",
        "You can have a strong desire to create your own identity rather than simply following what others expect from you.",
      ],
      challenge:
        "Your challenge? You may sometimes move too quickly, become impatient or feel frustrated when life doesn't move at your pace.",
      quote:
        "Your biggest growth comes from learning when to act, when to pause and what is actually worth your energy.",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are unlikely to feel fulfilled for long when you have no freedom or sense of progress.",
        "You may thrive when you can lead, initiate, make decisions, solve problems or build something meaningful.",
        "There can be a strong desire to achieve something that makes you feel proud of yourself.",
        "But your success may become much stronger as you mature because you are learning an important lesson:",
      ],
      lessonQuote:
        "Starting something is easy. Building it consistently is where your real power develops.\n\nYou can become very persistent once you have a goal that genuinely matters to you.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You may want a relationship where there is attraction, honesty, respect and freedom to remain yourself.",
        "You don't necessarily want to lose your independence simply because you are in a relationship.",
        "At the same time, relationships can teach you some of your biggest lessons around compromise, patience and seeing another person's perspective.",
      ],
      questionOrLesson:
        "«\"How can I be completely myself and still create a strong partnership?\"»\n\nWhen you find the right dynamic, you don't have to choose between independence and intimacy—you can have both.",
    },
    moneySecurity: {
      title: "Money & Security",
      paragraphs: [
        "You may have a strong desire to become financially independent and create security for yourself.",
        "Your natural instinct can be to act quickly when an opportunity appears. But your financial growth benefits from patience, consistency and thinking long-term.",
        "You can build very well when you stop looking for instant results and focus on creating something sustainable.",
      ],
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "There may be a difference between how strong you appear and what you actually feel inside.",
        "You may instinctively respond to difficult emotions by doing something about the situation rather than sitting with the feeling.",
        "You can be very capable of handling things on your own, but one of your deeper lessons may be allowing yourself to receive support, express vulnerability and admit when something affects you.",
        "Your emotional world becomes much clearer when we look at your individual birth chart.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the energy of someone who can begin again.",
        "Even after setbacks, disappointments or major changes, there can be a strong instinct inside you that says:\n\n\"Okay. What's next?\"",
        "This ability to restart can become one of your greatest strengths.",
        "But your personal chart determines where this strength appears most strongly—and where life may repeatedly challenge you to grow.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and what you truly need in love" },
      { emoji: "💼", text: "Your career direction and where your potential can develop" },
      { emoji: "💰", text: "Your relationship with money and security" },
      { emoji: "🌙", text: "Your emotional needs and inner world" },
      { emoji: "🔥", text: "How you pursue your goals and handle obstacles" },
      { emoji: "🧿", text: "Recurring patterns and deeper life lessons" },
      { emoji: "⏳", text: "When important changes and opportunities are likely to become active" },
    ],
  },

  Taurus: {
    sign: "Taurus",
    sanskritName: "Vrishabha",
    ruler: "Venus (Shukra)",
    element: "Earth",
    quality: "Fixed",
    glyph: "♉",
    iconPath: "/zodiac/taurus.svg",
    overview:
      "You naturally seek stability, comfort, security and something you can rely on. You prefer to observe and move when you feel ready.",
    personalityTraits:
      "Once you make up your mind, you can be extremely difficult to move. You have a strong sense of your own values and dislike being pressured.",
    lifePathGuidance:
      "Your greatest strength is consistency. Your challenge can be becoming too comfortable or resistant to change.",
    strengths: [
      "Unshakable dependability and steadfast loyalty",
      "Deeply grounded practical intellect and financial prudence",
      "Sophisticated eye for aesthetics, balance, and artistic beauty",
      "Calming emotional presence that anchors those around you",
    ],
    growthAreas: [
      "Embracing necessary life transitions without excessive attachment to the familiar",
      "Remaining open to alternate viewpoints and agile compromises",
      "Balancing physical comfort with active renewal and mindful movement",
    ],
    coreEnergy: {
      emoji: "🌿",
      title: "Your Core Energy",
      paragraphs: [
        "You naturally seek stability, comfort, security and something you can rely on.",
        "You may not be someone who wants to rush into everything. You often prefer to observe, understand the situation and then move when you feel ready.",
        "Once you make up your mind, however, you can be extremely difficult to move.",
        "You may have a strong sense of your own values and dislike being pressured into doing something that doesn't feel right to you.",
      ],
      challenge:
        "Your greatest strength is consistency.\n\nYour challenge can be becoming too comfortable, resistant to change or staying somewhere simply because it feels familiar.",
      quote: "«\"Security is important—but don't let comfort stop your growth.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You tend to do best when you can build something gradually and see tangible results.",
        "You may prefer stability over constant unpredictability and can have a natural ability to stay with something long enough for it to grow.",
        "You may be drawn toward areas involving finance, beauty, design, food, luxury, nature, property, creativity or building valuable resources, although your individual chart determines the specific direction.",
        "Your success often comes through patience rather than shortcuts.",
      ],
      lessonQuote:
        "You may not always be the fastest person in the room—but once you establish momentum, you can be incredibly persistent.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You generally don't want relationships that feel chaotic or unstable.",
        "You may take time to fully open up, but once you genuinely commit, you can be deeply loyal.",
        "You may also have strong expectations around how a partner treats you.",
      ],
      values: ["loyalty", "consistency", "physical affection", "trust", "emotional security"],
      questionOrLesson:
        "Because you value stability so much, one of your relationship lessons can be recognising the difference between:\n\n\"This feels safe\"\nand\n\"This is actually healthy for me.\"\n\nSometimes you may stay longer than necessary because letting go feels more uncomfortable than staying.\n\nYour personal chart can reveal much more about the kind of partner you attract, what you need emotionally and how your relationship patterns develop.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "Creating financial stability can be particularly important to you.",
        "You may enjoy having beautiful things, good food, comfort and a lifestyle that feels secure—but you may also have the ability to build wealth patiently when you have a clear goal.",
        "You tend to benefit from consistent accumulation rather than impulsive decisions.",
        "There can also be a strong connection between your sense of self-worth and your material security.",
      ],
      quote: "«\"My value is greater than what I own, earn or achieve.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You may appear calm, grounded and composed even when a lot is happening internally.",
        "You usually don't enjoy emotional chaos.",
        "You may need time to process your feelings rather than reacting immediately, and once emotionally attached, you can find it difficult to simply switch your feelings off.",
        "You may crave predictability, physical closeness and a peaceful environment when you're emotionally overwhelmed.",
        "But your emotional needs are unique. Your individual chart can reveal what actually makes you feel safe, loved and emotionally fulfilled.",
      ],
    },
    hiddenPotential: {
      emoji: "🌱",
      title: "Your Hidden Potential",
      paragraphs: [
        "One of your greatest gifts is the ability to turn something small into something lasting.",
        "You don't necessarily need dramatic beginnings.",
      ],
      buildSteps: [
        { label: "a career", pacing: "slowly" },
        { label: "wealth", pacing: "steadily" },
        { label: "relationships", pacing: "deeply" },
        { label: "a life", pacing: "intentionally" },
      ],
      conclusion: [
        "You have the potential to become someone who creates a life that feels stable, beautiful and genuinely yours.",
        "But life may periodically force you out of your comfort zone. Those moments can feel disruptive—but they can also prevent you from becoming stuck.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and what you truly need in love" },
      { emoji: "💼", text: "Your career direction and where your potential can develop" },
      { emoji: "💰", text: "Your financial patterns and relationship with security" },
      { emoji: "🌙", text: "Your emotional needs and inner world" },
      { emoji: "🔥", text: "How you pursue your goals and handle challenges" },
      { emoji: "🧿", text: "Recurring patterns and deeper life lessons" },
      { emoji: "⏳", text: "When important changes, opportunities and relationship themes become activated" },
    ],
  },

  Gemini: {
    sign: "Gemini",
    sanskritName: "Mithuna",
    ruler: "Mercury (Budha)",
    element: "Air",
    quality: "Mutable",
    glyph: "♊",
    iconPath: "/zodiac/gemini.svg",
    overview:
      "You are naturally curious, quick-witted, versatile and deeply engaged with ideas. Your mind thrives when learning, connecting and exploring new possibilities.",
    personalityTraits:
      "You connect easily with different kinds of people and bring agility, humor, and fresh perspective to every conversation.",
    lifePathGuidance:
      "Your biggest growth comes from turning scattered mental curiosity into committed depth and focused mastery.",
    strengths: [
      "Exceptional verbal and written communication abilities",
      "High cognitive adaptability and lightning-fast learning curve",
      "Engaging conversationalist who naturally builds social bridges",
      "Curious, open-minded approach to diverse philosophies",
    ],
    growthAreas: [
      "Guarding against mental exhaustion by incorporating grounding silent practices",
      "Following through on core endeavors before jumping to the next inspiring concept",
      "Trusting intuitive feeling as much as analytical rationalization",
    ],
    coreEnergy: {
      emoji: "🌬️",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally curious, mentally agile and energized by ideas, conversations and new experiences.",
        "You often feel best when your mind is engaged rather than stagnant. You may be someone who loves learning, asking questions, connecting diverse people and spotting angles others miss.",
        "You can have a natural gift for communication—whether speaking, writing, sharing knowledge or simply bringing lightness into a room.",
      ],
      challenge:
        "Your challenge? Your mind can move in so many directions at once that you may feel scattered, restless or easily bored when something requires prolonged repetition.",
      quote: "«\"Curiosity opens doors—but commitment builds the room you want to live in.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are unlikely to stay engaged in work that feels monotonous, rigid or mentally stifling.",
        "You may thrive where you can communicate, synthesize information, network, write, teach, trade or navigate fast-moving environments.",
        "There is often a natural adaptability in you: you can wear multiple hats with remarkable ease.",
        "Your real professional breakthrough happens when you choose one or two core domains to master deeply rather than staying at the surface of ten.",
      ],
      lessonQuote:
        "Your versatility is your superpower—when paired with patience, you become virtually unstoppable.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You need a partner who can meet you mentally as well as emotionally.",
        "If there is no intellectual stimulation, laughter or genuine dialogue, the connection can quickly lose its spark.",
      ],
      values: ["mental connection", "humor", "open dialogue", "shared curiosity", "emotional lightness"],
      questionOrLesson:
        "One of your deepest relationship lessons is moving from surface curiosity to authentic vulnerability:\n\n«\"Can I allow someone to know the quiet parts of me, not just the quick and clever parts?\"»\n\nWhen you find a partner who appreciates both your lively mind and your sensitive heart, intimacy becomes your safest anchor.",
    },
    moneySecurity: {
      title: "Money & Security",
      paragraphs: [
        "You may have the capacity to generate income from diverse channels or adaptable skills.",
        "Your natural instinct can be flexible and opportunistic, but you benefit immensely from establishing consistent financial habits and automated saving structures.",
        "When you channel your quick intellect into long-term financial planning, you create security without feeling restricted.",
      ],
      quote: "«\"Financial freedom comes from focused discipline, not endless multitasking.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You may instinctively rationalize or analyze your feelings before allowing yourself to actually feel them.",
        "When emotions become intense, your impulse might be to talk through them, distract yourself with information, or brush them off with humor.",
        "One of your most profound lessons is slowing down enough to sit in quiet reflection and give your heart the same attention you give your mind.",
        "Your personal birth chart reveals how your Moon and Mercury interact to shape your emotional balance.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare gift of the bridge-builder.",
        "You can translate complex ideas into clear language, bridge misunderstandings between different worlds, and breathe new life into stagnant situations.",
        "When you focus your brilliant mind onto a singular purposeful mission, you don't just share knowledge—you inspire transformation.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and what you truly need in love" },
      { emoji: "💼", text: "Your career direction and where your intellectual gifts thrive" },
      { emoji: "💰", text: "Your financial habits and creating sustainable stability" },
      { emoji: "🌙", text: "Your emotional needs and inner mental peace" },
      { emoji: "🔥", text: "How you handle decision-making and avoid overwhelm" },
      { emoji: "🧿", text: "Recurring life patterns and deeper karmic themes" },
      { emoji: "⏳", text: "When important planetary cycles and life shifts become active" },
    ],
  },

  Cancer: {
    sign: "Cancer",
    sanskritName: "Karka",
    ruler: "Moon (Chandra)",
    element: "Water",
    quality: "Cardinal",
    glyph: "♋",
    iconPath: "/zodiac/cancer.svg",
    overview:
      "Guided by the Moon, you possess profound intuitive intelligence, deep emotional empathy, and a natural instinct to protect and nurture what matters.",
    personalityTraits:
      "You sense the atmosphere in a room before anyone speaks. You form fierce, protective loyalties and value emotional safety above all else.",
    lifePathGuidance:
      "Your soul path is learning emotional self-sovereignty—holding space for others without absorbing their emotional burdens as your own.",
    strengths: [
      "Extraordinary intuition and empathic intelligence",
      "Protective, deeply loyal devotion to loved ones",
      "Tenacious inner resilience that withstands immense emotional tides",
      "Natural gift for creating emotional sanctuary and genuine warmth",
    ],
    growthAreas: [
      "Establishing healthy boundaries so you do not carry everyone else's emotional weight",
      "Expressing needs directly instead of retreating into self-protective silence",
      "Releasing past hurts to allow new chapters to unfold naturally",
    ],
    coreEnergy: {
      emoji: "🌊",
      title: "Your Core Energy",
      paragraphs: [
        "You are deeply intuitive, emotionally perceptive and naturally protective.",
        "You feel life with extraordinary depth. You often sense subtle shifts in moods, unspoken tensions and emotional truths long before others notice them.",
        "You have a strong instinct to care for, protect and build a safe sanctuary for the people and values you love.",
      ],
      challenge:
        "Your challenge? Because you feel so deeply, you can easily absorb the emotions of others, take things personally or retreat into your protective shell when hurt.",
      quote: "«\"Sensitivity is your greatest power—when paired with strong emotional boundaries.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You need a sense of emotional meaning and human connection in what you do.",
        "You are exceptionally tenacious once committed; like the crab, you do not let go of what you set your heart on.",
        "You excel in roles involving leadership, guidance, psychology, hospitality, healthcare, creative arts, real estate or creating systems that genuinely care for people.",
        "Your career reaches peak fulfillment when you lead with both emotional intelligence and unwavering professional boundaries.",
      ],
      lessonQuote:
        "Your true authority comes from your ability to understand human nature at the root.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "Love is never casual for you; you crave deep emotional safety, mutual loyalty and unwavering devotion.",
        "You may take time to reveal your softest vulnerabilities, observing whether someone is safe before letting down your defenses.",
      ],
      values: ["emotional safety", "unconditional loyalty", "tenderness", "shared history", "protective devotion"],
      questionOrLesson:
        "A central lesson in your relationships is learning to ask for what you need clearly:\n\n«\"Can I speak my needs openly instead of expecting my partner to read my silence?\"»\n\nWhen you express your heart directly, you create the genuine security you've always yearned for.",
    },
    moneySecurity: {
      title: "Money & Security",
      paragraphs: [
        "Financial security is closely tied to your emotional peace of mind.",
        "You naturally possess cautious, protective financial instincts and an instinct to build a solid nest egg for the future.",
        "Your financial growth flourishes when you balance cautious saving with confident investment in your own long-term potential.",
      ],
      quote: "«\"True abundance begins when you trust your ability to sustain and provide.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "Your emotions move in cycles, much like the Moon that guides your sign.",
        "Honoring your quiet days without guilt is essential for your vitality.",
        "When emotionally overwhelmed, you need physical sanctuary, quiet time near water or nature, and comfort from trusted loved ones.",
        "Your individual birth chart reveals how your Moon's placement guides your intuitive compass.",
      ],
    },
    hiddenPotential: {
      emoji: "🌱",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare power of the emotional alchemist.",
        "You can endure emotional storms that would break others and emerge with profound wisdom, compassion and fierce resilience.",
        "When you step into your full emotional authority, your presence becomes an unshakeable haven for yourself and everyone you touch.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and what you truly need in love" },
      { emoji: "💼", text: "Your career direction and where your intuitive gifts excel" },
      { emoji: "💰", text: "Your relationship with financial security and home stability" },
      { emoji: "🌙", text: "Your emotional rhythms and lunar sensitivities" },
      { emoji: "🔥", text: "How you handle conflict without retreating" },
      { emoji: "🧿", text: "Ancestral patterns and karmic family themes" },
      { emoji: "⏳", text: "When major life transitions and relationship cycles unfold" },
    ],
  },

  Leo: {
    sign: "Leo",
    sanskritName: "Simha",
    ruler: "Sun (Surya)",
    element: "Fire",
    quality: "Fixed",
    glyph: "♌",
    iconPath: "/zodiac/leo.svg",
    overview:
      "Ruled by the Sun, you radiate warmth, dignity, creative leadership, and natural charisma. You are here to lead with heart and inspire others.",
    personalityTraits:
      "You carry a noble, generous spirit. You want to make a meaningful mark, live authentically, and be appreciated for your genuine gifts.",
    lifePathGuidance:
      "Your soul path is moving from needing external validation to embodying quiet, self-sovereign inner radiance.",
    strengths: [
      "Natural executive presence and magnetic warmth",
      "Magnanimous generosity and fiercely loyal heart",
      "Creative self-expression and courageous vision",
      "Uplifting leader who inspires excellence in others",
    ],
    growthAreas: [
      "Allowing vulnerability without fearing loss of dignity or status",
      "Sharing the spotlight and recognizing silent contributions",
      "Grounding self-worth in internal integrity rather than external praise",
    ],
    coreEnergy: {
      emoji: "☀️",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally charismatic, warm-hearted, dignified and creatively expressive.",
        "Ruled by the Sun, the source of light and vitality, you carry an innate desire to live authentically, create something meaningful and stand tall in your truth.",
        "You have a generous spirit and a natural leadership aura—people instinctively feel your warmth and presence.",
      ],
      challenge:
        "Your challenge? A sensitive pride. You can feel deeply wounded by disrespect, lack of recognition or being taken for granted, sometimes masking hurt with stubbornness.",
      quote: "«\"True royalty doesn't demand the crown; it leads by lifting others into their own light.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are not built to remain hidden in the background or work under micro-managing oversight.",
        "You thrive when you have creative autonomy, visibility, leadership authority, or the freedom to spearhead meaningful initiatives.",
        "You excel in entrepreneurship, management, public speaking, arts, creative direction, luxury, politics or any field where vision and heart align.",
        "Your success compounds exponentially when you transition from proving yourself to serving a higher mission.",
      ],
      lessonQuote:
        "When your ambition is powered by genuine service, your influence becomes timeless.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "In love, you love with your entire heart—generously, passionately, and with royal devotion.",
        "You need a partner who genuinely admires, respects and celebrates who you are, without competing with your light.",
      ],
      values: ["mutual admiration", "unshakable respect", "romantic passion", "loyalty", "playful joy"],
      questionOrLesson:
        "Your greatest relationship growth comes from opening the private door to your vulnerability:\n\n«\"Can I let my partner see my doubts and fears without feeling that my strength is compromised?\"»\n\nWhen you allow yourself to be seen in your softness, love becomes your deepest sanctuary.",
    },
    moneySecurity: {
      title: "Money & Security",
      paragraphs: [
        "You enjoy living well and sharing generously with those you love.",
        "Your natural instinct can be to spend on quality, beauty and memorable experiences, but you also have a strong drive to build financial independence.",
        "Your wealth expands sustainably when you align your financial choices with long-term legacy rather than short-term prestige.",
      ],
      quote: "«\"True prosperity is having both the freedom to enjoy life and the stability to sustain it.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You often feel you must stay strong, composed and radiant for everyone around you.",
        "Because of your pride, you rarely show when you are feeling hurt or overlooked.",
        "Giving yourself permission to rest, drop the armor, and be comforted without expectation is vital for your emotional renewal.",
        "Your individual birth chart reveals how your solar vitality and lunar heart balance each other.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the sovereign heart.",
        "You can ignite courage in discouraged hearts, inspire teams to achieve the impossible, and lead with unmatched nobility.",
        "When your inner light is anchored in humility and love, your impact reverberates far beyond your immediate sphere.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and what your heart truly desires in love" },
      { emoji: "💼", text: "Your career calling and where your leadership shines brightest" },
      { emoji: "💰", text: "Your wealth potential and building enduring material legacy" },
      { emoji: "🌙", text: "Your emotional inner life and releasing the need to always be strong" },
      { emoji: "🔥", text: "How you express creative vision and navigate competitive dynamics" },
      { emoji: "🧿", text: "Karmic lessons surrounding ego, dignity, and authentic self-expression" },
      { emoji: "⏳", text: "Key planetary timeframes when your visibility and opportunities peak" },
    ],
  },

  Virgo: {
    sign: "Virgo",
    sanskritName: "Kanya",
    ruler: "Mercury (Budha)",
    element: "Earth",
    quality: "Mutable",
    glyph: "♍",
    iconPath: "/zodiac/virgo.svg",
    overview:
      "You are observant, analytical, thoughtful and deeply dedicated to excellence. You possess a sacred eye for refinement, healing, and practical mastery.",
    personalityTraits:
      "You bring order where there is chaos, notice details others miss, and show love through quiet, dependable service.",
    lifePathGuidance:
      "Your life lesson is shifting from critical perfectionism to compassionate acceptance of life's natural imperfections.",
    strengths: [
      "Extraordinary analytical precision and problem-solving mastery",
      "Deeply dependable, conscientious work ethic and practical wisdom",
      "Natural healing and rejuvenating intelligence",
      "Thoughtful discernment that separates lasting value from transient noise",
    ],
    growthAreas: [
      "Softening the internal critic and celebrating incremental progress",
      "Delegating responsibilities instead of shouldering every burden alone",
      "Allowing room for spontaneous ease without constant overthinking",
    ],
    coreEnergy: {
      emoji: "🌾",
      title: "Your Core Energy",
      paragraphs: [
        "You are thoughtful, observant, conscientious and driven by a quiet desire to make things better.",
        "You notice what works, what doesn't, and what can be improved. You have a natural gift for refinement, organization and seeing the practical reality behind ideals.",
        "You express care not through loud words, but through helpfulness, competence and showing up reliably.",
      ],
      challenge:
        "Your challenge? An overactive internal critic. You can easily become overly self-critical, worry about the future, or feel overwhelmed by an endless mental checklist.",
      quote: "«\"Excellence is an art—perfectionism is a prison. Learn to honor how far you've already come.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You do your best work when you have a clear purpose, intellectual autonomy and the ability to solve tangible problems.",
        "You excel in analysis, research, healthcare, engineering, editing, advisory roles, systems architecture, wellness, law, and specialized crafts.",
        "You are often the backbone of any organization because your work is thorough and trustworthy.",
        "Your career leaps to new heights when you recognize your own expertise and step into leadership rather than staying solely in support roles.",
      ],
      lessonQuote:
        "Your precision is rare—when you trust your own authority, leaders seek your counsel.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You don't need grand dramatic gestures; you value consistency, emotional maturity, mutual consideration and honesty.",
        "You show devotion by remembering the little things, fixing problems and quietly supporting your partner's life.",
      ],
      values: ["consistency", "clean communication", "mutual respect", "practical support", "emotional integrity"],
      questionOrLesson:
        "A transformative relationship lesson is allowing relationships to be imperfect:\n\n«\"Can I accept my partner—and myself—in our humanness without trying to fix everything?\"»\n\nWhen you trade perfectionism for presence, deep emotional intimacy naturally blossoms.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "You are naturally prudent, practical, and analytical with resources.",
        "You prefer having a well-thought-out plan, calculating risks, and building steady emergency reserves.",
        "Your financial growth accelerates when you allow yourself to enjoy the fruits of your labor rather than worrying about hypotheticals.",
      ],
      quote: "«\"Real financial peace is knowing that your resourcefulness will handle whatever tomorrow brings.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "When emotions become intense, your instinct may be to analyze the feeling rather than simply experiencing it.",
        "Your nervous system is finely tuned; mental overstimulation can manifest as physical fatigue or digestive sensitivity.",
        "Grounding practices—such as walking in nature, quiet meditation, and regular daily rhythms—are essential medicine for your peace.",
        "Your individual birth chart reveals how Mercury and your Moon coordinate your mental and emotional wellbeing.",
      ],
    },
    hiddenPotential: {
      emoji: "🌱",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare power of the sacred architect.",
        "You can take disorder and turn it into harmony, see the root cause of complex ailments, and build systems that stand the test of time.",
        "When you temper your keen discernment with unconditional self-compassion, your quiet mastery becomes an anchor for all who know you.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship dynamics and finding lasting emotional compatibility" },
      { emoji: "💼", text: "Your professional path and where your analytical mastery yields highest rewards" },
      { emoji: "💰", text: "Your financial psychology and turning prudent planning into real wealth" },
      { emoji: "🌙", text: "Your emotional nervous system and cultivating inner serenity" },
      { emoji: "🔥", text: "Overcoming self-doubt and stepping into confident authority" },
      { emoji: "🧿", text: "Karmic lessons surrounding service, boundaries, and self-acceptance" },
      { emoji: "⏳", text: "Critical planetary timings for career advancement and personal breakthroughs" },
    ],
  },

  Libra: {
    sign: "Libra",
    sanskritName: "Tula",
    ruler: "Venus (Shukra)",
    element: "Air",
    quality: "Cardinal",
    glyph: "♎",
    iconPath: "/zodiac/libra.svg",
    overview:
      "Guided by Venus, you embody grace, diplomatic intelligence, aesthetic refinement, and a deep commitment to harmony, fairness, and mutual partnership.",
    personalityTraits:
      "You have an innate talent for understanding differing perspectives, creating visual and relational beauty, and diffusing friction with charm.",
    lifePathGuidance:
      "Your soul path is moving from superficial people-pleasing to courageous, authentic self-assertion and balanced partnership.",
    strengths: [
      "Natural diplomatic charm and conflict mediation skills",
      "Sophisticated aesthetic eye for design, proportion, and grace",
      "Fair-minded intellect that weighs all sides with objective justice",
      "Warm, engaging relational intelligence that builds lasting alliances",
    ],
    growthAreas: [
      "Making decisive choices without getting paralyzed by weighing options endlessly",
      "Speaking uncomfortable truths rather than keeping a false peace",
      "Cultivating strong internal self-validation independent of others' opinions",
    ],
    coreEnergy: {
      emoji: "⚖️",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally diplomatic, fair-minded, charming and oriented toward harmony, beauty and partnership.",
        "You instinctively look for balance. You notice when an environment feels harsh, when a situation is unfair, or when two people are talking past each other.",
        "You possess refined social grace and aesthetic sensitivity—you appreciate elegance, art, thoughtful dialogue and gracious conduct.",
      ],
      challenge:
        "Your challenge? Indecision and people-pleasing. In trying to avoid conflict or keep everyone comfortable, you can hesitate to take a firm stand or suppress your own real preferences.",
      quote: "«\"Real peace is not the absence of disagreement—it is the presence of honesty and mutual respect.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You flourish in environments that are civilized, collaborative, mentally stimulating and visually pleasing.",
        "You excel in law, negotiation, public relations, design, architecture, arts, mediation, partnerships, consulting, and diplomacy.",
        "You have a natural ability to build alliances, read negotiations, and bring opposing factions to an agreeable middle ground.",
        "Your career surges when you combine your diplomatic charm with sharp, decisive leadership.",
      ],
      lessonQuote:
        "When you stand firmly behind your own decisions, your fairness commands universal respect.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "Partnership is central to your world. You don't just want love; you want a true equal, a shared journey, and a dynamic rooted in mutual respect.",
        "You bring romance, elegance, and deep thoughtfulness to the relationships you cherish.",
      ],
      values: ["mutual equality", "romantic grace", "honest dialogue", "shared aesthetics", "peaceful partnership"],
      questionOrLesson:
        "Your most profound relationship lesson is maintaining your self-sovereignty inside love:\n\n«\"Can I speak my truth and set boundaries without fearing that disagreement will break the connection?\"»\n\nWhen you stop compromising your core values for harmony, your relationships become genuinely unshakable.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "You appreciate financial stability because it allows you to cultivate an elegant, comfortable, and well-curated life.",
        "You are drawn to quality and beautiful surroundings, but you also have a sharp mind for equitable business deals and collaborative wealth-building.",
        "Your wealth expands when you partner strategically and balance generous aesthetic tastes with disciplined investing.",
      ],
      quote: "«\"Abundance thrives when balance is maintained between enjoying today and securing tomorrow.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You naturally prefer emotional equilibrium and can feel jarred by harsh words, chaos or prolonged hostility.",
        "Sometimes you smooth over internal conflicts with a smile, pretending everything is fine when your heart is unsettled.",
        "Giving yourself permission to feel anger, disappointment and grief openly is how you cultivate authentic emotional power.",
        "Your individual birth chart reveals how Venus and your Moon harmonize your emotional needs.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the conscious peacemaker.",
        "You can turn hostility into collaboration, elevate ordinary spaces into works of art, and bring true equity where inequality once ruled.",
        "When your desire for harmony is anchored in unshakable inner truth, you become a powerful force for justice and lasting beauty.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship blueprint and finding a truly aligned life partner" },
      { emoji: "💼", text: "Your professional trajectory and maximizing collaborative success" },
      { emoji: "💰", text: "Your financial growth through strategic alliances and prudent investments" },
      { emoji: "🌙", text: "Your emotional world and overcoming subconscious people-pleasing" },
      { emoji: "🔥", text: "Cultivating decisive confidence in moments of high-stakes crossroads" },
      { emoji: "🧿", text: "Karmic partnership patterns and soul-contract themes" },
      { emoji: "⏳", text: "Timing of major relationship chapters, marriage, and career milestones" },
    ],
  },

  Scorpio: {
    sign: "Scorpio",
    sanskritName: "Vrischika",
    ruler: "Mars & Ketu (Mangal & Ketu)",
    element: "Water",
    quality: "Fixed",
    glyph: "♏",
    iconPath: "/zodiac/scorpio.svg",
    overview:
      "Deep, penetrating, fiercely loyal and spiritually transformative. You possess unmatched psychological insight, unwavering focus, and magnetic resilience.",
    personalityTraits:
      "You see beneath surfaces instantly. You protect your vulnerabilities fiercely, love with absolute depth, and hold power in your stillness.",
    lifePathGuidance:
      "Your life journey is the path of the Phoenix—learning to surrender control and trusting that every ending is an initiation into higher power.",
    strengths: [
      "Unflinching courage in facing life's deepest truths and crises",
      "Profound psychological intuition and ability to read hidden motives",
      "Fierce, unwavering loyalty and protective power for loved ones",
      "Extraordinary capacity for self-reinvention and resilient regeneration",
    ],
    growthAreas: [
      "Releasing past betrayals and letting go of defensive resentment",
      "Trusting open vulnerability rather than holding onto psychological control",
      "Allowing situations to unfold organically without preemptive suspicion",
    ],
    coreEnergy: {
      emoji: "🦂",
      title: "Your Core Energy",
      paragraphs: [
        "You are intensely perceptive, emotionally profound, private and magnetically resilient.",
        "You do not navigate life on the surface. You instinctively read between the lines, sense hidden motives, and perceive what is left unsaid.",
        "You possess immense inner strength—when life brings crises or radical changes, you do not crumble; you endure, adapt, and transform.",
      ],
      challenge:
        "Your challenge? Trust and control. Because you feel so deeply and remember every wound, you can build impenetrable emotional fortresses, harbor suspicion, or struggle to let go.",
      quote: "«\"True power is not holding on to control; it is trusting your ability to rise after whatever falls away.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are drawn to work that requires depth, strategy, investigative intellect and real substance.",
        "You thrive in psychology, medicine, surgery, finance, investigative research, crisis management, occult/astrology, strategy, and transformative leadership.",
        "You have exceptional focus and tenacity: once you commit to a mission, you work quietly in the dark until victory is secured.",
        "Your greatest career achievements occur when you use your strategic depth to solve problems others are afraid to touch.",
      ],
      lessonQuote:
        "Your silence is your strategic advantage—when you move, you move with decisive precision.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "For you, love is a sacred, all-or-nothing union. Casual connections do not interest your soul.",
        "You demand absolute honesty, emotional transparency, and unbreakable loyalty. In return, you offer fierce devotion that endures through every storm.",
      ],
      values: ["absolute loyalty", "emotional depth", "unwavering honesty", "mutual protection", "soul-level intimacy"],
      questionOrLesson:
        "Your deepest relationship test is learning the courage of vulnerability:\n\n«\"Can I lower my armor and let myself be truly seen without fearing that love will be used against me?\"»\n\nWhen you dare to trust the right partner, love becomes your most profound vehicle of healing.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "You have sharp financial instincts and a natural understanding of shared resources, investments, and wealth regeneration.",
        "You keep your financial affairs private and strategic, preferring to build quiet independence rather than ostentatious display.",
        "Your wealth expands when you channel your natural discipline into long-term compounding and transformative ventures.",
      ],
      quote: "«\"Real wealth is self-sufficiency and the wisdom to turn adversity into asset.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "Beneath your composed, enigmatic exterior lies an ocean of deep emotional currents.",
        "You process feelings internally, rarely letting the world see your pain until you have fully metabolized it.",
        "Learning to release emotional toxins—forgiving without forgetting—is essential for your vitality and mental lightness.",
        "Your individual birth chart reveals how Mars, Ketu, and your Moon navigate your emotional rebirths.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the Phoenix.",
        "No matter what challenges, betrayals, or upheavals you encounter, you possess an uncanny ability to burn down the obsolete and rise stronger, wiser, and more radiant.",
        "When you channel your immense intensity into healing and purposeful creation, you become an unstoppable catalyst for transformation.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your deep relationship karma and finding genuine soul-aligned trust" },
      { emoji: "💼", text: "Your career destiny and leveraging your investigative and strategic power" },
      { emoji: "💰", text: "Your financial transformation cycles and wealth regeneration" },
      { emoji: "🌙", text: "Your emotional underworld and releasing subconscious self-protective walls" },
      { emoji: "🔥", text: "Mastering your personal power without fear of loss or betrayal" },
      { emoji: "🧿", text: "Karmic initiations, ancestral patterns, and occult sensitivities" },
      { emoji: "⏳", text: "Timing of major evolutionary rebirths and planetary milestones" },
    ],
  },

  Sagittarius: {
    sign: "Sagittarius",
    sanskritName: "Dhanu",
    ruler: "Jupiter (Guru)",
    element: "Fire",
    quality: "Mutable",
    glyph: "♐",
    iconPath: "/zodiac/sagittarius.svg",
    overview:
      "Guided by Jupiter, the great teacher and expander, you embody optimism, philosophical vision, thirst for freedom, and an infectious love for truth.",
    personalityTraits:
      "You inspire others with broad horizons, natural humor, and candid honesty. You are a seeker of meaning, wisdom, and expansive adventures.",
    lifePathGuidance:
      "Your soul path is turning grand philosophical ideals into grounded, practical application and enduring commitments.",
    strengths: [
      "Unquenchable optimism and infectious inspiring presence",
      "Broad philosophical vision that sees the big picture effortlessly",
      "Fearless seeker of higher truth, wisdom, and cross-cultural knowledge",
      "Honest, direct, and generous spirit that elevates those around you",
    ],
    growthAreas: [
      "Staying committed when initial excitement wanes into routine discipline",
      "Tempering blunt honesty with empathetic consideration for sensitive hearts",
      "Balancing the urge for freedom with honoring daily responsibilities",
    ],
    coreEnergy: {
      emoji: "🏹",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally optimistic, freedom-loving, philosophical and drawn to broad horizons.",
        "Guided by Jupiter, the planet of wisdom and expansion, you live life with an appetite for meaning. You are not meant for small, confined boxes or repetitive routines.",
        "You want to explore—whether through travel, philosophy, spirituality, big projects or pursuing ideas that expand human consciousness.",
      ],
      challenge:
        "Your challenge? Restlessness and follow-through. You can fall in love with the vision of a project or life chapter, but feel impatient or constricted when it requires mundane maintenance.",
      quote: "«\"Freedom is not running from commitment—it is choosing the mission worth committing your freedom to.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are unlikely to stay engaged in jobs where you are micromanaged or cannot see the larger purpose.",
        "You excel in teaching, higher education, law, publishing, international business, advisory roles, travel, philosophy, spirituality, and visionary leadership.",
        "You have a natural ability to inspire teams, cast inspiring visions, and see opportunities where others see dead ends.",
        "Your career reaches peak fruition when you anchor your big visions with steady, consistent execution.",
      ],
      lessonQuote:
        "The world is full of dreamers—when you ground your wisdom in daily action, you lead empires.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You need a partner who is your friend, fellow explorer, and intellectual companion.",
        "If a relationship feels like a cage or tries to clip your wings, you will instinctively look for the door.",
      ],
      values: ["mutual freedom", "shared adventures", "intellectual expansion", "unfiltered honesty", "laughter"],
      questionOrLesson:
        "Your greatest relationship lesson is understanding that commitment can expand your life rather than diminish it:\n\n«\"Can I build a shared life with someone without fearing that my personal adventure is ending?\"»\n\nWhen you find a partner who travels beside you as an equal, love becomes your greatest expedition.",
    },
    moneySecurity: {
      title: "Money & Security",
      paragraphs: [
        "You have an inherently generous, optimistic relationship with money, trusting that opportunities will always arrive.",
        "While this faith often attracts abundance, your financial success thrives when you establish disciplined saving habits and protect against impulsive spending.",
        "When you channel Jupiter's expansive energy into structured investments, wealth grows effortlessly.",
      ],
      quote: "«\"True prosperity is knowing how to generate abundance while maintaining the wisdom to preserve it.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You tend to respond to emotional difficulties by looking for the silver lining, the lesson, or the next horizon.",
        "While your optimism is a superpower, you sometimes bypass your heavier feelings by moving forward too fast.",
        "Allowing yourself to experience grief, sadness or fatigue without immediately trying to philosophize it away brings deep emotional maturity.",
        "Your individual birth chart reveals how Jupiter and your Moon calibrate your emotional faith.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the visionary guide.",
        "You can lift people out of despair by showing them what is possible, articulate timeless truths that heal confusion, and lead with contagious courage.",
        "When you unite your expansive vision with grounded discipline, your journey becomes a beacon of light for countless others.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and finding love that honors your freedom" },
      { emoji: "💼", text: "Your career calling and translating broad vision into tangible authority" },
      { emoji: "💰", text: "Your financial expansion and creating enduring material prosperity" },
      { emoji: "🌙", text: "Your inner philosophical world and true emotional grounding" },
      { emoji: "🔥", text: "Navigating restlessness and mastering sustained follow-through" },
      { emoji: "🧿", text: "Dharmic life purpose, higher wisdom, and ancestral blessings" },
      { emoji: "⏳", text: "Timing of major Jupiterian expansions, travel, and career breakthroughs" },
    ],
  },

  Capricorn: {
    sign: "Capricorn",
    sanskritName: "Makara",
    ruler: "Saturn (Shani)",
    element: "Earth",
    quality: "Cardinal",
    glyph: "♑",
    iconPath: "/zodiac/capricorn.svg",
    overview:
      "Ruled by Saturn, you embody discipline, strategic patience, deep responsibility, and an unshakeable drive to build enduring legacy.",
    personalityTraits:
      "You mature gracefully, often carrying heavy responsibilities early in life. You are practical, dignified, reliable, and respect what is earned.",
    lifePathGuidance:
      "Your life path is one of the mountain climber—your greatest power, happiness, and recognition blossom in the second half of life.",
    strengths: [
      "Exceptional discipline, perseverance, and emotional self-control",
      "Natural executive authority and architectural strategic mind",
      "Dependable integrity that honors promises under pressure",
      "Patience to build lasting structures that outlive transient trends",
    ],
    growthAreas: [
      "Allowing yourself to rest and play without feeling guilty or unproductive",
      "Expressing affection and warmth openly rather than solely through duty",
      "Releasing unnecessary burdens that are not yours to carry",
    ],
    coreEnergy: {
      emoji: "🏔️",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally ambitious, disciplined, responsible, pragmatic and driven to build something that lasts.",
        "Guided by Saturn, the master of time and karma, you understand that anything of genuine value requires patience, structure and consistent effort.",
        "You often feel older than your years, having shouldered significant responsibilities early in life. You do not look for shortcuts; you respect what is earned through authentic mastery.",
      ],
      challenge:
        "Your challenge? Self-imposed pressure. You can easily become overly self-reliant, expect too much of yourself, or equate your personal self-worth solely with productivity and achievement.",
      quote: "«\"You are not loved only for what you build—you are worthy simply for who you are.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You are built for the long game. You thrive in environments where competency, merit, and steady perseverance yield tangible results.",
        "You excel in corporate leadership, entrepreneurship, governance, finance, engineering, law, architecture, and building institutions.",
        "While your youth may test you with delays and heavy burdens, your trajectory is steadily upward: you bloom with extraordinary authority as you mature.",
        "Your peak success arrives when you pair your unmatched work ethic with conscious delegation and strategic vision.",
      ],
      lessonQuote:
        "While others burn out chasing quick wins, your patient craftsmanship builds an empire that lasts.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "You do not give your heart away easily; trust is earned through consistent actions, mutual respect, and emotional maturity.",
        "You show love through loyalty, practical support, protection, and showing up when it truly matters.",
      ],
      values: ["unwavering loyalty", "emotional maturity", "mutual respect", "shared life goals", "dependability"],
      questionOrLesson:
        "Your most profound relationship lesson is opening your heart to receiving care:\n\n«\"Can I let my partner hold space for me when I am tired, without feeling that I have failed my duty?\"»\n\nWhen you allow yourself to be supported, your partnerships become deeply comforting and enduring.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "Financial security and autonomy are foundational to your peace of mind.",
        "You have natural financial wisdom, disciplined budgeting instincts, and the patience to compound wealth over decades.",
        "Your financial masterstroke comes from knowing when to shift from cautious conservation to confident, calculated investments.",
      ],
      quote: "«\"True wealth is not just accumulating resources; it is having the peace of mind to enjoy what you have built.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You have learned to keep your composure, even under intense pressure, often managing crises without letting anyone see your strain.",
        "However, holding everything inside can lead to emotional exhaustion or physical stiffness.",
        "Cultivating hobbies with no productivity goal—music, humor, unstructured downtime—is essential medicine for your spirit.",
        "Your individual birth chart reveals how Saturn and your Moon balance duty with emotional tenderness.",
      ],
    },
    hiddenPotential: {
      emoji: "🌱",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the legacy builder.",
        "You can turn adversity into authority, endure storms that topple weaker structures, and build institutions that shelter generations.",
        "As time passes, your wisdom deepens into warm, benevolent leadership that commands universal reverence.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your relationship patterns and finding an equal who honors your depth" },
      { emoji: "💼", text: "Your career mountain and activating your highest executive authority" },
      { emoji: "💰", text: "Your long-term financial compounding and wealth security" },
      { emoji: "🌙", text: "Your inner emotional release and letting down the armor of duty" },
      { emoji: "🔥", text: "Navigating Saturn's karmic delays and reaping your rightful rewards" },
      { emoji: "🧿", text: "Generational karma, structural responsibility, and legacy creation" },
      { emoji: "⏳", text: "Key Saturnian milestone years when your greatest achievements culminate" },
    ],
  },

  Aquarius: {
    sign: "Aquarius",
    sanskritName: "Kumbha",
    ruler: "Saturn & Rahu (Shani & Rahu)",
    element: "Air",
    quality: "Fixed",
    glyph: "♒",
    iconPath: "/zodiac/aquarius.svg",
    overview:
      "Visionary, unconventional, humanitarian and fiercely independent. You see into the future, question outdated rules, and walk your own path.",
    personalityTraits:
      "You have an original mind that values equality, intellectual freedom, and progressive change. You care deeply about the collective while cherishing individuality.",
    lifePathGuidance:
      "Your soul path is bridging your brilliant intellectual detachment with warm, heart-centered intimacy.",
    strengths: [
      "Visionary, inventive thinking that anticipates future trends",
      "Fierce intellectual integrity and commitment to truth and fairness",
      "Humanitarian compassion and dedication to collective progress",
      "Authentic individuality that fearlessly stands outside conformity",
    ],
    growthAreas: [
      "Cultivating emotional vulnerability instead of retreating into intellectual detachment",
      "Allowing close personal intimacy alongside collective causes",
      "Accepting human flaws and emotional messy realities in those you love",
    ],
    coreEnergy: {
      emoji: "⚡",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally visionary, progressive, original, independent and oriented toward the future.",
        "Guided by Saturn and Rahu, you possess a unique mind that questions outdated conventions, spots societal patterns, and envisions how things could be improved.",
        "You value intellectual freedom above all else and refuse to conform simply because 'that's how it's always been done.'",
      ],
      challenge:
        "Your challenge? Emotional detachment. When situations become emotionally messy or demanding, your instinct may be to retreat into your intellect or observe from a cool distance.",
      quote: "«\"You don't have to choose between your unique individuality and deep human connection—you can live both.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You cannot thrive in micro-managed environments or organizations bound by rigid traditionalism.",
        "You excel in technology, science, innovation, research, social reform, media, astrology, community leadership, and pioneering ventures.",
        "You have a natural gift for understanding groups, networks, and emerging systems before they become mainstream.",
        "Your career breaks open when you turn your radical insights into collaborative solutions that solve real human challenges.",
      ],
      lessonQuote:
        "You are wired for what is coming next—trust your unconventional vision.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "For you, genuine friendship is the foundation of enduring love.",
        "You need a partner who respects your intellectual independence, gives you space to breathe, and shares your core ideals.",
      ],
      values: ["intellectual equality", "spacious freedom", "authentic friendship", "unconventional honesty", "shared vision"],
      questionOrLesson:
        "Your most profound relationship lesson is opening the doorway from mental camaraderie to raw emotional vulnerability:\n\n«\"Can I let someone touch my heart without fearing that my freedom will be compromised?\"»\n\nWhen you risk true intimacy, you discover that real love expands your freedom rather than confining it.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "Your relationship with money is often unconventional: you view wealth as a vehicle for autonomy and progressive freedom rather than mere status.",
        "You can spot innovative opportunities, technological shifts, and unconventional income avenues.",
        "Your financial security solidifies when you balance cutting-edge innovations with Saturn's disciplined long-term structures.",
      ],
      quote: "«\"Real financial sovereignty is having the resources to live completely on your own terms.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "You often observe your emotions as if looking through a telescope, analyzing feelings with objective curiosity.",
        "While this detachment protects you from drama, it can leave loved ones feeling held at an arm's distance.",
        "Allowing yourself to feel your private emotions in your body—without analyzing them—is the doorway to your deepest spiritual peace.",
        "Your individual birth chart reveals how Saturn, Rahu, and your Moon weave your unique internal tapestry.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the revolutionary visionary.",
        "You can dismantle obsolete paradigms, pioneer breakthroughs that help humanity, and inspire communities to unite around a higher ideal.",
        "When your brilliant mind is ignited by warmth and love, your ideas can genuinely alter the course of lives.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your unique relationship blueprint and finding a partner who truly gets you" },
      { emoji: "💼", text: "Your innovative career path and leading future-facing movements" },
      { emoji: "💰", text: "Your financial potential through unconventional and innovative channels" },
      { emoji: "🌙", text: "Your emotional world and bridging detachment with profound intimacy" },
      { emoji: "🔥", text: "Channeling rebellious independence into purposeful, lasting creation" },
      { emoji: "🧿", text: "Karmic connections with communities, networks, and global missions" },
      { emoji: "⏳", text: "Planetary activations for major career leaps and evolutionary shifts" },
    ],
  },

  Pisces: {
    sign: "Pisces",
    sanskritName: "Meena",
    ruler: "Jupiter (Guru)",
    element: "Water",
    quality: "Mutable",
    glyph: "♓",
    iconPath: "/zodiac/pisces.svg",
    overview:
      "Guided by Jupiter, you embody boundless imagination, profound empathy, mystic intuition, and an innate connection to the unseen spiritual dimensions.",
    personalityTraits:
      "You are gentle, poetic, and deeply perceptive. You absorb subtle energies and navigate life through emotional resonance, creativity, and faith.",
    lifePathGuidance:
      "Your life lesson is establishing firm practical boundaries so your boundless compassion remains an empowering gift rather than a source of depletion.",
    strengths: [
      "Extraordinary spiritual intuition and psychic sensitivity",
      "Boundless empathy and non-judgmental compassion for all beings",
      "Rich creative imagination, artistic flair, and poetic resonance",
      "Natural wisdom that effortlessly understands universal truths",
    ],
    growthAreas: [
      "Setting firm boundaries and learning to say 'no' without lingering guilt",
      "Grounding ethereal dreams into daily practical action and tangible structures",
      "Avoiding emotional escapism when reality feels harsh or demanding",
    ],
    coreEnergy: {
      emoji: "🌊",
      title: "Your Core Energy",
      paragraphs: [
        "You are naturally intuitive, imaginative, compassionate, gentle and spiritually receptive.",
        "Guided by Jupiter, the planet of higher grace, you experience life through emotional resonance and subtle currents. You perceive what people feel, what spaces carry, and what remains unspoken.",
        "You have a poetic soul and an organic capacity for empathy—you can understand people that others dismiss, finding compassion where others see only faults.",
      ],
      challenge:
        "Your challenge? Boundaries and escapism. Because the boundary between your energy and the world is so permeable, you can easily become exhausted, take on others' sorrow, or want to retreat when reality feels too harsh.",
      quote: "«\"Compassion without boundaries is self-destruction. Protect your energy so your light can truly shine.\"»",
    },
    careerSuccess: {
      title: "Career & Success",
      paragraphs: [
        "You need a career that connects to meaning, creativity, healing, or spiritual purpose.",
        "You excel in artistic endeavors, film, music, psychology, holistic healing, counseling, spirituality, non-profit missions, writing, and advisory roles.",
        "You have a natural ability to tap into collective emotions and channel beauty that touches people deeply.",
        "Your success flourishes when you pair your boundless imagination with a disciplined practical routine.",
      ],
      lessonQuote:
        "Your dreams are not unrealistic—they simply require practical legs to walk on the earth.",
    },
    loveRelationships: {
      title: "Love & Relationships",
      paragraphs: [
        "In love, you seek a soul-level connection—a sacred union of heart, spirit, and unspoken understanding.",
        "You love with tender devotion, often willing to give endlessly to the person you cherish.",
      ],
      values: ["spiritual intimacy", "tender devotion", "empathic understanding", "artistic resonance", "gentle honesty"],
      questionOrLesson:
        "Your most essential relationship lesson is seeing people clearly for who they are, rather than falling in love with their potential:\n\n«\"Can I love someone deeply while honoring reality and protecting my own well-being?\"»\n\nWhen you love with both an open heart and wise discernment, you attract a partner who genuinely cherishes and protects your soul.",
    },
    moneySecurity: {
      title: "Money & Material Security",
      paragraphs: [
        "You do not view money through greed; you view it as energy to sustain life, create beauty, and support loved ones.",
        "While your intuitive trust often attracts unexpected blessings, you benefit greatly from establishing clear, practical financial systems.",
        "When you treat your finances with mindful respect, wealth flows steadily to support your creative and spiritual purpose.",
      ],
      quote: "«\"Grounding your resources is an act of self-love that protects your sacred gifts.\"»",
    },
    emotionalWorld: {
      title: "Your Emotional World",
      paragraphs: [
        "Your emotional world is vast, ocean-like, and deeply connected to universal tides.",
        "You need regular solitary retreats, creative outlets, music, or time by water to cleanse your energetic field and replenish your spirit.",
        "Learning to distinguish what is genuinely your emotion from what you absorbed from someone else is your greatest superpower.",
        "Your individual birth chart reveals how Jupiter and your Moon anchor your intuitive gifts.",
      ],
    },
    hiddenPotential: {
      emoji: "✨",
      title: "Your Hidden Potential",
      paragraphs: [
        "You have the rare energy of the mystic visionary.",
        "You can channel beauty that heals wounded hearts, forgive where others cannot, and perceive the divine harmony behind life's chaotic surface.",
        "When you ground your boundless spirit into clear purpose, your presence brings peace, healing, and elevation to our world.",
      ],
    },
    firstLayerBullets: [
      { emoji: "❤️", text: "Your soul-mate relationship patterns and cultivating healthy boundaries" },
      { emoji: "💼", text: "Your creative and spiritual career calling in the material world" },
      { emoji: "💰", text: "Your financial abundance flow and practical resource mastery" },
      { emoji: "🌙", text: "Your intuitive psychic sensitivity and energetic cleansing methods" },
      { emoji: "🔥", text: "Grounding elusive dreams into concrete, measurable reality" },
      { emoji: "🧿", text: "Spiritual karmic debts, past-life gifts, and divine protections" },
      { emoji: "⏳", text: "Timing of major spiritual awakenings and planetary career cycles" },
    ],
  },
};
