// Only deliberately public business details belong here. Never fall back to
// SMTP credentials, the private contact recipient, or account profile data.
export const legalDetails = {
  operator: process.env.LEGAL_OPERATOR_NAME || "Harvinder Kaur",
  country: process.env.LEGAL_BUSINESS_COUNTRY || "Germany",
  address: process.env.LEGAL_PUBLIC_BUSINESS_ADDRESS || "",
  email: process.env.LEGAL_PUBLIC_CONTACT_EMAIL || "",
};
export const POLICY_UPDATED_DATE = "18 November 2026";
