export function unavailableHolidayCalendars(
  ids: string[], organizer: string,
  calendars: Record<string, { errors?: Array<{ reason?: string }> }>,
) {
  return ids.filter(id => id !== organizer && id.endsWith("#holiday@group.v.calendar.google.com") &&
    calendars[id]?.errors?.some(error => error.reason === "notFound"));
}
