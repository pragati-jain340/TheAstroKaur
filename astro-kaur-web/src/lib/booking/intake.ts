import { BookingError } from "./server";
export function validateIntake(raw: unknown, partner: boolean) {
  if (!raw || typeof raw !== "object")
    throw new BookingError("Reading details are required.");
  const input = raw as Record<string, unknown>;
  const text = (key: string, required = false, max = 200) => {
    const value = typeof input[key] === "string" ? input[key].trim() : "";
    if ((required && !value) || value.length > max)
      throw new BookingError(`Please check ${key.replaceAll("_", " ")}.`);
    return value || null;
  };
  const date = (key: string) => {
    const value = text(key, true) as string;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value ||
      Date.parse(value) > Date.now()
    )
      throw new BookingError("Please enter a valid birth date.");
    return value;
  };
  const time = (key: string, uncertain: boolean) => {
    if (uncertain) return null;
    const value = text(key, true) as string;
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value))
      throw new BookingError("Please enter a valid birth time.");
    return value;
  };
  const email = text("email", true, 254) as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new BookingError("Please enter a valid email address.");
  const uncertain = input.client_time_uncertain === true,
    partnerUncertain = input.partner_time_uncertain === true;
  return {
    email,
    client_name: text("client_name", true),
    client_dob: date("client_dob"),
    client_tob: time("client_tob", uncertain),
    client_pob: text("client_pob", true),
    client_time_uncertain: uncertain,
    partner_name: partner ? text("partner_name", true) : null,
    partner_dob: partner ? date("partner_dob") : null,
    partner_tob: partner ? time("partner_tob", partnerUncertain) : null,
    partner_pob: partner ? text("partner_pob", true) : null,
    partner_time_uncertain: partner && partnerUncertain,
    notes: text("notes", false, 3000),
  };
}
