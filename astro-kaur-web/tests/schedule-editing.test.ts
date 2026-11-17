import test from 'node:test'
import assert from 'node:assert/strict'
import { availabilityDurationWarning, hoursForDate, applyDateRule, checkedRanges, copyWeeklyHours, datesInRange, nextTimeRange, validateWeeklyHours, weeklyHoursErrors } from '../src/lib/booking/scheduleEditing'
import { calculateSlots, coversBooking } from '../src/lib/booking/slots'
import type { AvailabilityOverride, AvailabilityWindow, Settings } from '../src/lib/booking/types'

const settings: Settings = { timezone: 'UTC', min_notice_minutes: 0, advance_window_days: 3, buffer_minutes: 15, slot_step_minutes: 15, hold_minutes: 5, booking_enabled: true }
const now = Date.parse('2026-11-17T00:00:00Z')
const weekly: AvailabilityWindow[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, start_local: '09:00', end_local: '17:00', enabled: true }))
const date = '2026-11-18'
const onDate = (overrides: AvailabilityOverride[]) => calculateSlots(settings, weekly, overrides, [], 30, now).filter(slot => slot.start.startsWith(date))

test('copying multiple ranges replaces selected weekdays without changing other days or the source', () => {
  const source = [{ weekday: 1, start_local: '09:00', end_local: '12:00' }, { weekday: 1, start_local: '14:00', end_local: '17:00' }, weekly[2], weekly[0]]
  const snapshot = JSON.stringify(source)
  const copied = copyWeeklyHours(source, 1, [2, 3, 2])
  assert.equal(copied.filter(window => window.weekday === 2).length, 2)
  assert.equal(copied.filter(window => window.weekday === 3).length, 2)
  assert.deepEqual(copied.find(window => window.weekday === 0), weekly[0])
  assert.equal(JSON.stringify(source), snapshot)
  assert.throws(() => copyWeeklyHours([{ ...weekly[1], enabled: false }], 1, [2]), /at least one/)
})

test('bulk dates are inclusive and weekday selection stays stable over daylight-saving changes', () => {
  assert.deepEqual(datesInRange('2026-10-23', '2026-10-27', [1, 5]), ['2026-10-23', '2026-10-26'])
  assert.deepEqual(datesInRange(date, date), [date])
  assert.throws(() => datesInRange('2026-02-30', '2026-03-01'), /valid/)
  assert.throws(() => datesInRange('2026-11-20', date), /on or after/)
  assert.throws(() => datesInRange(date, date, []), /Choose at least one/)
  assert.throws(() => datesInRange('2026-01-01', '2027-01-01'), /62 days/)
})

test('custom date hours replace weekly availability rather than adding to it', () => {
  const rules = applyDateRule([], [date], 'custom', false, [{ start: '10:00', end: '12:00' }])
  const slots = onDate(rules)
  assert.ok(slots.length > 0)
  assert.ok(slots.every(slot => slot.start.slice(11, 16) >= '10:00' && slot.end.slice(11, 16) <= '11:45'))
  assert.equal(slots[0].start.slice(11, 16), '10:00')
  assert.ok(!slots.some(slot => slot.start.slice(11, 16) === '13:00'))
  assert.ok(calculateSlots(settings, weekly, rules, [], 30, now).some(slot => slot.start === '2026-11-19T09:00:00.000Z'))
})

test('split custom hours protect the break and require the whole call plus buffer to fit', () => {
  const rules = applyDateRule([], [date], 'custom', false, [{ start: '09:00', end: '11:00' }, { start: '14:00', end: '16:00' }])
  const starts = onDate(rules).map(slot => slot.start.slice(11, 16))
  assert.ok(starts.includes('10:15'))
  assert.ok(!starts.includes('10:30'))
  assert.ok(!starts.includes('12:00'))
  assert.ok(starts.includes('14:00'))
  assert.equal(coversBooking(settings, weekly, rules, `${date}T10:30:00Z`, `${date}T11:00:00Z`), false)
})

test('time off removes starts overlapping its buffer and retains custom hours', () => {
  const custom = applyDateRule([], [date], 'custom', false, [{ start: '09:00', end: '17:00' }])
  const rules = applyDateRule(custom, [date], 'unavailable', false, [{ start: '12:00', end: '14:00' }])
  const starts = onDate(rules).map(slot => slot.start.slice(11, 16))
  assert.ok(starts.includes('11:15'))
  assert.ok(!starts.includes('11:30'))
  assert.ok(!starts.includes('13:45'))
  assert.ok(starts.includes('14:00'))
  assert.ok(rules.some(rule => rule.mode === 'extra_open'))
})

