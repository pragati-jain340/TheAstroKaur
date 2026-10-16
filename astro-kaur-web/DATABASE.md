# TheAstroKaur — Database Schema & Live Content Reference

> **Auto-Updated Documentation**  
> Last synced: `2026-10-15T05:55:03.854058+00:00`  
> To re-sync this file anytime you make database changes, run: `python scripts/sync-database-doc.py`

---

## Architecture Overview & Relationships

```
AUTH USER (auth.users)
    │
    ▼ (1 : 1 auto-created via trg_auto_create_customer_profile)
CUSTOMER PROFILE (public.customer_profiles)
    │   ├── auth_user_id
    │   ├── display_name, email, role ('customer' | 'admin'), account_status
    │   ├── avatar_seed, avatar_url
    │   ├── Personal birth details (date_of_birth, time_of_birth, place_of_birth, time_uncertain)
    │   └── Optional partner details (partner_name, partner_date_of_birth, partner_time_of_birth, etc.)
    │
    ▼ (1 : N)
ORDER (public.orders)
    │   ├── auth_user_id, service_title, format, price_eur, status, scheduled_at
    │   ├── Client snapshot at booking (client_name, client_dob, client_tob, client_pob, client_time_uncertain)
    │   ├── Partner snapshot if applicable (partner_name, partner_dob, partner_tob, partner_pob, etc.)
    │   ├── Stripe receipt & payment details (payment_status, stripe_payment_intent_id)
    │   └── Customer review (review_rating, review_text, review_created_at)
    │
    ▼ (1 : 1 auto-snapshotted via trg_order_reading_details_snapshot)
READING DETAILS (public.reading_details)
        ├── order_id (FK -> orders.id)
        ├── customer_id (FK -> customer_profiles.id)
        ├── service_id (FK -> services.id)
        ├── Snapshot client info for astrologer (client_name, client_date_of_birth, etc.)
        ├── Snapshot partner info for astrologer (partner_name, partner_date_of_birth, etc.)
        ├── Google Calendar event ID
        └── Reading status & admin notes
```

---

## Table of Contents

