# Booking permissions

Signed-in administrators can preview reading cards and manage customer bookings, refunds, cancellations and appointment changes in the admin workspace. They cannot create or pay for a customer booking for their own account.

The paid-booking CTAs are hidden for administrators, the booking-modal entry point is guarded, customer purchase/checkout endpoints call `requireCustomer`, and the `prevent_admin_self_purchase` database trigger rejects paid order inserts linked to an administrator profile. Existing records remain available for administration.

Free-reading **Admin Test Verification Mode** remains available, including its existing calculation-limit bypass. Its UI, API and storage are separate from the paid order guard.

Validate the guard with `python scripts/refund-db.py --admin-booking` (synthetic fixtures and migration rolled back). Install it with `python scripts/refund-db.py --admin-booking --apply`.