test('whole-day time off supersedes existing exceptions and restoring weekly hours reopens the date', () => {
  const existing = applyDateRule([], [date, '2026-11-19'], 'custom', false, [{ start: '18:00', end: '21:00' }])
  const rules = applyDateRule(existing, [date], 'unavailable', true, [])
  assert.equal(onDate(rules).length, 0)
  assert.equal(rules.filter(rule => rule.local_date === date).length, 1)
  assert.ok(rules.some(rule => rule.local_date === '2026-11-19' && rule.mode === 'extra_open'))
  assert.equal(onDate(rules.filter(rule => rule.local_date !== date))[0].start.slice(11, 16), '09:00')
})

test('invalid hours, overlapping ranges, and oversized exception changes are rejected before saving', () => {
  assert.throws(() => checkedRanges([{ start: '17:00', end: '09:00' }]), /end after/)
  assert.throws(() => checkedRanges([{ start: '09:00', end: '12:00' }, { start: '11:00', end: '13:00' }]), /overlap/)
  assert.throws(() => validateWeeklyHours([...weekly, { ...weekly[1], start_local: '10:00' }]), /overlap/)
  assert.throws(() => applyDateRule([], Array.from({ length: 201 }, (_, index) => `date-${index}`), 'unavailable', true, []), /too many/)
  assert.deepEqual(nextTimeRange([{ start: '09:00', end: '17:00' }]), { start: '18:00', end: '19:00' })
  assert.throws(() => nextTimeRange([{ start: '20:00', end: '23:59' }]), /no time left/)
})


test('calendar working hours show complete dates, custom hours, breaks and days off', () => {
  assert.deepEqual(hoursForDate(weekly, [], date), [{ start: '09:00', end: '17:00' }])
  const custom = applyDateRule([], [date], 'custom', false, [{ start: '18:00', end: '21:00' }])
  assert.deepEqual(hoursForDate(weekly, custom, date), [{ start: '18:00', end: '21:00' }])
  const blocked = applyDateRule([], [date], 'unavailable', false, [{ start: '12:00', end: '13:00' }])
  assert.deepEqual(hoursForDate(weekly, blocked, date), [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }])
  assert.deepEqual(hoursForDate(weekly, applyDateRule([], [date], 'unavailable', true, []), date), [])
  assert.deepEqual(hoursForDate(weekly.filter(window => window.weekday === 1), [], date), [])
})


test('a 40-minute custom window explains why the 30-minute reading plus 15-minute buffer cannot fit', () => {
  const ranges = [{ start: '19:00', end: '19:40' }]
  const overrides = applyDateRule([], [date], 'custom', false, ranges)
  assert.equal(onDate(overrides).length, 0)
  const warning = availabilityDurationWarning(ranges, [30, 45], 15)
  assert.match(warning!, /30-minute reading plus 15-minute buffer needs 45 minutes/)
  assert.match(warning!, /40 minutes/)
  assert.match(warning!, /19:45/)
  const longer = applyDateRule([], [date], 'custom', false, [{ start: '19:00', end: '19:45' }])
  assert.equal(onDate(longer).length, 1)
  assert.equal(availabilityDurationWarning([{ start: '19:00', end: '19:45' }], [30, 45], 15), null)
  assert.equal(availabilityDurationWarning(ranges, [30], 0), null)
  assert.match(availabilityDurationWarning([{ start: '19:00', end: '19:45' }], [45], 15)!, /20:00/)
  assert.equal(availabilityDurationWarning([{ start: '09:00', end: '09:30' }, { start: '10:00', end: '10:30' }], [30], 15) !== null, true)
  assert.equal(availabilityDurationWarning([], [30], 15), null)
})


test('weekly save identifies each invalid weekday while ignoring disabled hours', () => {
  const hours = weekly.map(window => [2, 4, 5].includes(window.weekday) ? { ...window, start_local: '18:00', end_local: '17:00' } : window)
  const errors = weeklyHoursErrors(hours)
  assert.deepEqual(Object.keys(errors), ['2', '4', '5'])
  assert.match(errors[2]!, /Tuesday:.*end after it starts/)
  assert.throws(() => validateWeeklyHours(hours), /Tuesday:.*Thursday:.*Friday:/)
  const corrected = hours.map(window => ({ ...window, end_local: '21:00' }))
  assert.deepEqual(weeklyHoursErrors(corrected), {})
  assert.doesNotThrow(() => validateWeeklyHours(corrected))
  assert.deepEqual(weeklyHoursErrors(hours.map(window => ({ ...window, enabled: false }))), {})
})
