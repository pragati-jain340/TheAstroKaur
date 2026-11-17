import PolicyContact from "@/components/legal/PolicyContact";
import { legalDetails, POLICY_UPDATED_DATE } from "@/lib/legal/details";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";

export const metadata: Metadata = {
  title: "Terms of Service — TheAstroKaur",
  description:
    "Terms of Service for TheAstroKaur. Learn about the terms governing your access to our website, astrology readings, booking facilities, customer accounts, and related services.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] transition-colors duration-300 flex flex-col justify-between relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />
      <Navbar />

      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <article className="bg-white/90 dark:bg-[#0D1829]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[#0F172A]/10 dark:border-[#E5B842]/20 p-6 sm:p-12 lg:p-16 shadow-[0_12px_45px_rgba(229,184,66,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="mb-8 pb-8 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#6B3448] dark:text-[#E5B842] block mb-2 sm:mb-3">
                THE ASTROKAUR · LEGAL
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight mb-4">
                Terms of Service
              </h1>
              <div className="text-xs sm:text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-light flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">Last updated:</strong> {POLICY_UPDATED_DATE}
                </span>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-8 text-sm sm:text-base text-[#0F172A]/80 dark:text-[#FAF8F5]/80 font-light leading-relaxed">
              {/* Section 1 */}
              <section>
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  1. Introduction
                </h2>
                <div className="space-y-3">
                  <p>Welcome to TheAstroKaur.</p>
                  <p>
                    These Terms of Service (“Terms”) govern your access to and use of the TheAstroKaur website, including its content, astrology readings, booking facilities, customer accounts, and related services.
                  </p>
                  <p>
                    The website is operated by {legalDetails.operator} (“we,” “us,” or “our”).
                  </p>
                  <p>
                    By accessing the website, creating an account, booking a reading, or purchasing a service, you agree to these Terms. If you do not agree, please refrain from using the relevant services.
                  </p>
                  <p>
                    These Terms should be read together with our Privacy Policy, Cancellation &amp; Refund Policy, and Astrology Disclaimer, which provide additional information about specific aspects of our services.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  2. Eligibility and Customer Accounts
                </h2>
                <div className="space-y-3">
                  <p>
                    You may purchase our services only if you are legally capable of entering into a binding agreement under the laws applicable to you.
                  </p>
                  <p>
                    Certain features, including booking readings and accessing purchased services, may require you to create a customer account.
                  </p>
                  <p>When creating an account, you agree to:</p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>Provide accurate and up-to-date information.</li>
                    <li>Keep your account credentials secure.</li>
                    <li>Notify us if you become aware of unauthorised access to your account.</li>
                    <li>Use your account only for lawful purposes.</li>
                  </ul>
                  <p>
                    You must not impersonate another person, create fraudulent accounts, misuse the booking system, or attempt to access another customer&apos;s information.
                  </p>
                  <p>
                    Authorised administrators may deactivate an account where reasonably necessary because of misuse, security concerns, or a violation of these Terms, subject to applicable law. Deactivation restricts access; it does not itself erase records, cancel a booking, remove an existing contractual obligation, or issue a refund. Contact support if you believe an access restriction is incorrect. Administrator accounts are for service management and verification and cannot purchase paid readings for themselves.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  3. Our Services
                </h2>
                <div className="space-y-3">
                  <p>
                    TheAstroKaur offers astrology-related services intended to support personal reflection, self-discovery, and clarity.
                  </p>
                  <p>Our services may include:</p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>Personalised astrology readings.</li>
                    <li>Scheduled consultations.</li>
                    <li>Written or digitally delivered readings.</li>
                    <li>Free readings or complimentary services.</li>
                    <li>Other astrology-related offerings described on the website.</li>
                  </ul>
                  <p>
                    The available services, prices, delivery methods and voice-call duration are shown on the relevant service or booking page. For written readings, the owner contacts you by email to discuss timing; no automatic delivery deadline is displayed or promised unless separately agreed.
                  </p>
                  <p>
                    We may update or discontinue services from time to time. Such changes will not override existing contractual obligations or mandatory consumer rights.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  4. Bookings and Appointments
                </h2>
                <div className="space-y-3">
                  <p>
                    Bookings must be made through the booking process provided on the website.
                  </p>
                  <p>When booking a service, you are responsible for:</p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>Selecting the correct service and appointment slot.</li>
                    <li>Providing accurate contact details.</li>
                    <li>Supplying the information reasonably required for your reading.</li>
                    <li>Reviewing the booking details before confirming your purchase.</li>
                  </ul>
                  <p>
                    Stripe must verify a payment before an order is treated as paid. For a voice reading, payment is followed by a separate choice of an available appointment time. A payment receipt alone does not confirm a call time. A call appointment is confirmed once the chosen time is accepted by the booking system. If no suitable time is available, contact support so the owner can help arrange the consultation.
                  </p>
                  <p>
                    Keep your order reference, confirmations and relevant correspondence. Times are displayed in the time zone indicated during booking; check the date, time, time zone and service duration before confirming. Voice-call times share the reader&apos;s availability across consultation types.
                  </p>
                  <p>
                    Customers cannot reschedule an existing appointment directly. Use Get help with this booking in your account to request a different time; an administrator can arrange an available replacement where possible. Where a cancellation option is shown for a future confirmed call, cancelling releases the time but does not issue a refund. Other changes, including written-reading enquiries, are handled through support. Our Cancellation &amp; Refund Policy explains these procedures and your mandatory rights.
                  </p>
                  <p>
                    We will make reasonable efforts to deliver confirmed appointments as scheduled. If we need to change or cancel an appointment, we will communicate the available options in accordance with applicable law.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  5. Prices and Payments
                </h2>
                <div className="space-y-3">
                  <p>
                    Prices are displayed on the relevant service pages and are generally stated in euros (EUR), unless otherwise indicated.
                  </p>
                  <p>
                    Any applicable taxes and additional charges will be disclosed as required before you complete your purchase.
                  </p>
                  <p>
                    The current payment integration uses Stripe. It is configured for test mode: simulated payments and refunds do not move real money. Do not use real card details for testing. This test-mode notice does not limit statutory rights or any service commitments expressly made to you.
                  </p>
                  <p>
                    By placing an order, you agree to pay the amount displayed for your selected service.
                  </p>
                  <p>
                    After payment verification, customer and administrator emails confirm the relevant order or appointment. Payment confirmations include an amount/reference summary and a hosted Stripe receipt link where available. Appointment confirmations, administrator-arranged reschedules, cancellations and refund status changes also generate operational email updates. Delivery can be delayed; check your account and contact support if an expected message does not arrive.
                  </p>
                  <p>
                    Payment processing is subject to the relevant payment provider&apos;s terms and privacy practices. We do not intentionally store complete payment card details on our own systems.
                  </p>
                  <p>
                    If a payment fails or cannot be verified, the order is not treated as paid. A voluntary refund, when approved, is a separate payment action from booking cancellation. We may contact you about a payment problem, but an administrative refund does not by itself cancel a reading; the booking status and any agreed or legally required termination must be handled separately.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  6. Free Readings and Complimentary Services
                </h2>
                <div className="space-y-3">
                  <p>
                    We may offer free readings or other complimentary services from time to time.
                  </p>
                  <p>
                    Such services may be subject to eligibility requirements, usage limits, availability, or additional conditions communicated when the service is offered.
                  </p>
                  <p>
                    Unless expressly stated otherwise, free services have no cash value and cannot be exchanged for money or transferred to another person.
                  </p>
                  <p>
                    We may modify or discontinue a free offering, subject to applicable law and any commitments already made to customers.
                  </p>
                  <p>
                    The current complimentary rising-sign reading requires a signed-in account and is normally limited to one completed reading per customer account/email; you can revisit the saved result. It uses an automated chart calculation and general sign-based reading content, rather than a booked personal consultation. Administrative verification access is separate from customer eligibility and does not create a paid order or reserve a consultation slot.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  7. Information Required for Readings
                </h2>
                <div className="space-y-3">
                  <p>
                    Some readings may require information such as your date of birth, time of birth, or place of birth.
                  </p>
                  <p>
                    You are responsible for providing information that is accurate to the best of your knowledge. Incomplete or inaccurate information may affect the interpretation or scope of your reading.
                  </p>
                  <p>
                    Please provide only information reasonably necessary for the service you have requested.
                  </p>
                  <p>
                    If you submit personal information relating to another person, you are responsible for ensuring that you have a lawful basis to provide it.
                  </p>
                  <p>
                    Our collection and handling of personal information are explained in our Privacy Policy.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  8. Nature and Limitations of Astrology
                </h2>
                <div className="space-y-3">
                  <p>
                    Astrology readings are interpretative in nature and are offered for personal reflection, self-awareness, and entertainment.
                  </p>
                  <p>
                    They are not guaranteed predictions of future events, relationships, financial outcomes, career developments, or other life circumstances.
                  </p>
                  <p>
                    Different interpretations are possible, and individual experiences and outcomes may vary.
                  </p>
                  <p>
                    Our services do not constitute medical, psychological, legal, financial, investment, or other regulated professional advice.
                  </p>
                  <p>
                    You should consult an appropriately qualified professional when making decisions that require specialist advice.
                  </p>
                  <p>
                    You remain responsible for your own decisions and actions and for how you interpret and use the information provided in a reading.
                  </p>
                  <p>
                    Please refer to our separate{" "}
                    <a
                      href="/disclaimer"
                      className="text-[#6B3448] dark:text-[#E5B842] underline hover:opacity-80 transition-opacity"
                    >
                      Astrology Disclaimer
                    </a>{" "}
                    for further information.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  9. Delivery of Readings
                </h2>
                <div className="space-y-3">
                  <p>
                    Voice readings take place at a confirmed appointment time. Written readings are delivered personally by email after the owner contacts you about timing. A written reading does not include an appointment, Google Calendar invitation or Meet link. A delivery deadline applies only where expressly stated or agreed.
                  </p>
                  <p>Depending on the service purchased, a reading may be delivered through:</p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>A scheduled consultation.</li>
                    <li>A personalised written report.</li>
                    <li>Email or another designated digital delivery method.</li>
                    <li>Another method expressly offered for the selected service.</li>
                  </ul>
                  <p>
                    We will make reasonable efforts to deliver readings within the stated timeframe.
                  </p>
                  <p>
                    If a significant delay or delivery issue occurs, we will communicate relevant information and available options in accordance with applicable law.
                  </p>
                  <p>
                    Nothing in these Terms removes any rights you may have concerning services that are delayed, incomplete, defective, or not delivered as agreed.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  10. Cancellation, Withdrawal and Refunds
                </h2>
                <div className="space-y-4">
                  <p>
                    Customers may have statutory rights to withdraw from contracts concluded online, including applicable rights under German and European Union consumer protection law.
                  </p>
                  <p>
                    For eligible consumer contracts, the withdrawal period is generally 14 days, subject to applicable legal rules and exceptions. The starting point and consequences of withdrawal depend on the type of contract and the circumstances of the purchase.
                  </p>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      10.1 Services Started During the Withdrawal Period
                    </h3>
                    <div className="space-y-2">
                      <p>
                        Where a customer expressly requests that a service begin during the applicable withdrawal period, the customer may be required to pay a proportionate amount for services performed before withdrawal, where permitted by law and where the applicable requirements have been met.
                      </p>
                      <p>
                        A statutory withdrawal right may expire following full performance of a service only where the applicable legal requirements, including any required prior express consent and acknowledgment, have been satisfied.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      10.2 Digital Content
                    </h3>
                    <div className="space-y-2">
                      <p>
                        For certain digital content supplied without a physical medium, statutory withdrawal rights may be lost when performance begins only where the customer has provided the required express consent, acknowledged the resulting loss of the withdrawal right, and received the required contractual confirmation.
                      </p>
                      <p>
                        The legal classification of a particular reading depends on the nature of the product and the applicable law. Delivery of a personalised PDF or email does not automatically eliminate statutory withdrawal rights.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      10.3 Cancellation and Refund Procedures
                    </h3>
                    <div className="space-y-2">
                      <p>
                        Bookings are non-refundable as a voluntary policy, subject to statutory rights and any exception expressly approved by the owner. Contact support with your booking reference for help. Cancellation does not automatically issue a refund, and issuing an administrative refund does not itself cancel an appointment. Refund status can be pending, succeeded, failed or cancelled; a submitted request is not proof of completed repayment. Successful refunds include a confirmation/reference and receipt link where Stripe provides one. Practical procedures are described in our separate Cancellation &amp; Refund Policy.
                      </p>
                      <p>
                        Where a customer exercises a valid statutory withdrawal right, the applicable legal requirements regarding refunds, deadlines, and payment methods will apply.
                      </p>
                      <p>
                        Nothing in these Terms or our other policies excludes or restricts mandatory consumer rights.
                      </p>
                      <p>
                        A statutory withdrawal notice must clearly express your decision to withdraw and identify the relevant contract. You do not need to give a reason or obtain discretionary approval to exercise a valid statutory right. You may use the contact details and optional notice template in the Cancellation &amp; Refund Policy. Any legally required online withdrawal facility and acknowledgment requirements apply separately; a general non-refundable statement does not replace them. Reviewing the booking terms at checkout is not presented as a waiver of those rights.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 11 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  11. Intellectual Property
                </h2>
                <div className="space-y-3">
                  <p>
                    Unless otherwise stated, the website and its content, including text, logos, branding, graphics, visual elements, and original written materials, are owned by or lawfully used by TheAstroKaur.
                  </p>
                  <p>
                    You may access and use this content for personal, non-commercial purposes.
                  </p>
                  <p>
                    You must not reproduce, republish, distribute, modify, sell, or commercially exploit website content without appropriate permission, except where permitted by applicable law.
                  </p>
                  <p>
                    Personal readings purchased by you are intended for your personal use. You must not resell, commercially distribute, or represent them as your own work without appropriate permission.
                  </p>
                  <p>
                    Nothing in this section restricts rights that cannot lawfully be restricted.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  12. Reviews and User-Submitted Content
                </h2>
                <div className="space-y-3">
                  <p>
                    If you submit a review, testimonial, or other content through the website, you confirm that:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>The content reflects your genuine experience or is otherwise accurately represented. Customer reviews are linked to completed readings and must not include another person&apos;s private information without an appropriate basis.</li>
                    <li>You have the necessary rights and permissions to submit it.</li>
                    <li>The content does not knowingly contain unlawful, defamatory, misleading, or infringing material.</li>
                  </ul>
                  <p>
                    By submitting content, you grant us permission to display and reproduce it for operating and promoting TheAstroKaur, subject to applicable law and the scope of any permissions you have provided.
                  </p>
                  <p>
                    A published review can include your author/display name, rating, text, date, reading title and current profile photo. Please review what you submit and contact support if you need identifying information corrected or removed. We do not treat this permission as unrestricted authorisation to disclose private birth details or use identifying information beyond the permitted purpose.
                  </p>
                  <p>
                    We may decline to publish or remove content where reasonably necessary because it violates these Terms or applicable law.
                  </p>
                  <p>
                    We will not knowingly misrepresent fabricated reviews as genuine customer experiences.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  13. Acceptable Use
                </h2>
                <div className="space-y-3">
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-5 space-y-1.5 mb-2 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                    <li>Use the website for unlawful, fraudulent, or misleading purposes.</li>
                    <li>Attempt to access accounts, systems, or data without authorisation.</li>
                    <li>Interfere with the security or operation of the website.</li>
                    <li>Introduce malicious software or attempt to disrupt our services.</li>
                    <li>Misuse booking, payment, account, or review features.</li>
                    <li>Infringe the intellectual property, privacy, or other rights of another person.</li>
                    <li>Use automated extraction methods in violation of applicable law or our rights.</li>
                  </ul>
                  <p>
                    We may take reasonable and proportionate action to protect the website, customers, and our services from misuse, subject to applicable law.
                  </p>
                </div>
              </section>

              {/* Section 14 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  14. Third-Party Services and External Links
                </h2>
                <div className="space-y-3">
                  <p>
                    The website may rely on third-party providers for hosting, payments, booking, authentication, email delivery, and other functionality.
                  </p>
                  <p>
                    These providers may operate under their own terms and privacy policies.
                  </p>
                  <p>
                    External links may be provided for convenience. Their inclusion does not necessarily indicate endorsement of the linked website or its content.
                  </p>
                  <p>
                    We are not responsible for independent third-party services beyond the responsibilities imposed on us by applicable law.
                  </p>
                </div>
              </section>

              {/* Section 15 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  15. Website Availability and Changes
                </h2>
                <div className="space-y-3">
                  <p>
                    We aim to maintain the availability and proper functioning of the website. However, uninterrupted access cannot be guaranteed.
                  </p>
                  <p>
                    Maintenance, technical issues, security measures, or circumstances beyond our reasonable control may temporarily affect availability.
                  </p>
                  <p>
                    We may modify website features, content, or functionality to maintain, improve, or protect our services.
                  </p>
                  <p>
                    Such changes will not remove contractual rights already established or mandatory rights available to customers under applicable law.
                  </p>
                </div>
              </section>

              {/* Section 16 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  16. Liability
                </h2>
                <div className="space-y-3">
                  <p>
                    Nothing in these Terms excludes or limits liability where such exclusion or limitation is prohibited by applicable law.
                  </p>
                  <p>
                    In particular, nothing in these Terms excludes or limits liability for fraud, intentional misconduct, or other matters for which liability cannot legally be excluded or limited.
                  </p>
                  <p>
                    To the extent permitted by applicable law, we are not responsible for losses arising solely because a customer treats an astrology interpretation as a guaranteed prediction or as a substitute for qualified professional advice.
                  </p>
                  <p>
                    Any other limitation of liability will be interpreted in accordance with applicable law, including mandatory consumer protection rules.
                  </p>
                </div>
              </section>

              {/* Section 17 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  17. Privacy and Personal Information
                </h2>
                <div className="space-y-3">
                  <p>
                    Our Privacy Policy explains how personal information is collected, used, stored, and otherwise processed in connection with the website and its services.
                  </p>
                  <p>
                    Please review the Privacy Policy before providing personal information or creating an account.
                  </p>
                  <p>
                    Where consent is legally required for a particular processing activity, that consent will be obtained separately.
                  </p>
                  <p>
                    Acceptance of these Terms does not replace any separate consent or other legal basis required for processing personal information.
                  </p>
                </div>
              </section>

              {/* Section 18 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  18. Changes to These Terms
                </h2>
                <div className="space-y-3">
                  <p>
                    We may update these Terms to reflect changes in our services, website functionality, business practices, or legal obligations.
                  </p>
                  <p>
                    The latest version will be published on this page with its updated revision date.
                  </p>
                  <p>
                    Where notice or consent is required by applicable law, we will provide the required notice or obtain the necessary consent.
                  </p>
                  <p>
                    Updates will not retrospectively remove rights or alter existing contractual obligations where doing so would be contrary to applicable law.
                  </p>
                </div>
              </section>

              {/* Section 19 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  19. Governing Law and Consumer Rights
                </h2>
                <div className="space-y-3">
                  <p>
                    These Terms are intended to operate in accordance with the applicable laws of Germany, subject to mandatory provisions of European Union law and any other mandatory consumer protection laws that apply to a particular customer.
                  </p>
                  <p>
                    Where you qualify as a consumer residing in another country, any mandatory protections available to you under applicable law remain unaffected.
                  </p>
                  <p>
                    Nothing in this section deprives consumers of protections that cannot legally be excluded by agreement.
                  </p>
                </div>
              </section>

              {/* Section 20 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  20. Contact Information
                </h2>
                <p className="mb-3">
                  For questions about these Terms, our services, or your contractual rights, please contact us using the details below.
                </p>

                <PolicyContact />

                <div className="mt-5 space-y-3">
                  <p>
                    We will make reasonable efforts to respond to enquiries within an appropriate timeframe.
                  </p>
                  <p>
                    For formal statutory withdrawal notices, please use the applicable withdrawal procedure provided on our website, where required.
                  </p>
                </div>
              </section>

              {/* Closing Acknowledgment */}
              <div className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs sm:text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 italic">
                By using TheAstroKaur, you acknowledge that you have had the opportunity to review these Terms of Service. Where a purchase or particular feature requires affirmative agreement, we will request that agreement through the relevant process.
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
