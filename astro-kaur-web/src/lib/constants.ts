/**
 * Site-wide configuration constants for TheAstroKaur.
 * Update the contact email here to change it throughout the application.
 */
export const SITE_CONFIG = {
  name: "TheAstroKaur",
  tagline: "Written In The Stars",
  description: "Astrology for self-discovery and clarity.",
  contactEmail: "pragatiijain841@gmail.com",
} as const;

export const CONTACT_EMAIL = SITE_CONFIG.contactEmail;
