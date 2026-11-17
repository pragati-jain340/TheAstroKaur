# TheAstroKaur — Database Schema & Live Content Reference

> **Auto-Updated Documentation**  
> Last synced: `2026-11-17T18:23:59.826825+00:00`  
> To re-sync this file anytime you make database changes, run: `python scripts/sync-database-doc.py`

---

## Architecture Overview & Relationships

```
AUTH USER (auth.users)
    │
    ├─► (1 : 1 auto-created via trg_auto_create_customer_profile)
    │   CUSTOMER PROFILE (public.customer_profiles)
    │       ├── auth_user_id
    │       ├── display_name, email, role ('customer' | 'admin'), account_status
    │       ├── avatar_seed, avatar_url
    │       ├── Personal birth details (date_of_birth, time_of_birth, place_of_birth, time_uncertain)
    │       └── Optional partner details (partner_name, partner_date_of_birth, partner_time_of_birth, etc.)
    │
    ├─► (1 : N)
    │   ORDER (public.orders)
    │       ├── auth_user_id, service_title, format, price_eur, status, scheduled_at
    │       ├── Client snapshot at booking (client_name, client_dob, client_tob, client_pob, client_time_uncertain)
    │       ├── Partner snapshot if applicable (partner_name, partner_dob, partner_tob, partner_pob, etc.)
    │       ├── Stripe receipt & payment details (payment_status, stripe_payment_intent_id)
    │       └── Customer review (review_rating, review_text, review_created_at)
    │       │
    │       ▼ (1 : 1 auto-snapshotted via trg_order_reading_details_snapshot)
    │   READING DETAILS (public.reading_details)
    │           ├── order_id (FK -> orders.id)
    │           ├── customer_id (FK -> customer_profiles.id)
    │           ├── service_id (FK -> services.id)
    │           ├── Snapshot client info for astrologer (client_name, client_date_of_birth, etc.)
    │           ├── Snapshot partner info for astrologer (partner_name, partner_date_of_birth, etc.)
    │           ├── Google Calendar event ID
    │           └── Reading status & admin notes
    │
    └─► (1 : 1 unique per user/email)
        FREE READING CLAIM (public.free_readings)
            ├── user_id (FK -> auth.users.id)
            ├── email (Unique lower email index)
            ├── reading_source_id (FK -> public.ascendant_readings.id)
            └── Astrological snapshot (ascendant, reading_content JSON, dob, tob, pob, coordinates)

CONTENT & CATALOG TABLES
    ├── public.ascendant_readings (12 Vedic Lagna definitions & rich content)
    ├── public.free_reading_content (Singleton 'free-reading' CMS copy & headings)
    ├── public.services (Active reading catalog & offerings)
    ├── public.testimonials (Client reviews & published status)
    ├── public.profiles (Astrologer bio, meet copy & vision)
    ├── public.contact_messages (Inbound enquiries & messages)
    ├── public.free_reading_requests (Legacy intake requests)
    └── public.website_notifications (System / user announcements)
```

---

## Table of Contents

