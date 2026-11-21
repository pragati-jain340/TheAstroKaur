import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";
import PolicyContact from "@/components/legal/PolicyContact";
import styles from "@/components/legal/PolicyPage.module.css";
import { POLICY_UPDATED_DATE } from "@/lib/legal/details";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | TheAstroKaur",
  description: "How TheAstroKaur handles booking changes, cancellations, support requests, exceptional refunds and statutory consumer rights.",
};
const heading = "mb-3 font-serif text-xl font-medium text-[#0F172A] dark:text-[#FAF8F5] sm:text-2xl";
const section = "space-y-3 border-t border-[#0F172A]/10 pt-6 dark:border-[#FAF8F5]/10";

export default function CancellationPolicyPage() {
  return <div className="relative flex min-h-screen flex-col justify-between bg-[#FAF8F5] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5]">
    <SubpageBackground /><Navbar />
    <main className={`${styles.main} relative z-10 flex-1 px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8`}>
      <div className="mx-auto max-w-4xl"><article className={`${styles.article} rounded-2xl border border-[#0F172A]/10 bg-white/90 p-6 shadow-[0_12px_45px_rgba(229,184,66,0.06)] backdrop-blur-md dark:border-[#E5B842]/20 dark:bg-[#0D1829]/90 sm:rounded-3xl sm:p-12 lg:p-16`}>
        <header className={`${styles.header} mb-8 border-b border-[#0F172A]/10 pb-8 dark:border-[#FAF8F5]/10`}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B3448] dark:text-[#E5B842]">TheAstroKaur | Legal</p>
          <h1 className="mb-4 font-serif text-3xl font-normal tracking-tight sm:text-4xl lg:text-5xl">Cancellation &amp; Refund Policy</h1>
          <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 sm:text-sm">Last updated: {POLICY_UPDATED_DATE}</p>
        </header>
        <div className={`${styles.body} space-y-8 text-sm font-light leading-relaxed text-[#0F172A]/80 dark:text-[#FAF8F5]/80 sm:text-base`}>
          <section className="space-y-3"><h2 className={heading}>1. Non-refundable bookings</h2>
            <p>Bookings are non-refundable as a voluntary policy, subject to rights required by law and any exception expressly approved by the owner. Changing your mind or cancelling an appointment does not itself create a voluntary refund entitlement.</p>
            <p>This policy does not remove statutory withdrawal rights, rights where a service is not delivered as agreed, or any other mandatory consumer remedy. A valid legal entitlement does not depend on discretionary approval.</p>
            <p>Payments are currently configured in Stripe test mode. Simulated charges and refunds do not move real money. Test confirmations are not evidence that a live payment was collected or returned.</p>
          </section>
          <section className={section}><h2 className={heading}>2. Payment, appointments and written readings</h2>
            <p>Stripe must verify payment before an order is treated as paid. For a voice reading, you then choose an available appointment time. Payment confirmation alone does not confirm a call time. Check the date, time zone and consultation duration before confirming.</p>
            <p>Available starts depend on the shared reader schedule, the reading duration, breaks between consultations and existing reservations. If no suitable time is available, use Get help with this booking in your account so the owner can help arrange your consultation.</p>
            <p>A confirmed call normally receives a calendar invitation and Google Meet link. If those details are delayed or unavailable, the booking can still be confirmed and the owner will contact you personally with the call details.</p>
            <p>Written readings do not reserve a call slot and do not include a calendar invitation or Meet link. The owner contacts you by email about timing and sends the completed reading directly. There is no automatic delivery deadline unless one is expressly stated or separately agreed.</p>
          </section>
          <section className={section}><h2 className={heading}>3. Changing an appointment</h2>
            <p>Customer self-service rescheduling is not available. To request a different time, open the booking in your account, choose Get help with this booking, and include the time change you need.</p>
            <p>The owner reviews the request and may arrange an available replacement time. A requested time is not reserved until the change is confirmed. Changing a time does not issue a refund or create a second paid order.</p>
            <p>If we need to change or cannot provide the agreed service, we will communicate the available options. Any replacement arrangement is subject to your applicable rights, including a refund or other remedy where required by law.</p>
          </section>
          <section className={section}><h2 className={heading}>4. Cancelling a booking</h2>
            <p>Where a cancellation option is shown for a future confirmed voice consultation, you can cancel that appointment from your account. Cancellation releases its reserved time. For written readings, other booking states or any uncertainty, contact support.</p>
            <p><strong className="font-medium">Cancellation does not automatically issue a refund.</strong> A request for support also does not automatically cancel an appointment. Check the booking status and confirmation of any agreed change.</p>
            <p>If you are unable to attend, contact support promptly. We do not promise an automatic replacement appointment or voluntary refund for a missed call; mandatory rights and any separately agreed exception remain unaffected.</p>
          </section>
          <section className={section}><h2 className={heading}>5. Exceptional refunds and payment problems</h2>
            <p>For a duplicate charge, an undelivered service, a payment problem or an exceptional refund request, contact support with your booking reference and relevant details. Avoid sending full card numbers, passwords or verification codes. A reason helps us review a voluntary exception; no reason is required to exercise a valid statutory withdrawal right.</p>
            <p>An authorised administrator can issue an approved refund through Stripe against the original payment, within its remaining refundable balance. Refunds are returned through the original payment method according to the provider&apos;s process.</p>
            <p>Submitted, pending, succeeded, failed and cancelled refund states are different. A pending or unconfirmed request is not proof that money has been returned. If a refund fails or needs action, contact support so we can help resolve it. The time a successful refund takes to appear depends on Stripe and the payment provider; we do not promise instant bank credit.</p>
            <p><strong className="font-medium">Issuing an administrative refund does not itself cancel a reading or release an appointment.</strong> Booking changes are managed separately. Where a contract has been validly withdrawn from or a cancellation is otherwise agreed or legally required, the related booking must be handled accordingly.</p>
          </section>
          <section className={section}><h2 className={heading}>6. Confirmations, receipts and email updates</h2>
            <p>Relevant customer and administrator emails are generated for order/payment confirmation, confirmed appointments, administrator-arranged reschedules, cancellations and refund status changes.</p>
            <p>Payment confirmations contain an amount/reference summary and a hosted Stripe receipt link where available. A successful refund confirmation includes the refund amount/reference and a receipt/refund-details link where Stripe provides one. A pending or failed refund is not described as a completed repayment.</p>
            <p>Email delivery can be delayed or filtered. Keep your contact email up to date, check your account and spam folder, and contact support if you do not receive an expected update. These service emails are separate from marketing.</p>
          </section>
          <section className={section}><h2 className={heading}>7. Statutory withdrawal and consumer rights</h2>
            <p>For eligible online consumer service contracts, a statutory withdrawal period is generally 14 days from conclusion of the contract, subject to applicable law and exceptions. This right is different from our voluntary refund policy and from simply releasing a call slot.</p>
            <p>To exercise an applicable right, send a clear statement identifying the contract and your decision to withdraw using our contact details below or another legally valid method. A reason and discretionary approval are not required. The following notice wording is optional:</p>
            <blockquote className="space-y-2 rounded-xl border border-[#E5B842]/25 bg-[#FAF8F5] p-3 dark:bg-[#131F33] sm:p-4">
              <p>I hereby withdraw from my contract for the following service:</p>
              <p>Service and booking reference:</p><p>Order date:</p><p>Name and contact email:</p><p>Date of this notice:</p>
            </blockquote>
            <p>Where a valid statutory withdrawal applies, its legal consequences and repayment deadlines apply, including reimbursement without undue delay and generally within 14 days of notice where required by the applicable rules.</p>
            <p>Starting a service during a withdrawal period, charging for work already performed, or loss of a withdrawal right requires the conditions prescribed by law. Merely reviewing the terms at checkout, booking a time or receiving personalised reading content does not automatically waive those rights.</p>
            <p>Any legally required online withdrawal function and confirmation requirements apply separately. This policy does not replace those obligations or restrict any mandatory remedy.</p>
          </section>
          <section className={section}><h2 className={heading}>8. Contact and related policies</h2>
            <p>For an existing order, use Get help with this booking in your account to open support with the booking reference included. You can also use the general contact form for booking, privacy or statutory-rights enquiries.</p>
            <PolicyContact />
            <nav aria-label="Related policies" className="grid gap-y-2 sm:flex sm:flex-wrap sm:gap-x-4">
              <Link href="/terms-of-service" className="underline underline-offset-4">Terms of Service</Link>
              <Link href="/privacy-policy" className="underline underline-offset-4">Privacy Policy</Link>
              <Link href="/disclaimer" className="underline underline-offset-4">Astrology Disclaimer</Link>
            </nav>
          </section>
        </div>
      </article></div>
    </main><Footer />
  </div>;
}