1. [`public.ascendant_readings`](#1-publicascendantreadings)
2. [`public.contact_messages`](#2-publiccontactmessages)
3. [`public.customer_profiles`](#3-publiccustomerprofiles)
4. [`public.free_reading_requests`](#4-publicfreereadingrequests)
5. [`public.free_readings`](#5-publicfreereadings)
6. [`public.orders`](#6-publicorders)
7. [`public.profiles`](#7-publicprofiles)
8. [`public.reading_details`](#8-publicreadingdetails)
9. [`public.services`](#9-publicservices)
10. [`public.testimonials`](#10-publictestimonials)
11. [`public.website_notifications`](#11-publicwebsitenotifications)
12. [Storage Buckets & Policies](#12-storage-buckets--policies)
13. [Database Functions, Triggers & Security Policies](#13-database-functions-triggers--security-policies)

---

### 1. `public.ascendant_readings` (12 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `sign` | `text` | **No** | — |
| `ruler` | `text` | **No** | — |
| `element` | `text` | **No** | — |
| `quality` | `text` | **No** | — |
| `overview` | `text` | **No** | — |
| `personality_traits` | `text` | **No** | — |
| `life_path_guidance` | `text` | **No** | — |
| `strengths` | `ARRAY` | Yes | `'{}'::text[]` |
| `growth_areas` | `ARRAY` | Yes | `'{}'::text[]` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "eb41f5a7-eab7-43f3-8a4a-f91f2cf8957d",
    "sign": "Aries",
    "ruler": "Mars (Mangal)",
    "element": "Fire",
    "quality": "Cardinal",
    "overview": "As an Aries Ascendant, you are guided by Mars, the planet of courage, vitality, and pioneering action. Your life orientation is marked by authentic independence, swift initiative, and an instinctive drive to lead rather than follow.",
    "personality_traits": "You project an energetic, direct, and straightforward presence. You naturally cut through ambiguity and speak your mind with refreshing honesty. When confronted with obstacles, your first reaction is to take constructive action. You inspire others with your courage and infectious enthusiasm, preferring real-world momentum over prolonged hesitation.",
    "life_path_guidance": "Your soul path in this lifetime revolves around conscious leadership, mastering patience, and learning to balance spontaneous impulses with steady long-term wisdom. Your relationships thrive when you cultivate active listening and give room for mutual compromise without fearing loss of autonomy.",
    "strengths": [
      "Natural courage and resilience in times of uncertainty",
      "Decisive problem solver with exceptional clarity of purpose",
      "Pioneering mindset that fearlessly ventures into new territories",
      "Warmhearted, transparent, and protective towards loved ones"
    ],
    "growth_areas": [
      "Channeling natural restlessness into disciplined, sustainable routines",
      "Practicing mindful pause before reacting in emotionally charged moments",
      "Recognizing that true strength often lies in patience and collaborative grace"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "fba0a639-d52c-4ea0-9926-00eec3beefa8",
    "sign": "Taurus",
    "ruler": "Venus (Shukra)",
    "element": "Earth",
    "quality": "Fixed",
    "overview": "With Taurus rising, your chart is anchored by Venus, the planet of harmony, beauty, value, and devotion. You embody grounded grace, unwavering loyalty, and an organic connection to material and emotional security.",
    "personality_traits": "You carry a calm, soothing, and reassuring presence that immediately puts others at ease. Methodical and thoughtful, you do not rush your choices; you build your life brick by brick with enduring craftsmanship. You possess refined aesthetic discernment and deeply appreciate sensory harmony, natural beauty, and tranquil environments.",
    "life_path_guidance": "Your life path is one of steady cultivation, building enduring prosperity, and finding authentic self-worth. Cultivating flexibility and allowing room for healthy transformation will help you release resistance to change when life invites you to evolve.",
    "strengths": [
      "Unshakable dependability and steadfast loyalty",
      "Deeply grounded practical intellect and financial prudence",
      "Sophisticated eye for aesthetics, balance, and artistic beauty",
      "Calming emotional presence that anchors those around you"
    ],
    "growth_areas": [
      "Embracing necessary life transitions without excessive attachment to the familiar",
      "Remaining open to alternate viewpoints and agile compromises",
      "Balancing physical comfort with active renewal and mindful movement"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "bd794537-5f2c-4c4f-a45e-b91c13867e63",
    "sign": "Gemini",
    "ruler": "Mercury (Budha)",
    "element": "Air",
    "quality": "Mutable",
    "overview": "Rising in Gemini, your soul's lens is illuminated by Mercury, the planet of intellect, language, and curiosity. You are an agile thinker, gifted communicator, and natural weaver of ideas, perspectives, and human connections.",
    "personality_traits": "You exude a youthful, vibrant, and intellectually curious aura. Your mind moves with remarkable speed, continuously absorbing information and spotting innovative linkages that others miss. You are versatile, witty, and naturally diplomatic, capable of relating to people from all walks of life.",
    "life_path_guidance": "Your primary life lessons center on depth over breadth. While your capacity for learning is boundless, your greatest breakthroughs will arrive when you channel your brilliant mind into committed mastery of your chosen craft.",
    "strengths": [
      "Exceptional verbal and written communication abilities",
      "High cognitive adaptability and lightning-fast learning curve",
      "Engaging conversationalist who naturally builds social bridges",
      "Curious, open-minded approach to diverse philosophies"
    ],
    "growth_areas": [
      "Guarding against mental exhaustion by incorporating grounding silent practices",
      "Following through on core endeavors before jumping to the next inspiring concept",
      "Trusting intuitive feeling as much as analytical rationalization"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "3bc5aef4-c27a-4c24-bbc2-faacf3b79e02",
    "sign": "Cancer",
    "ruler": "Moon (Chandra)",
    "element": "Water",
    "quality": "Cardinal",
    "overview": "With Cancer on the Ascendant, your chart is ruled by the Moon, the luminary of intuitive depth, nourishment, and emotional wisdom. You possess profound empathy and an instinctive ability to feel the emotional pulse of your surroundings.",
    "personality_traits": "You present a gentle, perceptive, and deeply compassionate presence. You are naturally protective of your family and inner sanctum, fiercely defending those you love. Your intuition is one of your greatest compasses, often sensing unsaid realities before words are spoken.",
    "life_path_guidance": "Your spiritual journey invites you to establish emotional self-sovereignty. As you honor your natural emotional tides without being overwhelmed by them, your innate nurturing capacity becomes an empowering light for yourself and your community.",
    "strengths": [
      "Extraordinary intuition and empathic intelligence",
      "Deep emotional loyalty and enduring family devotion",
      "Natural ability to create sacred, welcoming, and safe spaces",
      "Imaginative, poetic, and spiritually attuned perspective"
    ],
    "growth_areas": [
      "Setting clear emotional boundaries to prevent taking on others' burdens",
      "Releasing past emotional grievances through forgiveness and flow",
      "Directly voicing needs rather than retreating into an introspective shell"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "a84f2998-46ef-494a-a7d6-fa9e8eeabcd9",
    "sign": "Leo",
    "ruler": "Sun (Surya)",
    "element": "Fire",
    "quality": "Fixed",
    "overview": "Rising in Leo, your chart is guided by the Sun, the cosmic source of vitality, sovereignty, and purposeful self-expression. You radiate dignity, generous warmth, and an innate nobility of character.",
    "personality_traits": "You possess a magnetic and honorable presence. You lead naturally through benevolence rather than force, uplifting those around you with authentic encouragement. You take genuine pride in your integrity and desire your endeavors to leave a meaningful, uplifting impact on the world.",
    "life_path_guidance": "Your soul's calling is to shine as a warm, unconditional source of light. True leadership for a Leo Ascendant is realized when your inner confidence is anchored in spiritual purpose rather than external validation.",
    "strengths": [
      "Inspiring natural charisma, confidence, and radiant vitality",
      "Generous, noble heart that champions the well-being of others",
      "Unshakable sense of personal integrity and creative passion",
      "Natural mentor and encouraging protector of your inner circle"
    ],
    "growth_areas": [
      "Accepting constructive feedback with an open, non-defensive mindset",
      "Sharing the spotlight and recognizing the quiet contributions of others",
      "Allowing yourself vulnerability and resting from the burden of always being strong"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "4ffd7ad2-333f-4cc3-9058-e6c225ea5854",
    "sign": "Virgo",
    "ruler": "Mercury (Budha)",
    "element": "Earth",
    "quality": "Mutable",
    "overview": "With Virgo rising, your chart is shaped by Mercury's analytical, discerning, and service-oriented expression. You approach life with structured observation, practical intellect, and a heartfelt devotion to helping and refining.",
    "personality_traits": "You project an observant, modest, and composed demeanor. You see the intricate details that make things work and possess an inherent gift for organization, health awareness, and systematic problem solving. You value competence, cleanliness, and thoughtful dependability.",
    "life_path_guidance": "Your higher path is one of selfless service merged with self-acceptance. By learning to celebrate 'good enough' and releasing unrealistic standards of perfection, your natural analytical genius turns into compassionate healing for yourself and others.",
    "strengths": [
      "Meticulous attention to detail and outstanding organizational acumen",
      "Practical, solution-oriented mind that excels under pressure",
      "Deeply conscientious work ethic and genuine commitment to service",
      "Health consciousness and natural aptitude for holistic systems"
    ],
    "growth_areas": [
      "Softening the inner critic and practicing gentle self-compassion",
      "Stepping back from overthinking to see the expansive, beautiful whole",
      "Remembering that mistakes are sacred stepping stones toward mastery"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "bd9ba4b8-f94d-4379-9e6d-841793a0d01c",
    "sign": "Libra",
    "ruler": "Venus (Shukra)",
    "element": "Air",
    "quality": "Cardinal",
    "overview": "Rising in Libra, your life orientation is guided by Venus through the airy realms of equilibrium, justice, diplomacy, and graceful aesthetic harmony. You seek fairness and harmonious relationships in every sphere.",
    "personality_traits": "You embody a charming, refined, and naturally poised presence. You are an instinctive peacemaker who can see multiple sides of any situation with objective fairness. You have a profound appreciation for art, design, cultural elevation, and respectful collaboration.",
    "life_path_guidance": "Your essential growth lies in balancing partnership with personal conviction. You are invited to honor your personal truth and make decisive choices, knowing that authentic harmony sometimes requires voicing necessary truths.",
    "strengths": [
      "Natural diplomat with superior mediation and listening skills",
      "Sophisticated aesthetic taste, artistic sensibility, and charm",
      "Commitment to justice, balance, and equitable partnerships",
      "Polished social grace that makes everyone feel valued and heard"
    ],
    "growth_areas": [
      "Making decisive choices without getting paralyzed by weighing options",
      "Expressing personal needs assertively instead of prioritizing people-pleasing",
      "Embracing healthy confrontation when integrity requires it"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "cfd35db8-a621-4ad0-a209-042268802d7b",
    "sign": "Scorpio",
    "ruler": "Mars & Ketu (Mangal & Ketu)",
    "element": "Water",
    "quality": "Fixed",
    "overview": "With Scorpio on the Ascendant, your chart is governed by Mars and co-ruled by Ketu in Vedic astrology. You are a soul of extraordinary psychological depth, transformative power, and unwavering spiritual determination.",
    "personality_traits": "You carry an intense, magnetic, and perceptive presence that pierces beneath surface illusions. You rarely engage in superficial chatter; you seek truth, authenticity, and profound connection. Resilient beyond measure, you have an innate capacity to rise from adversity transformed and stronger.",
    "life_path_guidance": "Your life is an alchemical journey of emotional mastery and spiritual rebirth. Learning to surrender control, trust the natural rhythm of life, and transmute intensity into healing wisdom is your highest destiny.",
    "strengths": [
      "Incredible psychological insight and radar for authenticity",
      "Unmatched resilience, inner courage, and transformative power",
      "Fierce, lifelong loyalty to those who earn your sacred trust",
      "Deep focus and investigative ability to master complex mysteries"
    ],
    "growth_areas": [
      "Practicing conscious emotional forgiveness to release old grudges",
      "Opening up gradually to trust worthy individuals without guarded suspicion",
      "Channeling intense emotional energy into creative, spiritual regeneration"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "d476c1f0-8bcf-42bb-b97a-f93b759caae8",
    "sign": "Sagittarius",
    "ruler": "Jupiter (Brihaspati / Guru)",
    "element": "Fire",
    "quality": "Mutable",
    "overview": "Rising in Sagittarius, your chart is graced by Jupiter, the great cosmic benefic and Guru of higher wisdom, philosophy, and optimism. You are a seeker of truth, lifelong explorer, and harbinger of hope.",
    "personality_traits": "You radiate an expansive, upbeat, and benevolent energy. You look toward life with a forward-looking horizon, believing in higher purpose and divine synchronicity. Honest, philosophical, and free-spirited, you inspire others to see the grander picture of their circumstances.",
    "life_path_guidance": "Your path is one of embodying authentic wisdom and teaching by living example. Grounding your lofty visions in practical, daily consistency will allow your philosophical insights to create lasting earthly impact.",
    "strengths": [
      "Infectious optimism and profound philosophical vision",
      "Broadminded, generous spirit with deep thirst for truth and wisdom",
      "Natural teacher, guide, and uplifting conversationalist",
      "Courage to explore unknown cultures, ideas, and spiritual depths"
    ],
    "growth_areas": [
      "Cultivating tact when delivering direct, unfiltered truths",
      "Paying mindful attention to practical details alongside grand visions",
      "Staying committed through quiet, routine phases of long-term goals"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "580c1a5d-e9f1-48d2-9156-d684bceb6f9d",
    "sign": "Capricorn",
    "ruler": "Saturn (Shani)",
    "element": "Earth",
    "quality": "Cardinal",
    "overview": "With Capricorn rising, your chart is governed by Saturn, the planet of discipline, perseverance, time, and sacred duty (Karma). You are built for enduring achievement, structured responsibility, and lasting legacy.",
    "personality_traits": "You convey a mature, dignified, and trustworthy presence. Even in youth, you often display the wisdom of an elder. You respect time, honor commitments, and understand that anything truly worthwhile requires dedicated effort, patience, and deliberate focus.",
    "life_path_guidance": "Your evolutionary journey is one of ascending your chosen mountain with integrity. As you advance, integrating joyful spontaneity, warmth, and self-celebration into your disciplined framework enriches your heart and honors your soul.",
    "strengths": [
      "Unrivaled discipline, patience, and long-range strategic vision",
      "Rock-solid dependability and ethical accountability",
      "Quiet resilience that thrives where others surrender",
      "Mastery of organizational systems, practical leadership, and legacy building"
    ],
    "growth_areas": [
      "Allowing yourself time for genuine leisure without feeling guilty",
      "Opening your heart to express warmth and vulnerability to loved ones",
      "Recognizing that your intrinsic worth is not defined solely by productivity"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "3e570155-fdb7-4235-bd28-80a0aa61918c",
    "sign": "Aquarius",
    "ruler": "Saturn & Rahu (Shani & Rahu)",
    "element": "Air",
    "quality": "Fixed",
    "overview": "Rising in Aquarius, your chart is guided by Saturn and Rahu, merging structural responsibility with visionary innovation and humanitarian ideals. You are an independent thinker who looks toward the future of humanity.",
    "personality_traits": "You carry an original, egalitarian, and intellectual demeanor. You are deeply committed to fairness, collective well-being, and scientific or social progress. You value mental autonomy and honor each individual's uniqueness without conforming to arbitrary convention.",
    "life_path_guidance": "Your soul path is to serve as an agent of conscious innovation and community upliftment. Balancing your intellectual objectivity with heartfelt, one-on-one emotional intimacy brings wholeness to your relationships.",
    "strengths": [
      "Visionary intellect with out-of-the-box problem-solving talent",
      "Egalitarian values and dedication to collective progress",
      "Loyal, non-judgmental friend who celebrates diversity",
      "Capacity to remain calm and objective amidst chaotic environments"
    ],
    "growth_areas": [
      "Connecting with and expressing personal, vulnerable emotions directly",
      "Avoiding emotional detachment when close partners seek reassurance",
      "Balancing grand ideals with compassionate patience for human imperfections"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  },
  {
    "id": "b29ddeb8-8d00-40a2-8167-ce03fa3c5733",
    "sign": "Pisces",
    "ruler": "Jupiter (Brihaspati / Guru)",
    "element": "Water",
    "quality": "Mutable",
    "overview": "With Pisces rising, your chart is illuminated by Jupiter in its spiritual, contemplative, and boundless ocean of compassion. You are an intuitive mystic, gentle healer, and dreamer with access to universal imagination.",
    "personality_traits": "You emanate a serene, gentle, and dreamlike aura. Highly receptive to subtle energies, music, and sacred art, you feel deeply and naturally empathize with the struggles of others. You bring a sense of spiritual mystery, poetry, and transcendence into everyday life.",
    "life_path_guidance": "Your spiritual lesson is to anchor your celestial intuition in grounded, earthly reality. By cultivating healthy energetic boundaries and practical grounding routines, your oceanic compassion becomes a steady, healing sanctuary.",
    "strengths": [
      "Profound spiritual intuition, empathy, and mystical depth",
      "Vibrant creative imagination and artistic or musical sensitivity",
      "Selfless compassion and natural ability to forgive and comfort",
      "Attunement to the unseen rhythms of the universe"
    ],
    "growth_areas": [
      "Building strong personal boundaries to prevent energetic depletion",
      "Maintaining grounding practical routines to avoid escapism",
      "Seeing people and situations with clear discernment rather than through idealization"
    ],
    "created_at": "2026-10-15 05:31:20.232313+00",
    "updated_at": "2026-10-15 05:31:20.232313+00"
  }
]
```

---

### 2. `public.contact_messages` (12 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `sender_name` | `text` | **No** | — |
| `email` | `text` | **No** | — |
| `subject` | `text` | Yes | — |
| `message` | `text` | **No** | — |
| `status` | `text` | **No** | `'unread'::text` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "a3e9dc68-4f3d-4a0e-975b-b7d88c719e3d",
    "sender_name": "Pragati Jain",
    "email": "pragatiijain841@gmail.com",
    "subject": "Choosing a Reading",
    "message": "Hello Astrologer Kaur, I would like to enquire about the birth chart reading and what information is required before booking. Thank you!",
    "status": "unread",
    "created_at": "2026-10-13 16:54:26.557+00",
    "updated_at": "2026-10-13 16:54:26.557+00"
  },
  {
    "id": "471dd75f-e68e-4054-b881-d3d6cd0875a6",
    "sender_name": "hii",
    "email": "jainpragati4566@gmail.com",
    "subject": "General Question",
    "message": "heelo i have",
    "status": "unread",
    "created_at": "2026-10-13 17:31:59.321+00",
    "updated_at": "2026-10-13 17:31:59.321+00"
  },
  {
    "id": "a80beb47-7ec2-4ed5-9f02-edea302000bf",
    "sender_name": "Aarav Sharma",
    "email": "pragatiijain841@gmail.com",
    "subject": "Booking Enquiry",
    "message": "Hello! I would like to enquire about scheduling a reading session.",
    "status": "unread",
    "created_at": "2026-10-13 18:10:14.891+00",
    "updated_at": "2026-10-13 18:10:14.891+00"
  },
  {
    "id": "9416219e-3f7e-45dc-bb46-33943377f292",
    "sender_name": "Aarav Sharma",
    "email": "pragatijain841@gmail.com",
    "subject": "Booking Enquiry",
    "message": "Hello! Testing the enquiry form submission end-to-end to verify Resend email delivery.",
    "status": "unread",
    "created_at": "2026-10-13 18:13:30.892+00",
    "updated_at": "2026-10-13 18:13:30.892+00"
  },
  {
    "id": "18a46382-473a-4893-b3e3-154a8f93fd1c",
    "sender_name": "Aarav Sharma",
    "email": "pragatijain841@gmail.com",
    "subject": "Booking Enquiry",
    "message": "Hello! Testing the enquiry form submission end-to-end to verify Resend email delivery.",
    "status": "unread",
    "created_at": "2026-10-13 18:14:31.058+00",
    "updated_at": "2026-10-13 18:14:31.058+00"
  },
  {
    "id": "9128ad51-9473-4352-b48b-c087461589eb",
    "sender_name": "Aarav Sharma",
    "email": "pragatijain841@gmail.com",
    "subject": "Booking Enquiry",
    "message": "Hello! Testing the enquiry form submission end-to-end to verify Resend email delivery.",
    "status": "unread",
    "created_at": "2026-10-13 18:14:58.504+00",
    "updated_at": "2026-10-13 18:14:58.504+00"
  },
  {
    "id": "d1600cda-7f5b-4582-ab9b-507c5672940a",
    "sender_name": "fu",
    "email": "jainpragati4566@gmail.com",
    "subject": "Choosing a Reading",
    "message": "hwwdsd",
    "status": "unread",
    "created_at": "2026-10-13 18:28:53.34+00",
    "updated_at": "2026-10-13 18:28:53.34+00"
  },
  {
    "id": "8ffa87d8-0686-4ca0-bd70-af13500c1812",
    "sender_name": "DR SAYYED USMAN AHMED",
    "email": "jainpragati4566@gmail.com",
    "subject": "Choosing a Reading",
    "message": "frqgrwgwtr",
    "status": "unread",
    "created_at": "2026-10-13 18:33:37.589+00",
    "updated_at": "2026-10-13 18:33:37.589+00"
  },
  {
    "id": "4d10051c-9a3c-4dfd-b681-a6defe379baf",
    "sender_name": "Priya Sharma",
    "email": "priya.test@example.com",
    "subject": "Booking Enquiry",
    "message": "Hello Pragati! I would love to book a 60-minute Vedic birth chart reading. What dates are available?",
    "status": "unread",
    "created_at": "2026-10-13 18:35:04.111+00",
    "updated_at": "2026-10-13 18:35:04.111+00"
  },
  {
    "id": "c67244be-c2bb-48f4-81b5-704cd42828c3",
    "sender_name": "Priya Sharma",
    "email": "priya.test@example.com",
    "subject": "Booking Enquiry",
    "message": "Hello Pragati! I would love to book a 60-minute Vedic birth chart reading. What dates are available?",
    "status": "unread",
    "created_at": "2026-10-13 18:35:23.485+00",
    "updated_at": "2026-10-13 18:35:23.485+00"
  },
  {
    "id": "59506ecb-4e4b-441e-ba8b-6a9a3b0bfe70",
    "sender_name": "Priya Sharma",
    "email": "priya.test@example.com",
    "subject": "Booking Enquiry",
    "message": "Hello Pragati! I would love to book a 60-minute Vedic birth chart reading. What dates are available?",
    "status": "unread",
    "created_at": "2026-10-13 18:36:07.614+00",
    "updated_at": "2026-10-13 18:36:07.614+00"
  },
  {
    "id": "97ad1803-9f38-4df1-b876-b114be3da197",
    "sender_name": "Pragati Jain",
    "email": "pragatijain841@gmail.com",
    "subject": "Other",
    "message": "asdfghjkuytffb",
    "status": "unread",
    "created_at": "2026-10-14 07:25:27.929+00",
    "updated_at": "2026-10-14 07:25:27.929+00"
  }
]
```

---

### 3. `public.customer_profiles` (6 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `auth_user_id` | `uuid` | **No** | — |
| `display_name` | `text` | Yes | — |
| `email` | `text` | **No** | — |
| `date_of_birth` | `date` | Yes | — |
| `time_of_birth` | `time without time zone` | Yes | — |
| `time_uncertain` | `boolean` | **No** | `false` |
| `place_of_birth` | `text` | Yes | — |
| `avatar_seed` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| ⭐ **role** | `text` | **No** | `'customer'::text` |
| ⭐ **partner_name** | `text` | Yes | — |
| `partner_date_of_birth` | `date` | Yes | — |
| `partner_time_of_birth` | `time without time zone` | Yes | — |
| `partner_time_uncertain` | `boolean` | Yes | `false` |
| `partner_place_of_birth` | `text` | Yes | — |
| ⭐ **account_status** | `text` | **No** | `'active'::text` |
| ⭐ **avatar_url** | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "9d90f4dd-17e5-46d8-b497-e1f37b37b9d8",
    "auth_user_id": "54d730b2-150b-4100-b5e6-5fccc6a5809e",
    "display_name": "Priya Sharma",
    "email": "priya.sharma91@gmail.com",
    "date_of_birth": "1993-11-20",
    "time_of_birth": "08:45:00",
    "time_uncertain": false,
    "place_of_birth": "London, UK",
    "avatar_seed": null,
    "created_at": "2026-10-11 15:09:46.36498+00",
    "updated_at": "2026-10-11 15:09:47.156645+00",
    "role": "customer",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": null
  },
  {
    "id": "164c98ef-8485-442a-b128-2e5fe1ce1857",
    "auth_user_id": "412721d8-b8bc-47cb-b942-6bf5a654143f",
    "display_name": "Marcus Vance",
    "email": "marcus.vance88@gmail.com",
    "date_of_birth": "1988-03-08",
    "time_of_birth": "18:15:00",
    "time_uncertain": false,
    "place_of_birth": "Berlin, Germany",
    "avatar_seed": null,
    "created_at": "2026-10-11 15:09:49.516382+00",
    "updated_at": "2026-10-11 15:51:57.28284+00",
    "role": "customer",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": "https://qdnwmfriilknnwqrepuy.supabase.co/storage/v1/object/public/custom_profle_photo/412721d8-b8bc-47cb-b942-6bf5a654143f/avatar.webp?t=1791733917016"
  },
  {
    "id": "885847c9-0413-4b37-b6b1-cb205a808487",
    "auth_user_id": "2583c2ac-b95a-447f-b555-22cc26f7384f",
    "display_name": "Pragati Jain client",
    "email": "jainpragati4566@gmail.com",
    "date_of_birth": "1998-05-14",
    "time_of_birth": "14:30:00",
    "time_uncertain": false,
    "place_of_birth": "Delhi, India",
    "avatar_seed": null,
    "created_at": "2026-10-05 18:57:47.524989+00",
    "updated_at": "2026-10-11 15:53:08.429392+00",
    "role": "customer",
    "partner_name": "Harsh",
    "partner_date_of_birth": "2026-10-07",
    "partner_time_of_birth": null,
    "partner_time_uncertain": true,
    "partner_place_of_birth": "aligath",
    "account_status": "active",
    "avatar_url": "https://qdnwmfriilknnwqrepuy.supabase.co/storage/v1/object/public/custom_profle_photo/2583c2ac-b95a-447f-b555-22cc26f7384f/avatar.webp?t=1791733988080"
  },
  {
    "id": "f7eb6aca-2211-48f3-bf62-0839f60febad",
    "auth_user_id": "16b6d7c1-e717-49fb-8c77-fd74098a1869",
    "display_name": null,
    "email": "testadmin999@gmail.com",
    "date_of_birth": null,
    "time_of_birth": null,
    "time_uncertain": false,
    "place_of_birth": null,
    "avatar_seed": null,
    "created_at": "2026-10-11 18:29:46.597559+00",
    "updated_at": "2026-10-11 18:29:46.597559+00",
    "role": "customer",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": null
  },
  {
    "id": "7b9fc2d9-5d08-4995-ab8b-61f4276467ff",
    "auth_user_id": "e34a4077-eaac-4a33-9c8b-6ee3f13b3077",
    "display_name": null,
    "email": "kaurharvinder92@gmail.com",
    "date_of_birth": null,
    "time_of_birth": null,
    "time_uncertain": false,
    "place_of_birth": null,
    "avatar_seed": null,
    "created_at": "2026-10-14 07:52:51.084467+00",
    "updated_at": "2026-10-14 08:15:38.398985+00",
    "role": "admin",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": null
  },
  {
    "id": "0bd2fa94-a01d-4f58-8802-c2a55edc7e93",
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "display_name": "Pragati Jain",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": "2003-11-19",
    "time_of_birth": "17:45:00",
    "time_uncertain": false,
    "place_of_birth": "Aligarh, Koil, Aligarh, Uttar Pradesh, 202001, India",
    "avatar_seed": null,
    "created_at": "2026-10-03 18:20:01.629501+00",
    "updated_at": "2026-10-15 05:37:39.173176+00",
    "role": "admin",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": null
  }
]
```

---

### 4. `public.free_reading_requests` (3 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `full_name` | `text` | **No** | — |
| `email` | `text` | **No** | — |
| `date_of_birth` | `date` | **No** | — |
| `time_of_birth` | `time without time zone` | Yes | — |
| `time_uncertain` | `boolean` | **No** | `false` |
| `place_of_birth` | `text` | **No** | — |
| `status` | `text` | **No** | `'pending'::text` |
| `admin_notes` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "649900f8-aab1-49d0-9d7a-a17f913bcfd3",
    "full_name": "Priya Sharma",
    "email": "priya@example.com",
    "date_of_birth": "1996-08-15",
    "time_of_birth": "08:30:00",
    "time_uncertain": false,
    "place_of_birth": "New Delhi, India",
    "status": "pending",
    "admin_notes": null,
    "created_at": "2026-10-03 18:51:16.024783+00",
    "updated_at": "2026-10-03 18:51:16.024783+00"
  },
  {
    "id": "8b573466-b252-49da-b2ea-ec1126e1b6eb",
    "full_name": "Pragati (TheAstroKaur)",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": "2003-11-19",
    "time_of_birth": "07:30:00",
    "time_uncertain": false,
    "place_of_birth": "Aligarh",
    "status": "pending",
    "admin_notes": null,
    "created_at": "2026-10-03 18:52:39.31971+00",
    "updated_at": "2026-10-03 18:52:39.31971+00"
  },
  {
    "id": "78297e5b-1b1b-47cb-9aca-d7fa0e4581e3",
    "full_name": "Ananya Sen",
    "email": "ananya@example.com",
    "date_of_birth": "1998-05-12",
    "time_of_birth": "14:15:00",
    "time_uncertain": false,
    "place_of_birth": "Kolkata, India",
    "status": "pending",
    "admin_notes": null,
    "created_at": "2026-10-03 19:17:01.549391+00",
    "updated_at": "2026-10-03 19:17:01.549391+00"
  }
]
```

---

### 5. `public.free_readings` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `user_id` | `uuid` | **No** | — |
| `email` | `text` | **No** | — |
| `date_of_birth` | `date` | **No** | — |
| `time_of_birth` | `time without time zone` | **No** | — |
| `place_of_birth` | `text` | **No** | — |
| `latitude` | `numeric` | **No** | — |
| `longitude` | `numeric` | **No** | — |
| `timezone` | `numeric` | **No** | — |
| `ascendant` | `text` | **No** | — |
| `reading_content` | `text` | **No** | — |
| `reading_source_id` | `uuid` | Yes | — |
| `status` | `text` | **No** | `'completed'::text` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "36f84ae0-4fe2-457d-aa18-3fcc49a7eba7",
    "user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": "2003-11-19",
    "time_of_birth": "17:45:00",
    "place_of_birth": "Aligarh, Koil, Aligarh, Uttar Pradesh, 202001, India",
    "latitude": "27.881541",
    "longitude": "78.069022",
    "timezone": "5.50",
    "ascendant": "Taurus",
    "reading_content": "{\"sign\":\"Taurus\",\"sanskritName\":\"Vrishabha\",\"ruler\":\"Venus (Shukra)\",\"element\":\"Earth\",\"quality\":\"Fixed\",\"overview\":\"With Taurus rising, your chart is anchored by Venus, the planet of harmony, beauty, value, and devotion. You embody grounded grace, unwavering loyalty, and an organic connection to material and emotional security.\",\"personalityTraits\":\"You carry a calm, soothing, and reassuring presence that immediately puts others at ease. Methodical and thoughtful, you do not rush your choices; you build your life brick by brick with enduring craftsmanship. You possess refined aesthetic discernment and deeply appreciate sensory harmony, natural beauty, and tranquil environments.\",\"lifePathGuidance\":\"Your life path is one of steady cultivation, building enduring prosperity, and finding authentic self-worth. Cultivating flexibility and allowing room for healthy transformation will help you release resistance to change when life invites you to evolve.\",\"strengths\":[\"Unshakable dependability and steadfast loyalty\",\"Deeply grounded practical intellect and financial prudence\",\"Sophisticated eye for aesthetics, balance, and artistic beauty\",\"Calming emotional presence that anchors those around you\"],\"growthAreas\":[\"Embracing necessary life transitions without excessive attachment to the familiar\",\"Remaining open to alternate viewpoints and agile compromises\",\"Balancing physical comfort with active renewal and mindful movement\"]}",
    "reading_source_id": "fba0a639-d52c-4ea0-9926-00eec3beefa8",
    "status": "completed",
    "created_at": "2026-10-15 05:37:38.932037+00",
    "updated_at": "2026-10-15 05:37:38.932037+00"
  }
]
```

---

### 6. `public.orders` (4 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `auth_user_id` | `uuid` | Yes | — |
| `service_title` | `text` | **No** | — |
| `format` | `text` | **No** | `'text'::text` |
| `price_eur` | `numeric` | **No** | `0.00` |
| `status` | `text` | **No** | `'confirmed'::text` |
| `scheduled_at` | `timestamp with time zone` | Yes | — |
| `stripe_receipt_url` | `text` | Yes | — |
| ⭐ **client_name** | `text` | Yes | — |
| ⭐ **client_dob** | `date` | Yes | — |
| `client_tob` | `time without time zone` | Yes | — |
| `client_pob` | `text` | Yes | — |
| `client_time_uncertain` | `boolean` | Yes | `false` |
| `requires_partner` | `boolean` | Yes | `false` |
| ⭐ **partner_name** | `text` | Yes | — |
| `partner_dob` | `date` | Yes | — |
| `partner_tob` | `time without time zone` | Yes | — |
| `partner_pob` | `text` | Yes | — |
| `partner_time_uncertain` | `boolean` | Yes | `false` |
| `notes` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | Yes | `now()` |
| `updated_at` | `timestamp with time zone` | Yes | `now()` |
| ⭐ **review_rating** | `integer` | Yes | — |
| ⭐ **review_text** | `text` | Yes | — |
| ⭐ **review_created_at** | `timestamp with time zone` | Yes | — |
| `payment_status` | `text` | **No** | `'pending'::text` |
| ⭐ **stripe_payment_intent_id** | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "51c98188-c2cd-424a-95bb-22960193fdb1",
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "service_title": "Career & Money Reading",
    "format": "text",
    "price_eur": "75.00",
    "status": "completed",
    "scheduled_at": null,
    "stripe_receipt_url": null,
    "client_name": "Pragati Jain",
    "client_dob": "1995-05-15",
    "client_tob": "14:30:00",
    "client_pob": "New Delhi, India",
    "client_time_uncertain": false,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": "Focus on career growth and financial stability in the upcoming year.",
    "created_at": "2026-09-12 10:00:00+00",
    "updated_at": "2026-10-05 16:33:05.659917+00",
    "review_rating": null,
    "review_text": null,
    "review_created_at": null,
    "payment_status": "paid",
    "stripe_payment_intent_id": null
  },
  {
    "id": "3709228c-cea8-493b-929c-d9cc5a5f2ede",
    "auth_user_id": "2583c2ac-b95a-447f-b555-22cc26f7384f",
    "service_title": "Extensive Birth Chart Reading",
    "format": "voice_call",
    "price_eur": "60.00",
    "status": "completed",
    "scheduled_at": null,
    "stripe_receipt_url": null,
    "client_name": "Pragati Jain",
    "client_dob": "1998-05-14",
    "client_tob": "14:30:00",
    "client_pob": "Delhi, India",
    "client_time_uncertain": false,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-10-04 15:09:43.909+00",
    "updated_at": "2026-10-11 15:09:43.909+00",
    "review_rating": 5,
    "review_text": "The extensive birth chart reading was deeply insightful and accurate. Astrologer Kaur identified life themes and transition periods that felt so true to my journey. I left the session with profound clarity and peace.",
    "review_created_at": "2026-10-08 15:09:43.909+00",
    "payment_status": "paid",
    "stripe_payment_intent_id": null
  },
  {
    "id": "e1a9ff91-a8d8-4edb-8557-d1b3570079cf",
    "auth_user_id": "54d730b2-150b-4100-b5e6-5fccc6a5809e",
    "service_title": "Future Partner Reading",
    "format": "text",
    "price_eur": "20.00",
    "status": "completed",
    "scheduled_at": null,
    "stripe_receipt_url": null,
    "client_name": "Priya Sharma",
    "client_dob": "1993-11-20",
    "client_tob": "08:45:00",
    "client_pob": "London, UK",
    "client_time_uncertain": false,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-09-27 15:09:47.196+00",
    "updated_at": "2026-10-11 15:09:47.196+00",
    "review_rating": 5,
    "review_text": "I was amazed by the depth of detail in the written reading. Everything about relationship timing and partner characteristics resonated so strongly. Highly recommended for anyone seeking sincere Vedic guidance!",
    "review_created_at": "2026-10-05 15:09:47.196+00",
    "payment_status": "paid",
    "stripe_payment_intent_id": null
  },
  {
    "id": "a03b6392-ab7b-4e38-b87f-afdfcc963d2b",
    "auth_user_id": "412721d8-b8bc-47cb-b942-6bf5a654143f",
    "service_title": "Career & Money Reading (Voice Call)",
    "format": "voice_call",
    "price_eur": "40.00",
    "status": "completed",
    "scheduled_at": null,
    "stripe_receipt_url": null,
    "client_name": "Marcus Vance",
    "client_dob": "1988-03-08",
    "client_tob": "18:15:00",
    "client_pob": "Berlin, Germany",
    "client_time_uncertain": false,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-09-20 15:09:50.411+00",
    "updated_at": "2026-10-11 15:09:50.411+00",
    "review_rating": 5,
    "review_text": "Astrologer Kaur has a rare gift for combining analytical clarity with compassionate wisdom. The career guidance helped me navigate a critical transition with confidence.",
    "review_created_at": "2026-10-02 15:09:50.411+00",
    "payment_status": "paid",
    "stripe_payment_intent_id": null
  }
]
```

---

### 7. `public.profiles` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `auth_user_id` | `uuid` | Yes | — |
| `display_name` | `text` | **No** | `'TheAstroKaur'::text` |
| `bio` | `text` | Yes | — |
| `vision` | `text` | Yes | — |
| `specialties` | `ARRAY` | Yes | — |
| `is_published` | `boolean` | **No** | `false` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "f78861fd-a8d4-400b-9680-05ab4b5d4a33",
    "auth_user_id": null,
    "display_name": "TheAstroKaur",
    "bio": "{\"tag\":\"THE PERSON BEHIND THE READINGS\",\"heading_prefix\":\"Meet\",\"heading_name\":\"TheAstroKaur\",\"paragraph_1\":\"Graduating from top universities in India and Germany and building a career in IT & Technology, I was trained to think analytically and rely on logic and structured reasoning. Like many people, I believed that success and life's outcomes were entirely within my control, leaving little room for magic.\",\"paragraph_2\":\"Everything changed when I began noticing recurring patterns in my own life\u2014similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, that completely changed my perspective on life. Not just as a prediction tool, but astrology has helped me for self-awareness and personal growth.\",\"image_url\":\"https://qdnwmfriilknnwqrepuy.supabase.co/storage/v1/object/public/custom_profle_photo/owner/owner_about_1791742310068.webp\"}",
    "vision": "{\"tag\":\"THE PERSON BEHIND THE READINGS\",\"heading_line_1\":\"There Is More Than One Way\",\"heading_line_2\":\"to See Your Story.\",\"paragraph_1\":\"Through my practice, I hope to bridge the gap between ancient Vedic wisdom and the modern world, making astrology easier to understand and relevant to everyday life. Rather than seeing it as a way to reflect on our experiences, understand ourselves better, and approach life's uncertainties with greater awareness.\",\"paragraph_2\":\"   \"}",
    "specialties": null,
    "is_published": true,
    "created_at": "2026-10-11 18:00:00.253908+00",
    "updated_at": "2026-10-14 18:54:25.468183+00"
  }
]
```

---

### 8. `public.reading_details` (4 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `customer_id` | `uuid` | Yes | — |
| `service_id` | `uuid` | Yes | — |
| `google_calendar_event_id` | `text` | **No** | — |
| `status` | `text` | **No** | `'pending'::text` |
| `admin_notes` | `text` | Yes | — |
| ⭐ **partner_name** | `text` | Yes | — |
| `partner_date_of_birth` | `date` | Yes | — |
| `partner_time_of_birth` | `time without time zone` | Yes | — |
| `partner_time_uncertain` | `boolean` | **No** | `false` |
| `partner_place_of_birth` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| ⭐ **order_id** | `uuid` | Yes | — |
| ⭐ **client_name** | `text` | Yes | — |
| `client_date_of_birth` | `date` | Yes | — |
| `client_time_of_birth` | `time without time zone` | Yes | — |
| `client_time_uncertain` | `boolean` | Yes | `false` |
| `client_place_of_birth` | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "1d4464b9-2182-4c72-b79b-15b2f0708b71",
    "customer_id": "0bd2fa94-a01d-4f58-8802-c2a55edc7e93",
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "google_calendar_event_id": "",
    "status": "pending",
    "admin_notes": "hii iam pragati\n",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-10-05 18:20:28.473726+00",
    "updated_at": "2026-10-06 14:55:04.039988+00",
    "order_id": "51c98188-c2cd-424a-95bb-22960193fdb1",
    "client_name": "Pragati Jain",
    "client_date_of_birth": "1995-05-15",
    "client_time_of_birth": "14:30:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "New Delhi, India"
  },
  {
    "id": "fe53f9a8-047e-4c38-b519-f3f610fcd8e6",
    "customer_id": "885847c9-0413-4b37-b6b1-cb205a808487",
    "service_id": "50aacc9a-67c2-4c65-a263-53c6de9c2c11",
    "google_calendar_event_id": "",
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-10-11 15:09:44.404314+00",
    "updated_at": "2026-10-11 15:09:44.404314+00",
    "order_id": "3709228c-cea8-493b-929c-d9cc5a5f2ede",
    "client_name": "Pragati Jain",
    "client_date_of_birth": "1998-05-14",
    "client_time_of_birth": "14:30:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "Delhi, India"
  },
  {
    "id": "4681dcb5-f699-4149-b51d-4b7d51e3b775",
    "customer_id": "9d90f4dd-17e5-46d8-b497-e1f37b37b9d8",
    "service_id": "893e3907-476c-43da-b59c-13ee39b807cd",
    "google_calendar_event_id": "",
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-10-11 15:09:47.642832+00",
    "updated_at": "2026-10-11 15:09:47.642832+00",
    "order_id": "e1a9ff91-a8d8-4edb-8557-d1b3570079cf",
    "client_name": "Priya Sharma",
    "client_date_of_birth": "1993-11-20",
    "client_time_of_birth": "08:45:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "London, UK"
  },
  {
    "id": "195abcc3-f7c4-4f5f-bdf3-4530ee159c0e",
    "customer_id": "164c98ef-8485-442a-b128-2e5fe1ce1857",
    "service_id": "2945fc9c-d8b0-4919-9c67-f703baef9983",
    "google_calendar_event_id": "",
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-10-11 15:09:50.731022+00",
    "updated_at": "2026-10-11 15:09:50.731022+00",
    "order_id": "a03b6392-ab7b-4e38-b87f-afdfcc963d2b",
    "client_name": "Marcus Vance",
    "client_date_of_birth": "1988-03-08",
    "client_time_of_birth": "18:15:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "Berlin, Germany"
  }
]
```

---

### 9. `public.services` (6 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `sort_order` | `smallint` | **No** | `0` |
| `title` | `text` | **No** | — |
| `description` | `text` | **No** | — |
| `format` | `text` | **No** | — |
| `duration_minutes` | `smallint` | Yes | — |
| `price_cents` | `integer` | **No** | — |
| `currency` | `text` | **No** | `'EUR'::text` |
| `google_schedule_url` | `text` | Yes | — |
| `stripe_payment_link_url` | `text` | Yes | — |
| `requires_partner_details` | `boolean` | **No** | `false` |
| `is_active` | `boolean` | **No** | `true` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| `image_url` | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "8435b534-dc09-48a3-811e-3a466a3d6ed4",
    "sort_order": 5,
    "title": "Matchmaking Reading",
    "description": "Compare two birth charts, discuss compatibility strengths and weaknesses, and explore ways to strengthen the relationship.",
    "format": "voice_call",
    "duration_minutes": 45,
    "price_cents": 6000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": true,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-09-29 20:37:50.973234+00",
    "image_url": null
  },
  {
    "id": "50aacc9a-67c2-4c65-a263-53c6de9c2c11",
    "sort_order": 6,
    "title": "Extensive Birth Chart Reading",
    "description": "Explore life path, purpose and direction, karmic lessons, and emotional patterns.",
    "format": "voice_call",
    "duration_minutes": 45,
    "price_cents": 6000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": false,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-09-29 20:37:50.973234+00",
    "image_url": null
  },
  {
    "id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "sort_order": 2,
    "title": "Career & Money Reading",
    "description": "Insights into suitable professions, promotion timelines, and money flow.",
    "format": "text",
    "duration_minutes": null,
    "price_cents": 2000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": false,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-10-05 16:57:20.519784+00",
    "image_url": null
  },
  {
    "id": "2945fc9c-d8b0-4919-9c67-f703baef9983",
    "sort_order": 4,
    "title": "Career & Money Reading (Voice Call)",
    "description": "Explore suitable professions, promotions, financial growth, and career changes.",
    "format": "voice_call",
    "duration_minutes": 30,
    "price_cents": 4000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": false,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-10-05 16:57:20.519784+00",
    "image_url": null
  },
  {
    "id": "5efed3e1-c7fb-4cf5-bc85-201c05606d66",
    "sort_order": 3,
    "title": "Relationship Karma",
    "description": "Explore relationships, lessons, marriage, attracting a partner, and possible circumstances of meeting.",
    "format": "voice_call",
    "duration_minutes": 30,
    "price_cents": 4000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": false,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-10-11 18:14:27.933507+00",
    "image_url": null
  },
  {
    "id": "893e3907-476c-43da-b59c-13ee39b807cd",
    "sort_order": 1,
    "title": "Future Partner Reading",
    "description": "Insights into the qualities of a future partner, possible places or circumstances of meeting, and marriage timelines.",
    "format": "text",
    "duration_minutes": null,
    "price_cents": 2000,
    "currency": "EUR",
    "google_schedule_url": null,
    "stripe_payment_link_url": null,
    "requires_partner_details": false,
    "is_active": true,
    "created_at": "2026-09-29 20:37:50.973234+00",
    "updated_at": "2026-10-13 17:19:15.567752+00",
    "image_url": null
  }
]
```

---

### 10. `public.testimonials` (3 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `customer_id` | `uuid` | Yes | — |
| `author_name` | `text` | **No** | — |
| `content` | `text` | **No** | — |
| `consent_given` | `boolean` | **No** | `false` |
| `is_published` | `boolean` | **No** | `false` |
| `sort_order` | `smallint` | **No** | `0` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| ⭐ **order_id** | `uuid` | Yes | — |
| `rating` | `integer` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "b233e4d7-a901-4a0e-8454-be6c8dc09fce",
    "customer_id": "885847c9-0413-4b37-b6b1-cb205a808487",
    "author_name": "Pragati J.",
    "content": "The extensive birth chart reading was deeply insightful and accurate. Astrologer Kaur identified life themes and transition periods that felt so true to my journey. I left the session with profound clarity and peace.",
    "consent_given": true,
    "is_published": true,
    "sort_order": 1,
    "created_at": "2026-10-11 15:09:45.59658+00",
    "updated_at": "2026-10-11 15:09:45.59658+00",
    "order_id": "3709228c-cea8-493b-929c-d9cc5a5f2ede",
    "rating": 5
  },
  {
    "id": "43d28c53-8f4e-422c-b60a-39b6fd2b7d29",
    "customer_id": "9d90f4dd-17e5-46d8-b497-e1f37b37b9d8",
    "author_name": "Priya S.",
    "content": "I was amazed by the depth of detail in the written reading. Everything about relationship timing and partner characteristics resonated so strongly. Highly recommended for anyone seeking sincere Vedic guidance!",
    "consent_given": true,
    "is_published": true,
    "sort_order": 2,
    "created_at": "2026-10-11 15:09:48.748309+00",
    "updated_at": "2026-10-11 15:09:48.748309+00",
    "order_id": "e1a9ff91-a8d8-4edb-8557-d1b3570079cf",
    "rating": 5
  },
  {
    "id": "75bea86a-441e-47d6-b0bd-4a59bc223672",
    "customer_id": "164c98ef-8485-442a-b128-2e5fe1ce1857",
    "author_name": "Marcus V.",
    "content": "Astrologer Kaur has a rare gift for combining analytical clarity with compassionate wisdom. The career guidance helped me navigate a critical transition with confidence.",
    "consent_given": true,
    "is_published": true,
    "sort_order": 3,
    "created_at": "2026-10-11 15:09:51.767363+00",
    "updated_at": "2026-10-11 15:09:51.767363+00",
    "order_id": "a03b6392-ab7b-4e38-b87f-afdfcc963d2b",
    "rating": 5
  }
]
```

---

### 11. `public.website_notifications` (0 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `email_type` | `text` | **No** | — |
| `recipient_email` | `text` | **No** | — |
| `related_table` | `text` | Yes | — |
| `related_id` | `uuid` | Yes | — |
| `status` | `text` | **No** | `'pending'::text` |
| `retries` | `smallint` | **No** | `0` |
| `sent_at` | `timestamp with time zone` | Yes | — |
| `error_message` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

*(Table is currently empty / 0 rows)*

---

### 12. Storage Buckets & Policies

#### Storage Buckets (`storage.buckets`)

| Bucket ID | Public | Max File Size | Allowed MIME Types | Created At |
| :--- | :--- | :--- | :--- | :--- |
| `custom_profle_photo` | ✅ Yes | `1.0 MB` | `image/webp` | `2026-10-06 14:30:52.817736+00` |

#### Storage RLS Policies (`storage.objects`)

| Policy Name | Command | Target Role | Security Expression / Condition |
| :--- | :--- | :--- | :--- |
| `Users can delete own profile photo y5wa4z_0` | `DELETE` | `{authenticated}` | `((bucket_id = 'custom_profle_photo'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))` |
| `Users can upload own profile photo y5wa4z_0` | `INSERT` | `{authenticated}` | `((bucket_id = 'custom_profle_photo'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))` |
| `Users can delete own profile photo y5wa4z_1` | `SELECT` | `{authenticated}` | `((bucket_id = 'custom_profle_photo'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))` |
| `Users can update own profile photo y5wa4z_1` | `SELECT` | `{authenticated}` | `((bucket_id = 'custom_profle_photo'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))` |
| `Users can update own profile photo y5wa4z_0` | `UPDATE` | `{authenticated}` | `((bucket_id = 'custom_profle_photo'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)))` |

---

## 13. Database Functions, Triggers & Security Policies

### 1. Helper Function: `public.is_admin()`

Prevents infinite recursion in PostgreSQL RLS policies by using `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customer_profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;
```

### 2. Auto-Confirm New Users (`trg_auto_confirm_new_user`)

Ensures customers are instantly activated upon signup without getting blocked by "Email not confirmed".

### 3. Auto-Create Customer Profile (`trg_auto_create_customer_profile`)

Creates the user's `customer_profiles` entry server-side immediately upon user registration with role `'customer'` and account status `'active'`.

### 4. Order-to-Reading Details Snapshot (`trg_order_reading_details_snapshot`)

Automatically populates `reading_details` with full client and partner snapshots whenever a booking order is created.

### 5. Row Level Security Policies on Public Tables

- **`customer_profiles`**: SELECT, INSERT, UPDATE restricted to owner (`auth.uid() = auth_user_id`) or `is_admin()`. Unrestricted admin ALL access.

- **`orders`**: SELECT, INSERT, UPDATE restricted to owner (`auth.uid() = auth_user_id`) or `is_admin()`. Anon INSERT allowed for intake.

- **`reading_details`**: SELECT restricted to order/customer owner or `is_admin()`. Admin full access.

- **`services`**: Public read for active services. Admin full access.

- **`testimonials`**: Public read for published testimonials. Authenticated insert. Admin full access.

- **`contact_messages`**: Public insert. Admin full access.

- **`free_reading_requests`**: Public insert. Admin full access.