1. [`public.ascendant_readings`](#1-publicascendantreadings)
2. [`public.availability_overrides`](#2-publicavailabilityoverrides)
3. [`public.availability_settings`](#3-publicavailabilitysettings)
4. [`public.availability_windows`](#4-publicavailabilitywindows)
5. [`public.booking_change_log`](#5-publicbookingchangelog)
6. [`public.booking_jobs`](#6-publicbookingjobs)
7. [`public.booking_refunds`](#7-publicbookingrefunds)
8. [`public.booking_requests`](#8-publicbookingrequests)
9. [`public.booking_reservations`](#9-publicbookingreservations)
10. [`public.contact_messages`](#10-publiccontactmessages)
11. [`public.customer_profiles`](#11-publiccustomerprofiles)
12. [`public.email_otp_verifications`](#12-publicemailotpverifications)
13. [`public.free_reading_content`](#13-publicfreereadingcontent)
14. [`public.free_reading_requests`](#14-publicfreereadingrequests)
15. [`public.free_readings`](#15-publicfreereadings)
16. [`public.google_calendar_connections`](#16-publicgooglecalendarconnections)
17. [`public.google_user_connections`](#17-publicgoogleuserconnections)
18. [`public.orders`](#18-publicorders)
19. [`public.profiles`](#19-publicprofiles)
20. [`public.reading_details`](#20-publicreadingdetails)
21. [`public.reading_private_notes`](#21-publicreadingprivatenotes)
22. [`public.services`](#22-publicservices)
23. [`public.stripe_webhook_events`](#23-publicstripewebhookevents)
24. [`public.testimonials`](#24-publictestimonials)
25. [`public.website_notifications`](#25-publicwebsitenotifications)
26. [Storage Buckets & Policies](#26-storage-buckets--policies)
27. [Database Functions, Triggers & Security Policies](#27-database-functions-triggers--security-policies)

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
| `content` | `jsonb` | Yes | — |

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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
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
    "updated_at": "2026-10-15 05:31:20.232313+00",
    "content": null
  }
]
```

---

### 2. `public.availability_overrides` (6 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `local_date` | `date` | **No** | — |
| `mode` | `text` | **No** | — |
| `start_local` | `time without time zone` | Yes | — |
| `end_local` | `time without time zone` | Yes | — |
| `note` | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "94b910fd-5995-425e-a04f-ec28ef67112a",
    "local_date": "2026-11-19",
    "mode": "blocked",
    "start_local": null,
    "end_local": null,
    "note": "Time off"
  },
  {
    "id": "7b08e9fa-d510-4a98-9256-b8756d4fec81",
    "local_date": "2026-11-20",
    "mode": "blocked",
    "start_local": "00:00:00",
    "end_local": "13:40:00",
    "note": "Custom hours"
  },
  {
    "id": "f70e0c10-1d69-4cd2-b182-7bd495afb288",
    "local_date": "2026-11-20",
    "mode": "extra_open",
    "start_local": "13:40:00",
    "end_local": "16:40:00",
    "note": "Custom hours"
  },
  {
    "id": "345e8dcb-43ae-4ae2-8f27-06ae9ca6179c",
    "local_date": "2026-11-20",
    "mode": "blocked",
    "start_local": "16:40:00",
    "end_local": "19:00:00",
    "note": "Custom hours"
  },
  {
    "id": "b37eb290-3727-47a9-ac88-5dd734ace5b7",
    "local_date": "2026-11-20",
    "mode": "extra_open",
    "start_local": "19:00:00",
    "end_local": "20:40:00",
    "note": "Custom hours"
  },
  {
    "id": "8e09e535-8cee-46c0-9bf9-5a5a124eaff4",
    "local_date": "2026-11-20",
    "mode": "blocked",
    "start_local": "20:40:00",
    "end_local": "23:59:00",
    "note": "Custom hours"
  }
]
```

---

### 3. `public.availability_settings` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `boolean` | **No** | `true` |
| `timezone` | `text` | **No** | `'Europe/Berlin'::text` |
| `min_notice_minutes` | `integer` | **No** | `15` |
| `advance_window_days` | `integer` | **No** | `30` |
| `hold_minutes` | `integer` | **No** | `5` |
| `buffer_minutes` | `integer` | **No** | `15` |
| `slot_step_minutes` | `integer` | **No** | `15` |
| `booking_enabled` | `boolean` | **No** | `false` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| `worker_last_seen_at` | `timestamp with time zone` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": true,
    "timezone": "Europe/Berlin",
    "min_notice_minutes": 15,
    "advance_window_days": 30,
    "hold_minutes": 5,
    "buffer_minutes": 15,
    "slot_step_minutes": 20,
    "booking_enabled": true,
    "updated_at": "2026-11-17 17:07:28.85998+00",
    "worker_last_seen_at": "2026-11-11 18:15:20.896+00"
  }
]
```

---

### 4. `public.availability_windows` (5 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `weekday` | `integer` | **No** | — |
| `start_local` | `time without time zone` | **No** | — |
| `end_local` | `time without time zone` | **No** | — |
| `enabled` | `boolean` | **No** | `true` |

**Current Live Data:**

```json
[
  {
    "id": "04e6a7e5-c3ad-4639-9b5c-ad4ba9b5fa39",
    "weekday": 1,
    "start_local": "18:00:00",
    "end_local": "21:00:00",
    "enabled": true
  },
  {
    "id": "cd440f7e-d675-43fb-a711-ae776b2542d4",
    "weekday": 2,
    "start_local": "18:00:00",
    "end_local": "21:00:00",
    "enabled": true
  },
  {
    "id": "a3d9f4d3-403a-4495-a13e-4e6564b6b1d6",
    "weekday": 3,
    "start_local": "18:00:00",
    "end_local": "21:00:00",
    "enabled": true
  },
  {
    "id": "87273cfb-132b-452a-9245-14dab2902241",
    "weekday": 4,
    "start_local": "18:00:00",
    "end_local": "21:00:00",
    "enabled": true
  },
  {
    "id": "17c08fa2-1aa2-43de-a254-0383b4451f22",
    "weekday": 5,
    "start_local": "18:00:00",
    "end_local": "21:00:00",
    "enabled": true
  }
]
```

---

### 5. `public.booking_change_log` (2 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| ⭐ **order_id** | `uuid` | **No** | — |
| `action` | `text` | **No** | — |
| `actor` | `uuid` | Yes | — |
| `previous_start` | `timestamp with time zone` | Yes | — |
| `new_start` | `timestamp with time zone` | Yes | — |
| `reason` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "2e2a98b3-41c8-437c-bd07-55c3ff846b20",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "action": "schedule",
    "actor": "02fe175d-562d-40ab-b6dd-084999bdc1e0",
    "previous_start": null,
    "new_start": "2026-11-11 17:00:00+00",
    "reason": null,
    "created_at": "2026-11-11 08:49:04.66848+00"
  },
  {
    "id": "966e3bae-f181-4a6e-ac8b-d322e4b4aeec",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "action": "refund",
    "actor": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "previous_start": null,
    "new_start": null,
    "reason": "Stripe-verified refund of 2000 cents",
    "created_at": "2026-11-17 17:22:41.38531+00"
  }
]
```

---

### 6. `public.booking_jobs` (17 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| ⭐ **order_id** | `uuid` | **No** | — |
| `kind` | `text` | **No** | — |
| `dedupe_key` | `text` | **No** | — |
| `version` | `integer` | **No** | `0` |
| `status` | `text` | **No** | `'pending'::text` |
| `run_at` | `timestamp with time zone` | **No** | `now()` |
| `lease_until` | `timestamp with time zone` | Yes | — |
| `lease_token` | `uuid` | Yes | — |
| `attempts` | `integer` | **No** | `0` |
| `last_error` | `text` | Yes | — |
| `provider_id` | `text` | Yes | — |
| `email_payload` | `jsonb` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `sent_at` | `timestamp with time zone` | Yes | — |
| `email_started_at` | `timestamp with time zone` | Yes | — |
| `refund_id` | `uuid` | Yes | — |
| `refund_status` | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": "86feb242-cd75-4b64-a9dd-a1dd8fe08683",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "availability_customer",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:availability:2419",
    "version": 0,
    "status": "skipped",
    "run_at": "2026-11-11 08:50:28.479+00",
    "lease_until": null,
    "lease_token": "db95b2e0-3eba-4552-b90c-2c9689c48640",
    "attempts": 3,
    "last_error": "Email provider returned 403.",
    "provider_id": null,
    "email_payload": {
      "to": [
        "ctrlxharsh@gmaill.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">Times are available for your voice reading</h1><p>Relationship Karma</p><p>Order reference: B2547E65</p><p>Available times have been added. Open your booking to choose one.</p><p><a href=\"http://localhost:3000/account/readings/b2547e65-1e51-47ea-a349-b0e283c749d8\">View your order and booking details</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "Times are available for your voice reading"
    },
    "created_at": "2026-11-11 08:46:24.01725+00",
    "sent_at": null,
    "email_started_at": "2026-11-11 08:46:57.767+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "e47355dd-bf57-4d00-bf45-62051e53f193",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "kind": "owner",
    "dedupe_key": "26d18fe5-2d75-4857-943a-678619e79cf6:owner:0",
    "version": 0,
    "status": "sent",
    "run_at": "2026-11-10 21:10:59.531123+00",
    "lease_until": null,
    "lease_token": "7a5d031f-674d-44e1-87ae-869c105723f9",
    "attempts": 1,
    "last_error": null,
    "provider_id": "01a1c74d-a4d8-7cff-9bd0-d37aeaa4c162",
    "email_payload": {
      "to": [
        "jainpragati4566@gmail.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">New TheAstroKaur order</h1><p>Career &amp; Money Reading</p><p>Order reference: 26D18FE5</p><p>Customer contact: ctrlxharsh@gmaill.com</p><p>Payment: paid. Status: confirmed.</p><p><a href=\"http://localhost:3000/admin/readings/26d18fe5-2d75-4857-943a-678619e79cf6\">Open order in admin</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "New TheAstroKaur order"
    },
    "created_at": "2026-11-10 21:10:59.531123+00",
    "sent_at": "2026-11-10 21:11:57.112+00",
    "email_started_at": "2026-11-10 21:11:55.385+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "334c3765-478d-4fc1-a98e-736ada98e27e",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-09",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 09:00:21.123667+00",
    "lease_until": null,
    "lease_token": "cad427cf-3c96-4846-8adb-94ff60ea072d",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 09:00:21.123667+00",
    "sent_at": "2026-11-11 09:00:28.678+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "6fa21ddf-6207-413b-8ae1-5ffce96941d3",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-04",
    "version": 1,
    "status": "pending",
    "run_at": "2026-11-11 18:38:55.541+00",
    "lease_until": null,
    "lease_token": "61d6ed15-c06b-4171-a11d-721b6841abd0",
    "attempts": 8,
    "last_error": "Connect or reconnect your Google Calendar to continue.",
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 16:00:21.581695+00",
    "sent_at": null,
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "67e28612-01cc-4184-baec-8174bbc0aa3a",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-03",
    "version": 1,
    "status": "pending",
    "run_at": "2026-11-11 18:39:23.325+00",
    "lease_until": null,
    "lease_token": "697e6239-a2b8-4aa6-88ca-1f771c15fcf1",
    "attempts": 10,
    "last_error": "Connect or reconnect your Google Calendar to continue.",
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 15:04:22.679865+00",
    "sent_at": null,
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "c53122df-5fb4-4654-9612-cd32baed999e",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "kind": "customer",
    "dedupe_key": "26d18fe5-2d75-4857-943a-678619e79cf6:customer:0",
    "version": 0,
    "status": "sent",
    "run_at": "2026-11-11 09:09:18.63+00",
    "lease_until": null,
    "lease_token": "59fe9d22-a778-4389-8768-346740403034",
    "attempts": 1,
    "last_error": null,
    "provider_id": "<booking-c53122df-5fb4-4654-9612-cd32baed999e@gmail.com>",
    "email_payload": {
      "to": [
        "ctrlxharsh@gmaill.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">Your written reading order is confirmed</h1><p>Career &amp; Money Reading</p><p>Order reference: 26D18FE5</p><p>Your payment has been received. The owner will personally contact you by email to discuss when to expect your reading, then email the completed reading to you.</p><p><a href=\"http://localhost:3000/account/readings/26d18fe5-2d75-4857-943a-678619e79cf6\">View your order and booking details</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "Your written reading order is confirmed"
    },
    "created_at": "2026-11-10 21:10:59.531123+00",
    "sent_at": "2026-11-11 09:09:25.067+00",
    "email_started_at": "2026-11-11 09:09:22.343+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "d586dee3-1321-42a0-83b4-0846f4b2de7f",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-10",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 10:00:21.233884+00",
    "lease_until": null,
    "lease_token": "58c38629-d04e-4d79-b2ab-b7c70b6f47e0",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 10:00:21.233884+00",
    "sent_at": "2026-11-11 10:00:29.652+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "41ee08b3-ee1e-441c-a27e-81b7060f1755",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-11",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 11:00:21.590623+00",
    "lease_until": null,
    "lease_token": "56b87c35-eb51-4642-82c7-3d2dc4e9ef57",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 11:00:21.590623+00",
    "sent_at": "2026-11-11 11:00:28.891+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "72912ceb-d63e-4bca-b2ca-a27030b6237d",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-12",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 12:00:21.525478+00",
    "lease_until": null,
    "lease_token": "11eb6426-c081-44e4-848a-509376e265db",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 12:00:21.525478+00",
    "sent_at": "2026-11-11 12:00:29.999+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "dcad2dbe-84b5-484f-a43c-c70859bea9b3",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-01",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 13:00:16.306839+00",
    "lease_until": null,
    "lease_token": "8cfb087c-683a-4c17-85af-5355aa72e692",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 13:00:16.306839+00",
    "sent_at": "2026-11-11 13:00:24.404+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "350aca95-285e-4a5a-b886-5df1ac6c9806",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-02",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 14:00:17.352764+00",
    "lease_until": null,
    "lease_token": "c9770cd9-3ac8-4597-a2ba-9897dbb35f9e",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 14:00:17.352764+00",
    "sent_at": "2026-11-11 14:00:25.905+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "7368c690-c3ef-4d78-b006-8923029a2c8a",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "schedule_owner",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:schedule_owner:0",
    "version": 0,
    "status": "sent",
    "run_at": "2026-11-11 08:40:53.911436+00",
    "lease_until": null,
    "lease_token": "6b313f51-f1fd-4844-bf8a-3abc30d629e4",
    "attempts": 1,
    "last_error": null,
    "provider_id": "01a1c9c4-db50-75fb-b4ea-acccab8f68bd",
    "email_payload": {
      "to": [
        "jainpragati4566@gmail.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">A paid voice reading needs scheduling</h1><p>Relationship Karma</p><p>Order reference: B2547E65</p><p>Please contact the customer to arrange a call if no suitable time is available.</p><p>Customer contact: ctrlxharsh@gmaill.com</p><p>Payment: paid. Status: awaiting_schedule.</p><p><a href=\"http://localhost:3000/admin/readings/b2547e65-1e51-47ea-a349-b0e283c749d8\">Open order in admin</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "A paid voice reading needs scheduling"
    },
    "created_at": "2026-11-11 08:40:53.911436+00",
    "sent_at": "2026-11-11 08:41:24.205+00",
    "email_started_at": "2026-11-11 08:41:22.592+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "ad54d442-a1b6-4bcd-9876-9a11f8674305",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:calendar:1",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 08:49:04.66848+00",
    "lease_until": null,
    "lease_token": "e7b5a58e-3e4c-49c8-8d21-f444a192d712",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 08:49:04.66848+00",
    "sent_at": "2026-11-11 08:49:59.176+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "c4af10d3-1bcc-409b-9cd3-10eb094dc304",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "owner",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:owner:1",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 08:49:04.66848+00",
    "lease_until": null,
    "lease_token": "c6ee4650-71b5-42b0-8ac8-4e012f1a3a00",
    "attempts": 1,
    "last_error": null,
    "provider_id": "01a1c9cd-170b-7414-9e5e-c317db8dab64",
    "email_payload": {
      "to": [
        "jainpragati4566@gmail.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">New TheAstroKaur order</h1><p>Relationship Karma</p><p>Order reference: B2547E65</p><p>Wednesday, 11 November 2026 at 22:30 (Asia/Calcutta)</p><p><a href=\"https://meet.google.com/cre-mrtz-rfa\">Join your Google Meet consultation</a></p><p>Customer contact: ctrlxharsh@gmaill.com</p><p>Payment: paid. Status: confirmed.</p><p><a href=\"http://localhost:3000/admin/readings/b2547e65-1e51-47ea-a349-b0e283c749d8\">Open order in admin</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "New TheAstroKaur order"
    },
    "created_at": "2026-11-11 08:49:04.66848+00",
    "sent_at": "2026-11-11 08:50:23.809+00",
    "email_started_at": "2026-11-11 08:50:22.733+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "dc1ca407-8a75-4e77-af65-5fd1f0dd5a9b",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "calendar",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reconcile:1:2026-11-11-08",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 08:49:21.046449+00",
    "lease_until": null,
    "lease_token": "b9117b7e-446a-49e7-ad18-fa95c36c5e68",
    "attempts": 1,
    "last_error": null,
    "provider_id": null,
    "email_payload": null,
    "created_at": "2026-11-11 08:49:21.046449+00",
    "sent_at": "2026-11-11 08:50:58.065+00",
    "email_started_at": null,
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "9f925dd0-7473-4ec9-be24-76c6ef8dfd4a",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "customer",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:customer:1",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 09:09:18.166+00",
    "lease_until": null,
    "lease_token": "80527fa5-40fb-439e-a4ff-10b53136114e",
    "attempts": 1,
    "last_error": null,
    "provider_id": "<booking-9f925dd0-7473-4ec9-be24-76c6ef8dfd4a@gmail.com>",
    "email_payload": {
      "to": [
        "ctrlxharsh@gmaill.com"
      ],
      "from": "onboarding@resend.dev",
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">Your consultation is confirmed</h1><p>Relationship Karma</p><p>Order reference: B2547E65</p><p>Wednesday, 11 November 2026 at 22:30 (Asia/Calcutta)</p><p><a href=\"https://meet.google.com/cre-mrtz-rfa\">Join your Google Meet consultation</a></p><p><a href=\"http://localhost:3000/account/readings/b2547e65-1e51-47ea-a349-b0e283c749d8\">View your order and booking details</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "Your consultation is confirmed"
    },
    "created_at": "2026-11-11 08:49:04.66848+00",
    "sent_at": "2026-11-11 09:09:29.753+00",
    "email_started_at": "2026-11-11 09:09:26.927+00",
    "refund_id": null,
    "refund_status": null
  },
  {
    "id": "7ad4f8df-cede-4197-9df8-2a73e0dbbee6",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "kind": "reminder",
    "dedupe_key": "b2547e65-1e51-47ea-a349-b0e283c749d8:reminder:1",
    "version": 1,
    "status": "sent",
    "run_at": "2026-11-11 16:00:00+00",
    "lease_until": null,
    "lease_token": "ed1b992f-bb33-4b65-a48a-fcbfc7eca6ca",
    "attempts": 1,
    "last_error": null,
    "provider_id": "<booking-7ad4f8df-cede-4197-9df8-2a73e0dbbee6@gmail.com>",
    "email_payload": {
      "to": [
        "ctrlxharsh@gmail.com"
      ],
      "html": "<div style=\"background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842\"><h1 style=\"font-family:Georgia,serif;font-weight:normal\">Your consultation reminder</h1><p>Relationship Karma</p><p>Order reference: B2547E65</p><p>Wednesday, 11 November 2026 at 22:30 (Asia/Calcutta)</p><p>The owner will contact you personally to share the call details.</p><p><a href=\"http://localhost:3000/account/readings/b2547e65-1e51-47ea-a349-b0e283c749d8\">View your order and booking details</a></p><p>With warmth,<br>TheAstroKaur</p></div>",
      "subject": "Your consultation reminder",
      "reply_to": "pragatijain841@gmail.com"
    },
    "created_at": "2026-11-11 08:49:04.66848+00",
    "sent_at": "2026-11-11 16:00:27.168+00",
    "email_started_at": "2026-11-11 16:00:23.839+00",
    "refund_id": null,
    "refund_status": null
  }
]
```

---

### 7. `public.booking_refunds` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| ⭐ **order_id** | `uuid` | **No** | — |
| `stripe_refund_id` | `text` | Yes | — |
| `amount_cents` | `integer` | **No** | — |
| `currency` | `text` | **No** | — |
| `status` | `text` | **No** | — |
| `reason` | `text` | **No** | — |
| `actor` | `uuid` | Yes | — |
| `failure_reason` | `text` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "7ca60bce-7643-496a-ab77-511a58c94499",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "stripe_refund_id": "re_3UaMJO9UM1YXl2IE1voFgLSW",
    "amount_cents": 2000,
    "currency": "eur",
    "status": "succeeded",
    "reason": "Previously recorded Stripe refund",
    "actor": null,
    "failure_reason": null,
    "created_at": "2026-11-17 18:02:56.258616+00",
    "updated_at": "2026-11-17 18:02:56.258616+00"
  }
]
```

---

### 8. `public.booking_requests` (0 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| ⭐ **order_id** | `uuid` | **No** | — |
| `actor` | `uuid` | **No** | — |
| `kind` | `text` | **No** | — |
| `reason` | `text` | **No** | — |
| `status` | `text` | **No** | `'pending'::text` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

*(Table is currently empty / 0 rows)*

---

### 9. `public.booking_reservations` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| ⭐ **order_id** | `uuid` | **No** | — |
| `owner_id` | `text` | **No** | `'primary'::text` |
| `starts_at` | `timestamp with time zone` | **No** | — |
| `ends_at` | `timestamp with time zone` | **No** | — |
| `blocked_until` | `timestamp with time zone` | **No** | — |
| `state` | `text` | **No** | — |
| `hold_expires_at` | `timestamp with time zone` | Yes | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "98182b4b-4b86-44bc-b58b-6272883a2e7c",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "owner_id": "primary",
    "starts_at": "2026-11-11 17:00:00+00",
    "ends_at": "2026-11-11 17:30:00+00",
    "blocked_until": "2026-11-11 17:45:00+00",
    "state": "confirmed",
    "hold_expires_at": null,
    "created_at": "2026-11-11 08:49:04.66848+00",
    "updated_at": "2026-11-11 08:49:04.66848+00"
  }
]
```

---

### 10. `public.contact_messages` (13 rows)

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
  },
  {
    "id": "6ffe5976-b782-43d4-a373-3d45c65fb2d9",
    "sender_name": "yashi",
    "email": "jainpragati4566@gmail.com",
    "subject": "Booking Enquiry",
    "message": "can we do it at lower price",
    "status": "unread",
    "created_at": "2026-11-17 12:52:34.617+00",
    "updated_at": "2026-11-17 12:52:34.617+00"
  }
]
```

---

### 11. `public.customer_profiles` (8 rows)

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
    "id": "f7eb6aca-2211-48f3-bf62-0839f60febad",
    "auth_user_id": "16b6d7c1-e717-49fb-8c77-fd74098a1869",
    "display_name": null,
    "email": "testadmin999@gmail.com",
    "date_of_birth": "1995-08-15",
    "time_of_birth": "14:30:00",
    "time_uncertain": false,
    "place_of_birth": "New Delhi, Delhi, India",
    "avatar_seed": null,
    "created_at": "2026-10-11 18:29:46.597559+00",
    "updated_at": "2026-10-15 09:00:26.915639+00",
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
    "id": "0bd2fa94-a01d-4f58-8802-c2a55edc7e93",
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "display_name": "Pragati Jain",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": "2003-11-19",
    "time_of_birth": "01:45:00",
    "time_uncertain": false,
    "place_of_birth": "Aligarh, Koil, Aligarh, Uttar Pradesh, 202001, India",
    "avatar_seed": null,
    "created_at": "2026-10-03 18:20:01.629501+00",
    "updated_at": "2026-10-22 17:38:24.261733+00",
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
    "id": "7b9fc2d9-5d08-4995-ab8b-61f4276467ff",
    "auth_user_id": "e34a4077-eaac-4a33-9c8b-6ee3f13b3077",
    "display_name": null,
    "email": "kaurharvinder92@gmail.com",
    "date_of_birth": "1993-08-16",
    "time_of_birth": "03:00:00",
    "time_uncertain": false,
    "place_of_birth": "Mumbai, Mumbai Suburban District, Maharashtra, 400051, India",
    "avatar_seed": null,
    "created_at": "2026-10-14 07:52:51.084467+00",
    "updated_at": "2026-10-22 19:01:41.681961+00",
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
    "updated_at": "2026-11-10 19:48:42.415136+00",
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
    "id": "6f31accf-6b8a-4f64-a3e5-c1ae48a7b39d",
    "auth_user_id": "02fe175d-562d-40ab-b6dd-084999bdc1e0",
    "display_name": null,
    "email": "ctrlxharsh@gmail.com",
    "date_of_birth": null,
    "time_of_birth": null,
    "time_uncertain": false,
    "place_of_birth": null,
    "avatar_seed": null,
    "created_at": "2026-11-10 19:53:19.186962+00",
    "updated_at": "2026-11-11 11:33:24.743321+00",
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
    "id": "04a631bf-4b84-4688-a9c7-9eb652d84573",
    "auth_user_id": "23e7b478-9cd7-40c9-add2-25d82b5fc9d6",
    "display_name": "Manas Jain",
    "email": "jjyes90@gmail.com",
    "date_of_birth": "2026-11-17",
    "time_of_birth": "18:35:00",
    "time_uncertain": false,
    "place_of_birth": "New Delhi",
    "avatar_seed": null,
    "created_at": "2026-11-17 13:07:54.148789+00",
    "updated_at": "2026-11-17 13:43:07.94774+00",
    "role": "customer",
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "account_status": "active",
    "avatar_url": "https://qdnwmfriilknnwqrepuy.supabase.co/storage/v1/object/public/custom_profle_photo/23e7b478-9cd7-40c9-add2-25d82b5fc9d6/avatar.webp?t=1794922987105"
  }
]
```

---

### 12. `public.email_otp_verifications` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `email` | `text` | **No** | — |
| `otp_hash` | `text` | **No** | — |
| `purpose` | `text` | **No** | — |
| `attempts` | `integer` | **No** | `0` |
| `metadata` | `jsonb` | Yes | — |
| `expires_at` | `timestamp with time zone` | **No** | — |
| `created_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "14c2bcd5-4645-4aac-a305-f887d9fd49de",
    "email": "testadmin999@gmail.com",
    "otp_hash": "7f3531e200d0de2bb433810ea92c8cde603a5656c468398459f224a7de69c6e0",
    "purpose": "reset_password",
    "attempts": 0,
    "metadata": null,
    "expires_at": "2026-11-11 11:39:18.243+00",
    "created_at": "2026-11-11 11:29:18.409115+00"
  }
]
```

---

### 13. `public.free_reading_content` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **No** | — |
| `content` | `jsonb` | **No** | `'{}'::jsonb` |
| `created_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "free-reading",
    "content": {
      "cta_quote": "Your Ascendant is the beginning. Your complete chart tells the story.",
      "cta_accent": "Book a personalized Vedic Astrology Reading with me.",
      "cta_heading": "Want to Discover Your Story?",
      "result_label": "Your Mini Reading",
      "section_intro": "In authentic Vedic astrology, your Lagna (Rising Sign) is the sacred gateway to your chart\u2014defining your instinctive vitality, core character, and life orientation.",
      "cta_description": "Your Ascendant is only the beginning. Explore your relationships, career, and life path through a personalised Vedic reading.",
      "section_heading": "Discover Your Vedic Ascendant",
      "sign_in_heading": "Sign In to Claim Your Free Reading",
      "eligibility_note": "One free personalized reading per verified email \u00b7 Calculated using Lahiri Ayanamsha",
      "cta_primary_label": "Book a Reading",
      "cta_secondary_label": "View All 1-on-1 Services",
      "sign_in_description": "To ensure one complimentary reading per seeker and securely save your calculated result to your private account, please sign in or register below."
    },
    "created_at": "2026-10-15 20:43:30.668425+00",
    "updated_at": "2026-10-15 20:43:30.668425+00"
  }
]
```

---

### 14. `public.free_reading_requests` (3 rows)

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

### 15. `public.free_readings` (5 rows)

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
    "id": "43dc9dc1-e343-4512-b100-d400f7e85c4e",
    "user_id": "16b6d7c1-e717-49fb-8c77-fd74098a1869",
    "email": "testadmin999@gmail.com",
    "date_of_birth": "1995-08-15",
    "time_of_birth": "14:30:00",
    "place_of_birth": "New Delhi, Delhi, India",
    "latitude": "28.613895",
    "longitude": "77.209006",
    "timezone": "5.50",
    "ascendant": "Scorpio",
    "reading_content": "{\"sign\":\"Scorpio\",\"sanskritName\":\"Vrischika\",\"ruler\":\"Mars & Ketu (Mangal & Ketu)\",\"element\":\"Water\",\"quality\":\"Fixed\",\"glyph\":\"\u264f\",\"iconPath\":\"/zodiac/scorpio.svg\",\"overview\":\"With Scorpio on the Ascendant, your chart is governed by Mars and co-ruled by Ketu in Vedic astrology. You are a soul of extraordinary psychological depth, transformative power, and unwavering spiritual determination.\",\"personalityTraits\":\"You carry an intense, magnetic, and perceptive presence that pierces beneath surface illusions. You rarely engage in superficial chatter; you seek truth, authenticity, and profound connection. Resilient beyond measure, you have an innate capacity to rise from adversity transformed and stronger.\",\"lifePathGuidance\":\"Your life is an alchemical journey of emotional mastery and spiritual rebirth. Learning to surrender control, trust the natural rhythm of life, and transmute intensity into healing wisdom is your highest destiny.\",\"strengths\":[\"Incredible psychological insight and radar for authenticity\",\"Unmatched resilience, inner courage, and transformative power\",\"Fierce, lifelong loyalty to those who earn your sacred trust\",\"Deep focus and investigative ability to master complex mysteries\"],\"growthAreas\":[\"Practicing conscious emotional forgiveness to release old grudges\",\"Opening up gradually to trust worthy individuals without guarded suspicion\",\"Channeling intense emotional energy into creative, spiritual regeneration\"],\"coreEnergy\":{\"emoji\":\"\ud83e\udd82\",\"title\":\"Your Core Energy\",\"paragraphs\":[\"You are intensely perceptive, emotionally profound, private and magnetically resilient.\",\"You do not navigate life on the surface. You instinctively read between the lines, sense hidden motives, and perceive what is left unsaid.\",\"You possess immense inner strength\u2014when life brings crises or radical changes, you do not crumble; you endure, adapt, and transform.\"],\"challenge\":\"Your challenge? Trust and control. Because you feel so deeply and remember every wound, you can build impenetrable emotional fortresses, harbor suspicion, or struggle to let go.\",\"quote\":\"\u00ab\\\"True power is not holding on to control; it is trusting your ability to rise after whatever falls away.\\\"\u00bb\"},\"careerSuccess\":{\"title\":\"Career & Success\",\"paragraphs\":[\"You are drawn to work that requires depth, strategy, investigative intellect and real substance.\",\"You thrive in psychology, medicine, surgery, finance, investigative research, crisis management, occult/astrology, strategy, and transformative leadership.\",\"You have exceptional focus and tenacity: once you commit to a mission, you work quietly in the dark until victory is secured.\",\"Your greatest career achievements occur when you use your strategic depth to solve problems others are afraid to touch.\"],\"lessonQuote\":\"Your silence is your strategic advantage\u2014when you move, you move with decisive precision.\"},\"loveRelationships\":{\"title\":\"Love & Relationships\",\"paragraphs\":[\"For you, love is a sacred, all-or-nothing union. Casual connections do not interest your soul.\",\"You demand absolute honesty, emotional transparency, and unbreakable loyalty. In return, you offer fierce devotion that endures through every storm.\"],\"values\":[\"absolute loyalty\",\"emotional depth\",\"unwavering honesty\",\"mutual protection\",\"soul-level intimacy\"],\"questionOrLesson\":\"Your deepest relationship test is learning the courage of vulnerability:\\n\\n\u00ab\\\"Can I lower my armor and let myself be truly seen without fearing that love will be used against me?\\\"\u00bb\\n\\nWhen you dare to trust the right partner, love becomes your most profound vehicle of healing.\"},\"moneySecurity\":{\"title\":\"Money & Material Security\",\"paragraphs\":[\"You have sharp financial instincts and a natural understanding of shared resources, investments, and wealth regeneration.\",\"You keep your financial affairs private and strategic, preferring to build quiet independence rather than ostentatious display.\",\"Your wealth expands when you channel your natural discipline into long-term compounding and transformative ventures.\"],\"quote\":\"\u00ab\\\"Real wealth is self-sufficiency and the wisdom to turn adversity into asset.\\\"\u00bb\"},\"emotionalWorld\":{\"title\":\"Your Emotional World\",\"paragraphs\":[\"Beneath your composed, enigmatic exterior lies an ocean of deep emotional currents.\",\"You process feelings internally, rarely letting the world see your pain until you have fully metabolized it.\",\"Learning to release emotional toxins\u2014forgiving without forgetting\u2014is essential for your vitality and mental lightness.\",\"Your individual birth chart reveals how Mars, Ketu, and your Moon navigate your emotional rebirths.\"]},\"hiddenPotential\":{\"emoji\":\"\u2728\",\"title\":\"Your Hidden Potential\",\"paragraphs\":[\"You have the rare energy of the Phoenix.\",\"No matter what challenges, betrayals, or upheavals you encounter, you possess an uncanny ability to burn down the obsolete and rise stronger, wiser, and more radiant.\",\"When you channel your immense intensity into healing and purposeful creation, you become an unstoppable catalyst for transformation.\"]},\"firstLayerBullets\":[{\"emoji\":\"\u2764\ufe0f\",\"text\":\"Your deep relationship karma and finding genuine soul-aligned trust\"},{\"emoji\":\"\ud83d\udcbc\",\"text\":\"Your career destiny and leveraging your investigative and strategic power\"},{\"emoji\":\"\ud83d\udcb0\",\"text\":\"Your financial transformation cycles and wealth regeneration\"},{\"emoji\":\"\ud83c\udf19\",\"text\":\"Your emotional underworld and releasing subconscious self-protective walls\"},{\"emoji\":\"\ud83d\udd25\",\"text\":\"Mastering your personal power without fear of loss or betrayal\"},{\"emoji\":\"\ud83e\uddff\",\"text\":\"Karmic initiations, ancestral patterns, and occult sensitivities\"},{\"emoji\":\"\u23f3\",\"text\":\"Timing of major evolutionary rebirths and planetary milestones\"}]}",
    "reading_source_id": "cfd35db8-a621-4ad0-a209-042268802d7b",
    "status": "completed",
    "created_at": "2026-10-15 09:00:26.533399+00",
    "updated_at": "2026-10-15 09:00:25.781+00"
  },
  {
    "id": "36f84ae0-4fe2-457d-aa18-3fcc49a7eba7",
    "user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": "2003-11-19",
    "time_of_birth": "01:45:00",
    "place_of_birth": "Aligarh, Koil, Aligarh, Uttar Pradesh, 202001, India",
    "latitude": "27.881541",
    "longitude": "78.069022",
    "timezone": "5.50",
    "ascendant": "Leo",
    "reading_content": "{\"sign\":\"Leo\",\"sanskritName\":\"Simha\",\"ruler\":\"Sun (Surya)\",\"element\":\"Fire\",\"quality\":\"Fixed\",\"glyph\":\"\u264c\",\"iconPath\":\"/zodiac/leo.svg\",\"overview\":\"Rising in Leo, your chart is guided by the Sun, the cosmic source of vitality, sovereignty, and purposeful self-expression. You radiate dignity, generous warmth, and an innate nobility of character.\",\"personalityTraits\":\"You possess a magnetic and honorable presence. You lead naturally through benevolence rather than force, uplifting those around you with authentic encouragement. You take genuine pride in your integrity and desire your endeavors to leave a meaningful, uplifting impact on the world.\",\"lifePathGuidance\":\"Your soul's calling is to shine as a warm, unconditional source of light. True leadership for a Leo Ascendant is realized when your inner confidence is anchored in spiritual purpose rather than external validation.\",\"strengths\":[\"Inspiring natural charisma, confidence, and radiant vitality\",\"Generous, noble heart that champions the well-being of others\",\"Unshakable sense of personal integrity and creative passion\",\"Natural mentor and encouraging protector of your inner circle\"],\"growthAreas\":[\"Accepting constructive feedback with an open, non-defensive mindset\",\"Sharing the spotlight and recognizing the quiet contributions of others\",\"Allowing yourself vulnerability and resting from the burden of always being strong\"],\"coreEnergy\":{\"emoji\":\"\u2600\ufe0f\",\"title\":\"Your Core Energy\",\"paragraphs\":[\"You are naturally charismatic, warm-hearted, dignified and creatively expressive.\",\"Ruled by the Sun, the source of light and vitality, you carry an innate desire to live authentically, create something meaningful and stand tall in your truth.\",\"You have a generous spirit and a natural leadership aura\u2014people instinctively feel your warmth and presence.\"],\"challenge\":\"Your challenge? A sensitive pride. You can feel deeply wounded by disrespect, lack of recognition or being taken for granted, sometimes masking hurt with stubbornness.\",\"quote\":\"\u00ab\\\"True royalty doesn't demand the crown; it leads by lifting others into their own light.\\\"\u00bb\"},\"careerSuccess\":{\"title\":\"Career & Success\",\"paragraphs\":[\"You are not built to remain hidden in the background or work under micro-managing oversight.\",\"You thrive when you have creative autonomy, visibility, leadership authority, or the freedom to spearhead meaningful initiatives.\",\"You excel in entrepreneurship, management, public speaking, arts, creative direction, luxury, politics or any field where vision and heart align.\",\"Your success compounds exponentially when you transition from proving yourself to serving a higher mission.\"],\"lessonQuote\":\"When your ambition is powered by genuine service, your influence becomes timeless.\"},\"loveRelationships\":{\"title\":\"Love & Relationships\",\"paragraphs\":[\"In love, you love with your entire heart\u2014generously, passionately, and with royal devotion.\",\"You need a partner who genuinely admires, respects and celebrates who you are, without competing with your light.\"],\"values\":[\"mutual admiration\",\"unshakable respect\",\"romantic passion\",\"loyalty\",\"playful joy\"],\"questionOrLesson\":\"Your greatest relationship growth comes from opening the private door to your vulnerability:\\n\\n\u00ab\\\"Can I let my partner see my doubts and fears without feeling that my strength is compromised?\\\"\u00bb\\n\\nWhen you allow yourself to be seen in your softness, love becomes your deepest sanctuary.\"},\"moneySecurity\":{\"title\":\"Money & Security\",\"paragraphs\":[\"You enjoy living well and sharing generously with those you love.\",\"Your natural instinct can be to spend on quality, beauty and memorable experiences, but you also have a strong drive to build financial independence.\",\"Your wealth expands sustainably when you align your financial choices with long-term legacy rather than short-term prestige.\"],\"quote\":\"\u00ab\\\"True prosperity is having both the freedom to enjoy life and the stability to sustain it.\\\"\u00bb\"},\"emotionalWorld\":{\"title\":\"Your Emotional World\",\"paragraphs\":[\"You often feel you must stay strong, composed and radiant for everyone around you.\",\"Because of your pride, you rarely show when you are feeling hurt or overlooked.\",\"Giving yourself permission to rest, drop the armor, and be comforted without expectation is vital for your emotional renewal.\",\"Your individual birth chart reveals how your solar vitality and lunar heart balance each other.\"]},\"hiddenPotential\":{\"emoji\":\"\u2728\",\"title\":\"Your Hidden Potential\",\"paragraphs\":[\"You have the rare energy of the sovereign heart.\",\"You can ignite courage in discouraged hearts, inspire teams to achieve the impossible, and lead with unmatched nobility.\",\"When your inner light is anchored in humility and love, your impact reverberates far beyond your immediate sphere.\"]},\"firstLayerBullets\":[{\"emoji\":\"\u2764\ufe0f\",\"text\":\"Your relationship patterns and what your heart truly desires in love\"},{\"emoji\":\"\ud83d\udcbc\",\"text\":\"Your career calling and where your leadership shines brightest\"},{\"emoji\":\"\ud83d\udcb0\",\"text\":\"Your wealth potential and building enduring material legacy\"},{\"emoji\":\"\ud83c\udf19\",\"text\":\"Your emotional inner life and releasing the need to always be strong\"},{\"emoji\":\"\ud83d\udd25\",\"text\":\"How you express creative vision and navigate competitive dynamics\"},{\"emoji\":\"\ud83e\uddff\",\"text\":\"Karmic lessons surrounding ego, dignity, and authentic self-expression\"},{\"emoji\":\"\u23f3\",\"text\":\"Key planetary timeframes when your visibility and opportunities peak\"}]}",
    "reading_source_id": "a84f2998-46ef-494a-a7d6-fa9e8eeabcd9",
    "status": "completed",
    "created_at": "2026-10-15 05:37:38.932037+00",
    "updated_at": "2026-10-22 17:38:23.369+00"
  },
  {
    "id": "18555bef-7916-4af3-8049-50bfa2c0182c",
    "user_id": "e34a4077-eaac-4a33-9c8b-6ee3f13b3077",
    "email": "kaurharvinder92@gmail.com",
    "date_of_birth": "1993-08-16",
    "time_of_birth": "03:00:00",
    "place_of_birth": "Mumbai, Mumbai Suburban District, Maharashtra, 400051, India",
    "latitude": "19.054999",
    "longitude": "72.869204",
    "timezone": "5.50",
    "ascendant": "Gemini",
    "reading_content": "{\"sign\":\"Gemini\",\"sanskritName\":\"Mithuna\",\"ruler\":\"Mercury (Budha)\",\"element\":\"Air\",\"quality\":\"Mutable\",\"glyph\":\"\u264a\",\"iconPath\":\"/zodiac/gemini.svg\",\"overview\":\"Rising in Gemini, your soul's lens is illuminated by Mercury, the planet of intellect, language, and curiosity. You are an agile thinker, gifted communicator, and natural weaver of ideas, perspectives, and human connections.\",\"personalityTraits\":\"You exude a youthful, vibrant, and intellectually curious aura. Your mind moves with remarkable speed, continuously absorbing information and spotting innovative linkages that others miss. You are versatile, witty, and naturally diplomatic, capable of relating to people from all walks of life.\",\"lifePathGuidance\":\"Your primary life lessons center on depth over breadth. While your capacity for learning is boundless, your greatest breakthroughs will arrive when you channel your brilliant mind into committed mastery of your chosen craft.\",\"strengths\":[\"Exceptional verbal and written communication abilities\",\"High cognitive adaptability and lightning-fast learning curve\",\"Engaging conversationalist who naturally builds social bridges\",\"Curious, open-minded approach to diverse philosophies\"],\"growthAreas\":[\"Guarding against mental exhaustion by incorporating grounding silent practices\",\"Following through on core endeavors before jumping to the next inspiring concept\",\"Trusting intuitive feeling as much as analytical rationalization\"],\"coreEnergy\":{\"emoji\":\"\ud83c\udf2c\ufe0f\",\"title\":\"Your Core Energy\",\"paragraphs\":[\"You are naturally curious, mentally agile and energized by ideas, conversations and new experiences.\",\"You often feel best when your mind is engaged rather than stagnant. You may be someone who loves learning, asking questions, connecting diverse people and spotting angles others miss.\",\"You can have a natural gift for communication\u2014whether speaking, writing, sharing knowledge or simply bringing lightness into a room.\"],\"challenge\":\"Your challenge? Your mind can move in so many directions at once that you may feel scattered, restless or easily bored when something requires prolonged repetition.\",\"quote\":\"\u00ab\\\"Curiosity opens doors\u2014but commitment builds the room you want to live in.\\\"\u00bb\"},\"careerSuccess\":{\"title\":\"Career & Success\",\"paragraphs\":[\"You are unlikely to stay engaged in work that feels monotonous, rigid or mentally stifling.\",\"You may thrive where you can communicate, synthesize information, network, write, teach, trade or navigate fast-moving environments.\",\"There is often a natural adaptability in you: you can wear multiple hats with remarkable ease.\",\"Your real professional breakthrough happens when you choose one or two core domains to master deeply rather than staying at the surface of ten.\"],\"lessonQuote\":\"Your versatility is your superpower\u2014when paired with patience, you become virtually unstoppable.\"},\"loveRelationships\":{\"title\":\"Love & Relationships\",\"paragraphs\":[\"You need a partner who can meet you mentally as well as emotionally.\",\"If there is no intellectual stimulation, laughter or genuine dialogue, the connection can quickly lose its spark.\"],\"values\":[\"mental connection\",\"humor\",\"open dialogue\",\"shared curiosity\",\"emotional lightness\"],\"questionOrLesson\":\"One of your deepest relationship lessons is moving from surface curiosity to authentic vulnerability:\\n\\n\u00ab\\\"Can I allow someone to know the quiet parts of me, not just the quick and clever parts?\\\"\u00bb\\n\\nWhen you find a partner who appreciates both your lively mind and your sensitive heart, intimacy becomes your safest anchor.\"},\"moneySecurity\":{\"title\":\"Money & Security\",\"paragraphs\":[\"You may have the capacity to generate income from diverse channels or adaptable skills.\",\"Your natural instinct can be flexible and opportunistic, but you benefit immensely from establishing consistent financial habits and automated saving structures.\",\"When you channel your quick intellect into long-term financial planning, you create security without feeling restricted.\"],\"quote\":\"\u00ab\\\"Financial freedom comes from focused discipline, not endless multitasking.\\\"\u00bb\"},\"emotionalWorld\":{\"title\":\"Your Emotional World\",\"paragraphs\":[\"You may instinctively rationalize or analyze your feelings before allowing yourself to actually feel them.\",\"When emotions become intense, your impulse might be to talk through them, distract yourself with information, or brush them off with humor.\",\"One of your most profound lessons is slowing down enough to sit in quiet reflection and give your heart the same attention you give your mind.\",\"Your personal birth chart reveals how your Moon and Mercury interact to shape your emotional balance.\"]},\"hiddenPotential\":{\"emoji\":\"\u2728\",\"title\":\"Your Hidden Potential\",\"paragraphs\":[\"You have the rare gift of the bridge-builder.\",\"You can translate complex ideas into clear language, bridge misunderstandings between different worlds, and breathe new life into stagnant situations.\",\"When you focus your brilliant mind onto a singular purposeful mission, you don't just share knowledge\u2014you inspire transformation.\"]},\"firstLayerBullets\":[{\"emoji\":\"\u2764\ufe0f\",\"text\":\"Your relationship patterns and what you truly need in love\"},{\"emoji\":\"\ud83d\udcbc\",\"text\":\"Your career direction and where your intellectual gifts thrive\"},{\"emoji\":\"\ud83d\udcb0\",\"text\":\"Your financial habits and creating sustainable stability\"},{\"emoji\":\"\ud83c\udf19\",\"text\":\"Your emotional needs and inner mental peace\"},{\"emoji\":\"\ud83d\udd25\",\"text\":\"How you handle decision-making and avoid overwhelm\"},{\"emoji\":\"\ud83e\uddff\",\"text\":\"Recurring life patterns and deeper karmic themes\"},{\"emoji\":\"\u23f3\",\"text\":\"When important planetary cycles and life shifts become active\"}]}",
    "reading_source_id": "bd794537-5f2c-4c4f-a45e-b91c13867e63",
    "status": "completed",
    "created_at": "2026-10-22 17:40:13.765545+00",
    "updated_at": "2026-10-22 19:01:41.012+00"
  },
  {
    "id": "7cafa820-980a-4465-9108-fc8a4c26115f",
    "user_id": "54d730b2-150b-4100-b5e6-5fccc6a5809e",
    "email": "priya.sharma91@gmail.com",
    "date_of_birth": "1993-11-20",
    "time_of_birth": "08:45:00",
    "place_of_birth": "London, UK",
    "latitude": "51.507446",
    "longitude": "-0.127765",
    "timezone": "0.00",
    "ascendant": "Scorpio",
    "reading_content": "{\"sign\":\"Scorpio\",\"sanskritName\":\"Vrischika\",\"ruler\":\"Mars & Ketu (Mangal & Ketu)\",\"element\":\"Water\",\"quality\":\"Fixed\",\"glyph\":\"\u264f\",\"iconPath\":\"/zodiac/scorpio.svg\",\"overview\":\"With Scorpio on the Ascendant, your chart is governed by Mars and co-ruled by Ketu in Vedic astrology. You are a soul of extraordinary psychological depth, transformative power, and unwavering spiritual determination.\",\"personalityTraits\":\"You carry an intense, magnetic, and perceptive presence that pierces beneath surface illusions. You rarely engage in superficial chatter; you seek truth, authenticity, and profound connection. Resilient beyond measure, you have an innate capacity to rise from adversity transformed and stronger.\",\"lifePathGuidance\":\"Your life is an alchemical journey of emotional mastery and spiritual rebirth. Learning to surrender control, trust the natural rhythm of life, and transmute intensity into healing wisdom is your highest destiny.\",\"strengths\":[\"Incredible psychological insight and radar for authenticity\",\"Unmatched resilience, inner courage, and transformative power\",\"Fierce, lifelong loyalty to those who earn your sacred trust\",\"Deep focus and investigative ability to master complex mysteries\"],\"growthAreas\":[\"Practicing conscious emotional forgiveness to release old grudges\",\"Opening up gradually to trust worthy individuals without guarded suspicion\",\"Channeling intense emotional energy into creative, spiritual regeneration\"],\"coreEnergy\":{\"emoji\":\"\ud83e\udd82\",\"title\":\"Your Core Energy\",\"paragraphs\":[\"You are intensely perceptive, emotionally profound, private and magnetically resilient.\",\"You do not navigate life on the surface. You instinctively read between the lines, sense hidden motives, and perceive what is left unsaid.\",\"You possess immense inner strength\u2014when life brings crises or radical changes, you do not crumble; you endure, adapt, and transform.\"],\"challenge\":\"Your challenge? Trust and control. Because you feel so deeply and remember every wound, you can build impenetrable emotional fortresses, harbor suspicion, or struggle to let go.\",\"quote\":\"\u00ab\\\"True power is not holding on to control; it is trusting your ability to rise after whatever falls away.\\\"\u00bb\"},\"careerSuccess\":{\"title\":\"Career & Success\",\"paragraphs\":[\"You are drawn to work that requires depth, strategy, investigative intellect and real substance.\",\"You thrive in psychology, medicine, surgery, finance, investigative research, crisis management, occult/astrology, strategy, and transformative leadership.\",\"You have exceptional focus and tenacity: once you commit to a mission, you work quietly in the dark until victory is secured.\",\"Your greatest career achievements occur when you use your strategic depth to solve problems others are afraid to touch.\"],\"lessonQuote\":\"Your silence is your strategic advantage\u2014when you move, you move with decisive precision.\"},\"loveRelationships\":{\"title\":\"Love & Relationships\",\"paragraphs\":[\"For you, love is a sacred, all-or-nothing union. Casual connections do not interest your soul.\",\"You demand absolute honesty, emotional transparency, and unbreakable loyalty. In return, you offer fierce devotion that endures through every storm.\"],\"values\":[\"absolute loyalty\",\"emotional depth\",\"unwavering honesty\",\"mutual protection\",\"soul-level intimacy\"],\"questionOrLesson\":\"Your deepest relationship test is learning the courage of vulnerability:\\n\\n\u00ab\\\"Can I lower my armor and let myself be truly seen without fearing that love will be used against me?\\\"\u00bb\\n\\nWhen you dare to trust the right partner, love becomes your most profound vehicle of healing.\"},\"moneySecurity\":{\"title\":\"Money & Material Security\",\"paragraphs\":[\"You have sharp financial instincts and a natural understanding of shared resources, investments, and wealth regeneration.\",\"You keep your financial affairs private and strategic, preferring to build quiet independence rather than ostentatious display.\",\"Your wealth expands when you channel your natural discipline into long-term compounding and transformative ventures.\"],\"quote\":\"\u00ab\\\"Real wealth is self-sufficiency and the wisdom to turn adversity into asset.\\\"\u00bb\"},\"emotionalWorld\":{\"title\":\"Your Emotional World\",\"paragraphs\":[\"Beneath your composed, enigmatic exterior lies an ocean of deep emotional currents.\",\"You process feelings internally, rarely letting the world see your pain until you have fully metabolized it.\",\"Learning to release emotional toxins\u2014forgiving without forgetting\u2014is essential for your vitality and mental lightness.\",\"Your individual birth chart reveals how Mars, Ketu, and your Moon navigate your emotional rebirths.\"]},\"hiddenPotential\":{\"emoji\":\"\u2728\",\"title\":\"Your Hidden Potential\",\"paragraphs\":[\"You have the rare energy of the Phoenix.\",\"No matter what challenges, betrayals, or upheavals you encounter, you possess an uncanny ability to burn down the obsolete and rise stronger, wiser, and more radiant.\",\"When you channel your immense intensity into healing and purposeful creation, you become an unstoppable catalyst for transformation.\"]},\"firstLayerBullets\":[{\"emoji\":\"\u2764\ufe0f\",\"text\":\"Your deep relationship karma and finding genuine soul-aligned trust\"},{\"emoji\":\"\ud83d\udcbc\",\"text\":\"Your career destiny and leveraging your investigative and strategic power\"},{\"emoji\":\"\ud83d\udcb0\",\"text\":\"Your financial transformation cycles and wealth regeneration\"},{\"emoji\":\"\ud83c\udf19\",\"text\":\"Your emotional underworld and releasing subconscious self-protective walls\"},{\"emoji\":\"\ud83d\udd25\",\"text\":\"Mastering your personal power without fear of loss or betrayal\"},{\"emoji\":\"\ud83e\uddff\",\"text\":\"Karmic initiations, ancestral patterns, and occult sensitivities\"},{\"emoji\":\"\u23f3\",\"text\":\"Timing of major evolutionary rebirths and planetary milestones\"}]}",
    "reading_source_id": "cfd35db8-a621-4ad0-a209-042268802d7b",
    "status": "completed",
    "created_at": "2026-11-10 19:48:42.204865+00",
    "updated_at": "2026-11-10 19:48:41.888+00"
  },
  {
    "id": "c42a4a6f-7125-4399-9ce7-5a8449c05d6f",
    "user_id": "23e7b478-9cd7-40c9-add2-25d82b5fc9d6",
    "email": "jjyes90@gmail.com",
    "date_of_birth": "2026-11-17",
    "time_of_birth": "18:35:00",
    "place_of_birth": "New Delhi",
    "latitude": "28.613895",
    "longitude": "77.209006",
    "timezone": "5.50",
    "ascendant": "Taurus",
    "reading_content": "{\"sign\":\"Taurus\",\"sanskritName\":\"Vrishabha\",\"ruler\":\"Venus (Shukra)\",\"element\":\"Earth\",\"quality\":\"Fixed\",\"glyph\":\"\u2649\",\"iconPath\":\"/zodiac/taurus.svg\",\"overview\":\"With Taurus rising, your chart is anchored by Venus, the planet of harmony, beauty, value, and devotion. You embody grounded grace, unwavering loyalty, and an organic connection to material and emotional security.\",\"personalityTraits\":\"You carry a calm, soothing, and reassuring presence that immediately puts others at ease. Methodical and thoughtful, you do not rush your choices; you build your life brick by brick with enduring craftsmanship. You possess refined aesthetic discernment and deeply appreciate sensory harmony, natural beauty, and tranquil environments.\",\"lifePathGuidance\":\"Your life path is one of steady cultivation, building enduring prosperity, and finding authentic self-worth. Cultivating flexibility and allowing room for healthy transformation will help you release resistance to change when life invites you to evolve.\",\"strengths\":[\"Unshakable dependability and steadfast loyalty\",\"Deeply grounded practical intellect and financial prudence\",\"Sophisticated eye for aesthetics, balance, and artistic beauty\",\"Calming emotional presence that anchors those around you\"],\"growthAreas\":[\"Embracing necessary life transitions without excessive attachment to the familiar\",\"Remaining open to alternate viewpoints and agile compromises\",\"Balancing physical comfort with active renewal and mindful movement\"],\"coreEnergy\":{\"emoji\":\"\ud83c\udf3f\",\"title\":\"Your Core Energy\",\"paragraphs\":[\"You naturally seek stability, comfort, security and something you can rely on.\",\"You may not be someone who wants to rush into everything. You often prefer to observe, understand the situation and then move when you feel ready.\",\"Once you make up your mind, however, you can be extremely difficult to move.\",\"You may have a strong sense of your own values and dislike being pressured into doing something that doesn't feel right to you.\"],\"challenge\":\"Your greatest strength is consistency.\\n\\nYour challenge can be becoming too comfortable, resistant to change or staying somewhere simply because it feels familiar.\",\"quote\":\"\u00ab\\\"Security is important\u2014but don't let comfort stop your growth.\\\"\u00bb\"},\"careerSuccess\":{\"title\":\"Career & Success\",\"paragraphs\":[\"You tend to do best when you can build something gradually and see tangible results.\",\"You may prefer stability over constant unpredictability and can have a natural ability to stay with something long enough for it to grow.\",\"You may be drawn toward areas involving finance, beauty, design, food, luxury, nature, property, creativity or building valuable resources, although your individual chart determines the specific direction.\",\"Your success often comes through patience rather than shortcuts.\"],\"lessonQuote\":\"You may not always be the fastest person in the room\u2014but once you establish momentum, you can be incredibly persistent.\"},\"loveRelationships\":{\"title\":\"Love & Relationships\",\"paragraphs\":[\"You generally don't want relationships that feel chaotic or unstable.\",\"You may take time to fully open up, but once you genuinely commit, you can be deeply loyal.\",\"You may also have strong expectations around how a partner treats you.\"],\"values\":[\"loyalty\",\"consistency\",\"physical affection\",\"trust\",\"emotional security\"],\"questionOrLesson\":\"Because you value stability so much, one of your relationship lessons can be recognising the difference between:\\n\\n\\\"This feels safe\\\"\\nand\\n\\\"This is actually healthy for me.\\\"\\n\\nSometimes you may stay longer than necessary because letting go feels more uncomfortable than staying.\\n\\nYour personal chart can reveal much more about the kind of partner you attract, what you need emotionally and how your relationship patterns develop.\"},\"moneySecurity\":{\"title\":\"Money & Material Security\",\"paragraphs\":[\"Creating financial stability can be particularly important to you.\",\"You may enjoy having beautiful things, good food, comfort and a lifestyle that feels secure\u2014but you may also have the ability to build wealth patiently when you have a clear goal.\",\"You tend to benefit from consistent accumulation rather than impulsive decisions.\",\"There can also be a strong connection between your sense of self-worth and your material security.\"],\"quote\":\"\u00ab\\\"My value is greater than what I own, earn or achieve.\\\"\u00bb\"},\"emotionalWorld\":{\"title\":\"Your Emotional World\",\"paragraphs\":[\"You may appear calm, grounded and composed even when a lot is happening internally.\",\"You usually don't enjoy emotional chaos.\",\"You may need time to process your feelings rather than reacting immediately, and once emotionally attached, you can find it difficult to simply switch your feelings off.\",\"You may crave predictability, physical closeness and a peaceful environment when you're emotionally overwhelmed.\",\"But your emotional needs are unique. Your individual chart can reveal what actually makes you feel safe, loved and emotionally fulfilled.\"]},\"hiddenPotential\":{\"emoji\":\"\ud83c\udf31\",\"title\":\"Your Hidden Potential\",\"paragraphs\":[\"One of your greatest gifts is the ability to turn something small into something lasting.\",\"You don't necessarily need dramatic beginnings.\"],\"buildSteps\":[{\"label\":\"a career\",\"pacing\":\"slowly\"},{\"label\":\"wealth\",\"pacing\":\"steadily\"},{\"label\":\"relationships\",\"pacing\":\"deeply\"},{\"label\":\"a life\",\"pacing\":\"intentionally\"}],\"conclusion\":[\"You have the potential to become someone who creates a life that feels stable, beautiful and genuinely yours.\",\"But life may periodically force you out of your comfort zone. Those moments can feel disruptive\u2014but they can also prevent you from becoming stuck.\"]},\"firstLayerBullets\":[{\"emoji\":\"\u2764\ufe0f\",\"text\":\"Your relationship patterns and what you truly need in love\"},{\"emoji\":\"\ud83d\udcbc\",\"text\":\"Your career direction and where your potential can develop\"},{\"emoji\":\"\ud83d\udcb0\",\"text\":\"Your financial patterns and relationship with security\"},{\"emoji\":\"\ud83c\udf19\",\"text\":\"Your emotional needs and inner world\"},{\"emoji\":\"\ud83d\udd25\",\"text\":\"How you pursue your goals and handle challenges\"},{\"emoji\":\"\ud83e\uddff\",\"text\":\"Recurring patterns and deeper life lessons\"},{\"emoji\":\"\u23f3\",\"text\":\"When important changes, opportunities and relationship themes become activated\"}]}",
    "reading_source_id": "fba0a639-d52c-4ea0-9926-00eec3beefa8",
    "status": "completed",
    "created_at": "2026-11-17 13:08:13.830964+00",
    "updated_at": "2026-11-17 13:08:13.105+00"
  }
]
```

---

### 16. `public.google_calendar_connections` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `boolean` | **No** | `true` |
| `organizer_email` | `text` | Yes | — |
| `calendar_id` | `text` | **No** | `'primary'::text` |
| `busy_calendar_ids` | `ARRAY` | **No** | `ARRAY['primary'::text]` |
| `encrypted_refresh_token` | `text` | **No** | — |
| `status` | `text` | **No** | `'connected'::text` |
| `last_success_at` | `timestamp with time zone` | Yes | — |
| `last_error` | `text` | Yes | — |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| `auth_user_id` | `uuid` | Yes | — |

**Current Live Data:**

```json
[
  {
    "id": true,
    "organizer_email": "pragatijain841@gmail.com",
    "calendar_id": "pragatijain841@gmail.com",
    "busy_calendar_ids": [
      "pragatijain841@gmail.com",
      "en-in.indian#holiday@group.v.calendar.google.com",
      "en.indian#holiday@group.v.calendar.google.com"
    ],
    "encrypted_refresh_token": "",
    "status": "connected",
    "last_success_at": "2026-11-11 14:00:25.567+00",
    "last_error": null,
    "updated_at": "2026-11-17 16:33:44.112832+00",
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e"
  }
]
```

---

### 17. `public.google_user_connections` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `auth_user_id` | `uuid` | **No** | — |
| `google_primary_calendar_id` | `text` | **No** | — |
| `encrypted_refresh_token` | `text` | Yes | — |
| `encrypted_access_token` | `text` | Yes | — |
| `access_expires_at` | `timestamp with time zone` | Yes | — |
| `granted_scopes` | `ARRAY` | **No** | `'{}'::text[]` |
| `token_version` | `uuid` | **No** | `gen_random_uuid()` |
| `status` | `text` | **No** | `'connected'::text` |
| `connected_at` | `timestamp with time zone` | **No** | `now()` |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |
| `last_error` | `text` | Yes | — |

**Current Live Data:**

```json
[
  {
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "google_primary_calendar_id": "pragatijain841@gmail.com",
    "encrypted_refresh_token": "g1.lsHlETzgTTv6wDStfscoKgLCGNMomDmfUq/qmTEAk46TcB1ShhfXbxZOmceTA3AI8h7fLmBt/tLpr/eTxg3/dNu3FmoEj1W9jh85XxVnf7VklSGMz4xNYMieLUkkkcHG845PoKkKKQUsynueAUWBy9o2lexfCH/TNL9EcBEhOAaPrkykzP4BYaAnBsWFza4zbirncVDpcD+3CYs=",
    "encrypted_access_token": "g1.YLYZMJf/Vn7cmLclay8Ttk1UXzQcYc5VZIL1X3TY6Gt5qplnsWdkQtxxHGrJ4gsTy/oBSMn0+0uPS2rqzkJTJY0nXywLwNToqAzHy1HicSgSzhMCnwKub9cle98xquw8UueIzMrk+3tmabs3R7QJ4hrOzYEu7gp/W2Z2YonZZugGFIrO5rX+RmXeNCPbFxDyPPll+8BnktUiS6Xb/qUpT34OiAMKKIROC8wq7E63bEHTWsGuDCfknkcx6G8qMDo3dI0Qvv3MHMM2hMNwOKOTyymP1Np5fkr+yF5z4EtfIMJ7xp2lHsViwwVX3GYiJRV00rsolIYTOd7f6zhqqpLbIicXo4oUwQT1IDbsFGJrZwYmFykwV/NsmQA=",
    "access_expires_at": "2026-11-17 17:33:18.08+00",
    "granted_scopes": [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.freebusy"
    ],
    "token_version": "3b432607-624a-4d0e-ad95-b75bf68217c6",
    "status": "connected",
    "connected_at": "2026-11-17 16:33:19.42601+00",
    "updated_at": "2026-11-17 16:33:19.42601+00",
    "last_error": null
  }
]
```

---

### 18. `public.orders` (7 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `auth_user_id` | `uuid` | Yes | — |
| `service_title` | `text` | **No** | — |
| `format` | `text` | **No** | `'text'::text` |
| `price_eur` | `numeric` | **No** | `0.00` |
| `status` | `text` | **No** | `'pending_payment'::text` |
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
| `service_id` | `uuid` | Yes | — |
| `scheduled_end_at` | `timestamp with time zone` | Yes | — |
| `original_scheduled_at` | `timestamp with time zone` | Yes | — |
| `customer_timezone` | `text` | **No** | `'Europe/Berlin'::text` |
| `customer_email_snapshot` | `text` | Yes | — |
| `price_cents_snapshot` | `integer` | Yes | — |
| `currency_snapshot` | `text` | Yes | — |
| `stripe_checkout_session_id` | `text` | Yes | — |
| `checkout_key` | `uuid` | Yes | — |
| `checkout_created_at` | `timestamp with time zone` | Yes | — |
| `hold_expires_at` | `timestamp with time zone` | Yes | — |
| `payment_verified_at` | `timestamp with time zone` | Yes | — |
| `booking_confirmed_at` | `timestamp with time zone` | Yes | — |
| `reschedule_count` | `integer` | **No** | `0` |
| `booking_version` | `integer` | **No** | `0` |
| `cancelled_at` | `timestamp with time zone` | Yes | — |
| `cancelled_by` | `uuid` | Yes | — |
| `cancellation_reason` | `text` | Yes | — |
| `refund_status` | `text` | **No** | `'none'::text` |
| `stripe_refund_id` | `text` | Yes | — |
| `refunded_amount_cents` | `integer` | **No** | `0` |
| `policy_version` | `text` | Yes | — |
| `policy_acknowledged_at` | `timestamp with time zone` | Yes | — |
| `booking_flow` | `text` | **No** | `'slot_first'::text` |
| `duration_minutes_snapshot` | `integer` | Yes | — |
| `availability_notified_at` | `timestamp with time zone` | Yes | — |

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
    "stripe_payment_intent_id": null,
    "service_id": null,
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Europe/Berlin",
    "customer_email_snapshot": null,
    "price_cents_snapshot": null,
    "currency_snapshot": null,
    "stripe_checkout_session_id": null,
    "checkout_key": null,
    "checkout_created_at": null,
    "hold_expires_at": null,
    "payment_verified_at": null,
    "booking_confirmed_at": null,
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": null,
    "policy_acknowledged_at": null,
    "booking_flow": "slot_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
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
    "stripe_payment_intent_id": null,
    "service_id": null,
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Europe/Berlin",
    "customer_email_snapshot": null,
    "price_cents_snapshot": null,
    "currency_snapshot": null,
    "stripe_checkout_session_id": null,
    "checkout_key": null,
    "checkout_created_at": null,
    "hold_expires_at": null,
    "payment_verified_at": null,
    "booking_confirmed_at": null,
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": null,
    "policy_acknowledged_at": null,
    "booking_flow": "slot_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
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
    "stripe_payment_intent_id": null,
    "service_id": null,
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Europe/Berlin",
    "customer_email_snapshot": null,
    "price_cents_snapshot": null,
    "currency_snapshot": null,
    "stripe_checkout_session_id": null,
    "checkout_key": null,
    "checkout_created_at": null,
    "hold_expires_at": null,
    "payment_verified_at": null,
    "booking_confirmed_at": null,
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": null,
    "policy_acknowledged_at": null,
    "booking_flow": "slot_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
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
    "stripe_payment_intent_id": null,
    "service_id": null,
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Europe/Berlin",
    "customer_email_snapshot": null,
    "price_cents_snapshot": null,
    "currency_snapshot": null,
    "stripe_checkout_session_id": null,
    "checkout_key": null,
    "checkout_created_at": null,
    "hold_expires_at": null,
    "payment_verified_at": null,
    "booking_confirmed_at": null,
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": null,
    "policy_acknowledged_at": null,
    "booking_flow": "slot_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
  },
  {
    "id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "auth_user_id": "02fe175d-562d-40ab-b6dd-084999bdc1e0",
    "service_title": "Relationship Karma",
    "format": "voice_call",
    "price_eur": "40.00",
    "status": "confirmed",
    "scheduled_at": "2026-11-11 17:00:00+00",
    "stripe_receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xVWFLajE5VU0xWVhsMklFKJXU0NcGMgZ0A3bdVAw6LBYUach4m2SQXC6djfD7LthdBCtWL0d1d4zs8jQ5ImzqfdnDC5OAp-B2p_Lp",
    "client_name": "Harsh",
    "client_dob": "2005-09-24",
    "client_tob": "02:22:00",
    "client_pob": "Unnao",
    "client_time_uncertain": false,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-11-11 08:40:16.131069+00",
    "updated_at": "2026-11-11 08:49:04.66848+00",
    "review_rating": null,
    "review_text": null,
    "review_created_at": null,
    "payment_status": "paid",
    "stripe_payment_intent_id": "pi_3UaX569UM1YXl2IE0NHrQ2nQ",
    "service_id": "5efed3e1-c7fb-4cf5-bc85-201c05606d66",
    "scheduled_end_at": "2026-11-11 17:30:00+00",
    "original_scheduled_at": "2026-11-11 17:00:00+00",
    "customer_timezone": "Asia/Calcutta",
    "customer_email_snapshot": "ctrlxharsh@gmail.com",
    "price_cents_snapshot": 4000,
    "currency_snapshot": "eur",
    "stripe_checkout_session_id": "cs_test_a01x1OTedQStBiuqxr5IWXJxibXZ5bsyv7Bjbkmaqo9zJQSQvPiDrOjxc4",
    "checkout_key": "ba13b915-5769-4816-bc39-7b1c583bc8c1",
    "checkout_created_at": "2026-11-11 08:40:22.214066+00",
    "hold_expires_at": "2026-11-12 08:40:16.131069+00",
    "payment_verified_at": "2026-11-11 08:40:53.911436+00",
    "booking_confirmed_at": "2026-11-11 08:49:04.66848+00",
    "reschedule_count": 0,
    "booking_version": 1,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": "2026-10-19-test-v1",
    "policy_acknowledged_at": "2026-11-11 08:40:16.131069+00",
    "booking_flow": "payment_first",
    "duration_minutes_snapshot": 30,
    "availability_notified_at": null
  },
  {
    "id": "9c2ba143-5550-4025-827c-cd2ce96f2bf1",
    "auth_user_id": "02fe175d-562d-40ab-b6dd-084999bdc1e0",
    "service_title": "Career & Money Reading",
    "format": "text",
    "price_eur": "20.00",
    "status": "pending_payment",
    "scheduled_at": null,
    "stripe_receipt_url": null,
    "client_name": "Harsh Awathi",
    "client_dob": "2004-04-04",
    "client_tob": null,
    "client_pob": "unnao",
    "client_time_uncertain": true,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-11-11 10:23:33.525127+00",
    "updated_at": "2026-11-11 10:23:33.525127+00",
    "review_rating": null,
    "review_text": null,
    "review_created_at": null,
    "payment_status": "pending",
    "stripe_payment_intent_id": null,
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Asia/Calcutta",
    "customer_email_snapshot": "ctrlxharsh@gmail.com",
    "price_cents_snapshot": 2000,
    "currency_snapshot": "eur",
    "stripe_checkout_session_id": null,
    "checkout_key": "03b1a384-d3ad-41b3-bda7-4868cb4db0fb",
    "checkout_created_at": null,
    "hold_expires_at": "2026-11-12 10:23:33.525127+00",
    "payment_verified_at": null,
    "booking_confirmed_at": null,
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "none",
    "stripe_refund_id": null,
    "refunded_amount_cents": 0,
    "policy_version": "2026-10-19-test-v1",
    "policy_acknowledged_at": "2026-11-11 10:23:33.525127+00",
    "booking_flow": "payment_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
  },
  {
    "id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "auth_user_id": "02fe175d-562d-40ab-b6dd-084999bdc1e0",
    "service_title": "Career & Money Reading",
    "format": "text",
    "price_eur": "20.00",
    "status": "confirmed",
    "scheduled_at": null,
    "stripe_receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xVWFLajE5VU0xWVhsMklFKOOQztcGMgZz2k6u_kc6LBbI-NiYBOh9wlD5ajiPpyO1q4rDD90V86vjHJiW_eIUmb4ToGem9cqKWIXO",
    "client_name": "harsh",
    "client_dob": "2005-09-24",
    "client_tob": null,
    "client_pob": "Unnao",
    "client_time_uncertain": true,
    "requires_partner": false,
    "partner_name": null,
    "partner_dob": null,
    "partner_tob": null,
    "partner_pob": null,
    "partner_time_uncertain": false,
    "notes": null,
    "created_at": "2026-11-10 21:09:19.830236+00",
    "updated_at": "2026-11-17 17:22:41.38531+00",
    "review_rating": null,
    "review_text": null,
    "review_created_at": null,
    "payment_status": "refunded",
    "stripe_payment_intent_id": "pi_3UaMJO9UM1YXl2IE1VA42UE3",
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "scheduled_end_at": null,
    "original_scheduled_at": null,
    "customer_timezone": "Asia/Calcutta",
    "customer_email_snapshot": "ctrlxharsh@gmail.com",
    "price_cents_snapshot": 2000,
    "currency_snapshot": "eur",
    "stripe_checkout_session_id": "cs_test_a05pJWR0j2gW0B9ZIRqTEi1IIM3t3A8FsO8ONhfrKWXWSY55hk9ZOI38lu",
    "checkout_key": "abcbd49f-f26a-4d94-80fb-82bdfe196ae1",
    "checkout_created_at": "2026-11-10 21:09:27.658881+00",
    "hold_expires_at": "2026-11-11 21:09:19.830236+00",
    "payment_verified_at": "2026-11-10 21:10:59.531123+00",
    "booking_confirmed_at": "2026-11-10 21:10:59.531123+00",
    "reschedule_count": 0,
    "booking_version": 0,
    "cancelled_at": null,
    "cancelled_by": null,
    "cancellation_reason": null,
    "refund_status": "refunded",
    "stripe_refund_id": "re_3UaMJO9UM1YXl2IE1voFgLSW",
    "refunded_amount_cents": 2000,
    "policy_version": "2026-10-19-test-v1",
    "policy_acknowledged_at": "2026-11-10 21:09:19.830236+00",
    "booking_flow": "payment_first",
    "duration_minutes_snapshot": null,
    "availability_notified_at": null
  }
]
```

---

### 19. `public.profiles` (1 row)

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
    "display_name": "Harvinder Kaur",
    "bio": "{\"tag\":\"Certified Astrologer\",\"heading_prefix\":\"Meet\",\"heading_name\":\"Harvinder Kaur\",\"paragraph_1\":\"Graduating from top universities in India and Germany and building a career in IT & Technology, I was trained to think analytically and rely on logic and structured reasoning. Like many people, I believed that success and life's outcomes were entirely within my control, leaving little room for magic.\",\"paragraph_2\":\"Everything changed when I began noticing recurring patterns in my own life\u2014similar challenges, relationships, and turning points that seemed to repeat themselves. Searching for answers led me to Vedic astrology, that completely changed my perspective on life. Not just as a prediction tool, but astrology has helped me for self-awareness and personal growth.\",\"image_url\":\"https://qdnwmfriilknnwqrepuy.supabase.co/storage/v1/object/public/custom_profle_photo/owner/owner_about_1791742310068.webp\"}",
    "vision": "{\"tag\":\"The Person behind the Readings\",\"heading_line_1\":\"There Is More Than One Way\",\"heading_line_2\":\"to See Your Story.\",\"paragraph_1\":\"Through my practice, I bridge the gap between ancient Vedic wisdom and the modern world, making astrology accessible, practical, and deeply relevant to everyday life. Rather than viewing astrology as mere fortune-telling, I see it as a powerful tool for self-reflection, helping you understand your unique blueprint and navigate life's uncertainties with clear awareness\",\"paragraph_2\":\"   \"}",
    "specialties": null,
    "is_published": true,
    "created_at": "2026-10-11 18:00:00.253908+00",
    "updated_at": "2026-10-15 08:04:54.882472+00"
  }
]
```

---

### 20. `public.reading_details` (7 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | **No** | `gen_random_uuid()` |
| `customer_id` | `uuid` | Yes | — |
| `service_id` | `uuid` | Yes | — |
| `google_calendar_event_id` | `text` | Yes | — |
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
| `meet_url` | `text` | Yes | — |
| `calendar_sync_status` | `text` | **No** | `'not_required'::text` |
| `calendar_invitation_status` | `text` | **No** | `'not_required'::text` |
| `calendar_synced_version` | `integer` | **No** | `'-1'::integer` |
| `delivered_at` | `timestamp with time zone` | Yes | — |

**Current Live Data:**

```json
[
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
    "client_place_of_birth": "Delhi, India",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
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
    "client_place_of_birth": "London, UK",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
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
    "client_place_of_birth": "Berlin, Germany",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
  },
  {
    "id": "1d4464b9-2182-4c72-b79b-15b2f0708b71",
    "customer_id": "0bd2fa94-a01d-4f58-8802-c2a55edc7e93",
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "google_calendar_event_id": "",
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-10-05 18:20:28.473726+00",
    "updated_at": "2026-10-19 11:26:52.95852+00",
    "order_id": "51c98188-c2cd-424a-95bb-22960193fdb1",
    "client_name": "Pragati Jain",
    "client_date_of_birth": "1995-05-15",
    "client_time_of_birth": "14:30:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "New Delhi, India",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
  },
  {
    "id": "c3632b35-890d-449f-89d8-78dd14f7424c",
    "customer_id": "6f31accf-6b8a-4f64-a3e5-c1ae48a7b39d",
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "google_calendar_event_id": null,
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-11-10 21:09:19.830236+00",
    "updated_at": "2026-11-10 21:10:59.531123+00",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "client_name": "harsh",
    "client_date_of_birth": "2005-09-24",
    "client_time_of_birth": null,
    "client_time_uncertain": true,
    "client_place_of_birth": "Unnao",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
  },
  {
    "id": "c97bd28d-8d2a-4549-bbab-c902314a12e8",
    "customer_id": "6f31accf-6b8a-4f64-a3e5-c1ae48a7b39d",
    "service_id": "928ea98f-8b60-49b0-8452-909ace47804c",
    "google_calendar_event_id": null,
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-11-11 10:23:33.525127+00",
    "updated_at": "2026-11-11 10:23:33.525127+00",
    "order_id": "9c2ba143-5550-4025-827c-cd2ce96f2bf1",
    "client_name": "Harsh Awathi",
    "client_date_of_birth": "2004-04-04",
    "client_time_of_birth": null,
    "client_time_uncertain": true,
    "client_place_of_birth": "unnao",
    "meet_url": null,
    "calendar_sync_status": "not_required",
    "calendar_invitation_status": "not_required",
    "calendar_synced_version": -1,
    "delivered_at": null
  },
  {
    "id": "fc1eb2c6-a358-4ff9-b728-e9b541d0c536",
    "customer_id": "6f31accf-6b8a-4f64-a3e5-c1ae48a7b39d",
    "service_id": "5efed3e1-c7fb-4cf5-bc85-201c05606d66",
    "google_calendar_event_id": "takb2547e651e5147eaa349b0e283c749d8",
    "status": "pending",
    "admin_notes": null,
    "partner_name": null,
    "partner_date_of_birth": null,
    "partner_time_of_birth": null,
    "partner_time_uncertain": false,
    "partner_place_of_birth": null,
    "created_at": "2026-11-11 08:40:16.131069+00",
    "updated_at": "2026-11-11 18:09:24.110812+00",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "client_name": "Harsh",
    "client_date_of_birth": "2005-09-24",
    "client_time_of_birth": "02:22:00",
    "client_time_uncertain": false,
    "client_place_of_birth": "Unnao",
    "meet_url": "https://meet.google.com/cre-mrtz-rfa",
    "calendar_sync_status": "error",
    "calendar_invitation_status": "sent",
    "calendar_synced_version": 1,
    "delivered_at": null
  }
]
```

---

### 21. `public.reading_private_notes` (1 row)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| ⭐ **order_id** | `uuid` | **No** | — |
| `admin_notes` | `text` | Yes | — |
| `updated_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "order_id": "51c98188-c2cd-424a-95bb-22960193fdb1",
    "admin_notes": "hii iam pragati\n",
    "updated_at": "2026-10-19 11:26:52.95852+00"
  }
]
```

---

### 22. `public.services` (6 rows)

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

### 23. `public.stripe_webhook_events` (2 rows)

| Column | Data Type | Nullable | Default |
| :--- | :--- | :--- | :--- |
| `id` | `text` | **No** | — |
| ⭐ **order_id** | `uuid` | Yes | — |
| `outcome` | `text` | **No** | — |
| `processed_at` | `timestamp with time zone` | **No** | `now()` |

**Current Live Data:**

```json
[
  {
    "id": "evt_1UaMJh9UM1YXl2IEui8I6XT7",
    "order_id": "26d18fe5-2d75-4857-943a-678619e79cf6",
    "outcome": "paid",
    "processed_at": "2026-11-10 21:10:59.531123+00"
  },
  {
    "id": "evt_1UaX5M9UM1YXl2IEh6peVGdC",
    "order_id": "b2547e65-1e51-47ea-a349-b0e283c749d8",
    "outcome": "paid_awaiting_schedule",
    "processed_at": "2026-11-11 08:40:53.911436+00"
  }
]
```

---

### 24. `public.testimonials` (3 rows)

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

### 25. `public.website_notifications` (0 rows)

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

### 26. Storage Buckets & Policies

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

## 27. Database Functions, Triggers & Security Policies

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

### 5. Live Row Level Security Policies on Public Tables (`pg_policies`)

| Table Name | Policy Name | Command | Target Role | Security Expression / Condition |
| :--- | :--- | :--- | :--- | :--- |
| `public.ascendant_readings` | `Admins full access on ascendant_readings` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.ascendant_readings` | `Allow public read on ascendant_readings` | `SELECT` | `{anon,authenticated}` | `true` |
| `public.contact_messages` | `Admin full access on contact_messages` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.contact_messages` | `Public can submit contact messages` | `INSERT` | `{public}` | `true` |
| `public.customer_profiles` | `Admins full access on customer_profiles` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.customer_profiles` | `Customer inserts own profile` | `INSERT` | `{authenticated}` | `(auth.uid() = auth_user_id)` |
| `public.customer_profiles` | `Customer reads own profile` | `SELECT` | `{public}` | `(auth.uid() = auth_user_id)` |
| `public.customer_profiles` | `Customer updates own profile` | `UPDATE` | `{public}` | `(auth.uid() = auth_user_id)` |
| `public.free_reading_content` | `Admins manage free reading content` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.free_reading_content` | `Public reads free reading content` | `SELECT` | `{anon,authenticated}` | `true` |
| `public.free_reading_requests` | `Admin full access on free_reading_requests` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.free_reading_requests` | `Public can submit free reading requests` | `INSERT` | `{public}` | `true` |
| `public.free_readings` | `Admins full access on free_readings` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.free_readings` | `Customer reads own free reading` | `SELECT` | `{authenticated}` | `((auth.uid() = user_id) OR is_admin())` |
| `public.orders` | `Admins can manage all orders` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.orders` | `Anon can create orders via intake` | `INSERT` | `{anon}` | `true` |
| `public.orders` | `Users can insert their own orders` | `INSERT` | `{authenticated}` | `(auth.uid() = auth_user_id)` |
| `public.orders` | `Users can view their own orders` | `SELECT` | `{authenticated}` | `(auth.uid() = auth_user_id)` |
| `public.orders` | `Users can update their own orders` | `UPDATE` | `{authenticated}` | `(auth.uid() = auth_user_id)` |
| `public.profiles` | `Admin full access on profiles` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.profiles` | `Public can read published profiles` | `SELECT` | `{public}` | `(is_published = true)` |
| `public.reading_details` | `Admin full access on reading_details` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.reading_details` | `Admins can do everything on reading details` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.reading_details` | `Customer reads own reading_details` | `SELECT` | `{public}` | `(customer_id = ( SELECT customer_profiles.id  FROM customer_profiles  WHERE (customer_profiles.auth_user_id = auth.uid())))` |
| `public.reading_details` | `Customers can view own reading details` | `SELECT` | `{authenticated}` | `((EXISTS ( SELECT 1  FROM orders o  WHERE ((o.id = reading_details.order_id) AND (o.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1  FROM customer_profiles cp  WHERE ((cp.id = reading_details.customer_id) AND (cp.auth_user_id = auth.uid())))) OR is_admin())` |
| `public.services` | `Admin full access on services` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.services` | `Public can read active services` | `SELECT` | `{public}` | `(is_active = true)` |
| `public.testimonials` | `Admin full access on testimonials` | `ALL` | `{authenticated}` | `is_admin()` |
| `public.testimonials` | `Authenticated users can insert testimonials` | `INSERT` | `{authenticated}` | `(auth.uid() = customer_id)` |
| `public.testimonials` | `Public can read published testimonials` | `SELECT` | `{public}` | `(is_published = true)` |
| `public.website_notifications` | `Admin full access on website_notifications` | `ALL` | `{authenticated}` | `is_admin()` |

