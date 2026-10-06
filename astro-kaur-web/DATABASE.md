# TheAstroKaur — Database Schema & Live Content Reference

> **Auto-Updated Documentation**  
> Last synced: `2026-10-06T15:06:12.559382+00:00`  
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

1. [`public.contact_messages`](#1-publiccontactmessages)
2. [`public.customer_profiles`](#2-publiccustomerprofiles)
3. [`public.free_reading_requests`](#3-publicfreereadingrequests)
4. [`public.orders`](#4-publicorders)
5. [`public.profiles`](#5-publicprofiles)
6. [`public.reading_details`](#6-publicreadingdetails)
7. [`public.services`](#7-publicservices)
8. [`public.testimonials`](#8-publictestimonials)
9. [`public.website_notifications`](#9-publicwebsitenotifications)
10. [Storage Buckets & Policies](#10-storage-buckets--policies)
11. [Database Functions, Triggers & Security Policies](#11-database-functions-triggers--security-policies)

---

### 1. `public.contact_messages` (0 rows)

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

*(Table is currently empty / 0 rows)*

---

### 2. `public.customer_profiles` (3 rows)

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
    "id": "0bd2fa94-a01d-4f58-8802-c2a55edc7e93",
    "auth_user_id": "e2c17b1e-de58-4758-8d71-0af11cd4c54e",
    "display_name": "Pragati Jain",
    "email": "pragatijain841@gmail.com",
    "date_of_birth": null,
    "time_of_birth": null,
    "time_uncertain": false,
    "place_of_birth": null,
    "avatar_seed": "star",
    "created_at": "2026-10-03 18:20:01.629501+00",
    "updated_at": "2026-10-05 16:24:28.796683+00",
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
    "id": "885847c9-0413-4b37-b6b1-cb205a808487",
    "auth_user_id": "2583c2ac-b95a-447f-b555-22cc26f7384f",
    "display_name": "prakarti",
    "email": "jainpragati4566@gmail.com",
    "date_of_birth": null,
    "time_of_birth": "16:40:00",
    "time_uncertain": false,
    "place_of_birth": "aligarh",
    "avatar_seed": "sun",
    "created_at": "2026-10-05 18:57:47.524989+00",
    "updated_at": "2026-10-05 19:11:03.279404+00",
    "role": "customer",
    "partner_name": "Harsh",
    "partner_date_of_birth": "2026-10-07",
    "partner_time_of_birth": null,
    "partner_time_uncertain": true,
    "partner_place_of_birth": "aligath",
    "account_status": "active",
    "avatar_url": null
  },
  {
    "id": "aac0aea0-1a0c-4206-a561-858ab663a5b1",
    "auth_user_id": "c253b74e-e1ce-4d50-a34c-60ee34217e76",
    "display_name": "harvinder",
    "email": "harvinder123@gmail.com",
    "date_of_birth": null,
    "time_of_birth": null,
    "time_uncertain": false,
    "place_of_birth": null,
    "avatar_seed": "star",
    "created_at": "2026-10-06 14:18:41.615842+00",
    "updated_at": "2026-10-06 14:18:42.048883+00",
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

### 3. `public.free_reading_requests` (3 rows)

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

### 4. `public.orders` (1 row)

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
  }
]
```

---

### 5. `public.profiles` (0 rows)

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

*(Table is currently empty / 0 rows)*

---

### 6. `public.reading_details` (1 row)

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
  }
]
```

---

### 7. `public.services` (6 rows)

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

**Current Live Data:**

```json
[
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
    "updated_at": "2026-09-29 20:37:50.973234+00"
  },
  {
    "id": "5efed3e1-c7fb-4cf5-bc85-201c05606d66",
    "sort_order": 3,
    "title": "Future Partner / Relationship Karma",
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
    "updated_at": "2026-09-29 20:37:50.973234+00"
  },
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
    "updated_at": "2026-09-29 20:37:50.973234+00"
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
    "updated_at": "2026-09-29 20:37:50.973234+00"
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
    "updated_at": "2026-10-05 16:57:20.519784+00"
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
    "updated_at": "2026-10-05 16:57:20.519784+00"
  }
]
```

---

### 8. `public.testimonials` (0 rows)

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

*(Table is currently empty / 0 rows)*

---

### 9. `public.website_notifications` (0 rows)

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

### 10. Storage Buckets & Policies

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

## 11. Database Functions, Triggers & Security Policies

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
