import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FAF8F5]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 pt-36 pb-20 space-y-6 text-sm leading-relaxed">
        <p className="uppercase tracking-widest text-[#6B3448] dark:text-[#E5B842]">
          TheAstroKaur · Booking information
        </p>
        <h1 className="font-serif text-4xl">Bookings, changes and requests</h1>
        <p>
          Updated 19 October 2026. Payments are currently configured for
          testing.
        </p>
        <h2 className="font-serif text-2xl">Voice consultations</h2>
        <p>
          Your consultation is confirmed after Stripe verifies payment. The
          chosen time is temporarily held for five minutes during checkout. A
          calendar invitation and unique Google Meet link follow confirmation;
          you can check their status in your account.
        </p>
        <p>
          You may complete one self-service reschedule within 12 hours after the
          original payment-confirmed booking, ending earlier if your original
          consultation starts. The new time must be available and meet the
          normal booking rules. Failed attempts do not use this allowance. After
          that, contact support for help.
        </p>
        <p>
          A customer cancellation releases the appointment and does not
          automatically issue a voluntary refund. This preference does not
          restrict mandatory withdrawal or refund rights. If the owner cannot
          provide a consultation, contact support to arrange an appropriate
          alternative or refund/remedy.
        </p>
        <h2 className="font-serif text-2xl">Written readings</h2>
        <p>
          Written readings have no appointment, calendar invitation or Meet
          link. After payment, you receive an order confirmation. The owner
          personally contacts you about timing and emails the completed reading
          directly. No automatic delivery estimate applies.
        </p>
        <h2 className="font-serif text-2xl">Withdrawal and refund requests</h2>
        <p>
          Cancellation and withdrawal/refund requests are separate. In your
          reading details, choose “Request withdrawal / refund”, enter your
          reason and confirm the request. The owner reviews the request and
          contacts you. This does not automatically cancel an appointment or
          process a refund. You can also use Contact support.
        </p>
        <p>
          These booking conditions do not waive statutory consumer rights. No
          acknowledgment at checkout is presented as a waiver of those rights.
        </p>
        <Link
          href="/account?tab=readings"
          className="inline-block rounded-full bg-[#E5B842] px-5 py-3 font-semibold text-[#0F172A]"
        >
          Manage my readings
        </Link>
        <p>
          <Link className="underline" href="/terms-of-service">
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link className="underline" href="/privacy-policy">
            Privacy Policy
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
