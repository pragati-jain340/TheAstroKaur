import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";

export const metadata: Metadata = {
  title: "Privacy Policy — TheAstroKaur",
  description:
    "Privacy Policy for TheAstroKaur. Learn how we collect, use, store, and protect your personal information in accordance with GDPR and applicable data protection laws.",
};

export default function PrivacyPolicyPage() {
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
                Privacy Policy
              </h1>
              <div className="text-xs sm:text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-light flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">Effective Date:</strong> [Insert launch date]
                </span>
                <span className="hidden sm:inline opacity-40">•</span>
                <span>
                  <strong className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">Last Updated:</strong> [Insert date]
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
                  <p>
                    TheAstroKaur (“we”, “our”, or “us”) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share personal information when you visit our website, create an account, book an astrology reading, make a payment, submit a review, or contact us.
                  </p>
                  <p>
                    TheAstroKaur is operated by Harvinder Kaur in Germany. For the purposes of applicable data protection laws, Harvinder Kaur acts as the data controller for the personal information processed through TheAstroKaur, unless otherwise stated.
                  </p>
                  <p>
                    We process personal information in accordance with the General Data Protection Regulation (GDPR) and applicable German data protection laws.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  2. Information We Collect
                </h2>
                <p className="mb-4">
                  We collect personal information that is necessary to operate our website, manage customer accounts, and provide our services.
                </p>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.1 Account Information
                    </h3>
                    <p>
                      When you create an account, we may collect your name, email address, authentication information, account preferences, and other details necessary to manage your account.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.2 Birth and Reading Information
                    </h3>
                    <p className="mb-2">
                      To provide astrology readings, we may collect your date of birth, time of birth, place of birth, and information indicating whether your birth time is uncertain.
                    </p>
                    <p>
                      We use this information to prepare and deliver the reading you request. Please provide only information that is relevant to your reading.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.3 Booking and Order Information
                    </h3>
                    <p className="mb-2">
                      When you book a reading, we may collect your selected service, booking date and time, order details, delivery preferences, and information necessary to manage your booking and provide the requested service.
                    </p>
                    <p>
                      Appointment scheduling and related calendar services may be supported by Google Workspace.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.4 Payment Information
                    </h3>
                    <p className="mb-2">
                      Payments are processed through Stripe or the applicable payment service integrated into our website.
                    </p>
                    <p className="mb-2">
                      We may receive information such as payment status, transaction references, order amounts, and limited billing details required to manage your purchase.
                    </p>
                    <p>
                      We do not intend to store full payment card details on our own website systems. Payment information handled by Stripe is also subject to Stripe&apos;s applicable privacy terms.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.5 Profile Photos
                    </h3>
                    <p className="mb-2">
                      Uploading a profile photo is optional. If you choose to upload one, we use it only to display your profile image within your account and associated account interface.
                    </p>
                    <p className="mb-2">
                      <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Profile photos are not used to prepare, interpret, or analyse astrology readings.</strong> You can use the website without uploading a profile photo.
                    </p>
                    <p>
                      You may remove your profile photo through the available account features or contact us for assistance if necessary.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.6 Reviews and Feedback
                    </h3>
                    <p className="mb-2">
                      If you submit a review after a reading, we may collect your rating, review text, name or display name, and any profile image displayed alongside the review, depending on your choices and the website&apos;s functionality.
                    </p>
                    <p>
                      Reviews may be displayed publicly on our website as described when you submit them. Please avoid including sensitive or unnecessary personal information in a public review.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.7 Contact Information
                    </h3>
                    <p>
                      If you contact us through our contact form or email, we collect the information you provide, such as your name, email address, enquiry subject, message, and related correspondence.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-1.5">
                      2.8 Technical Information
                    </h3>
                    <p className="mb-2">
                      When you use our website, certain technical information may be processed, including your IP address, browser and device information, access times, security logs, and information needed to maintain website functionality.
                    </p>
                    <p>
                      Cookies and similar technologies may also collect information depending on which technologies are enabled and your cookie preferences.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  3. How We Use Your Information
                </h2>
                <p className="mb-3">
                  We use personal information for the following purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 mb-4 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                  <li>To create, authenticate, and manage customer accounts.</li>
                  <li>To prepare and deliver requested astrology readings.</li>
                  <li>To manage bookings, appointments, orders, and service delivery.</li>
                  <li>To process payments and handle transaction-related enquiries.</li>
                  <li>To display optional profile photos within customer accounts.</li>
                  <li>To collect, manage, and display reviews.</li>
                  <li>To respond to enquiries and send service-related communications.</li>
                  <li>To maintain website functionality, security, and reliability.</li>
                  <li>To prevent misuse, manage disputes, and protect our legal rights.</li>
                  <li>To meet applicable legal, tax, accounting, and regulatory obligations.</li>
                </ul>
                <div className="space-y-2">
                  <p>We do not use profile photos for astrology readings or analysis.</p>
                  <p>
                    We do not use personal information for a new purpose incompatible with the original purpose without first providing any additional information or obtaining consent where required by law.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  4. Legal Basis for Processing
                </h2>
                <p className="mb-3">
                  Where the GDPR applies, we process personal information only when a lawful basis applies to the relevant activity.
                </p>
                <p className="mb-3">
                  Depending on the circumstances, these bases may include:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Contractual necessity:</strong> To manage your account, booking, payment, and delivery of the service you request.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Legal obligation:</strong> To comply with applicable tax, accounting, and other legal requirements.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Legitimate interests:</strong> To maintain website security, prevent misuse, handle disputes, and operate our services, provided these interests do not override your fundamental rights and freedoms.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Consent:</strong> Where consent is required, including for applicable non-essential cookies or optional processing activities.
                  </li>
                </ul>
                <p>
                  Where processing is based on consent, you may withdraw that consent at any time. Withdrawal does not affect processing carried out lawfully before the withdrawal.
                </p>
              </section>

              {/* Section 5 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  5. Sharing of Information
                </h2>
                <p className="mb-3">
                  We share personal information only where necessary for the purposes described in this policy, where required by law, or where another lawful basis permits the disclosure.
                </p>
                <p className="mb-3">
                  Our website and services may rely on the following providers:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Vercel:</strong> Website hosting and deployment.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Hostinger:</strong> Domain registration and related domain services.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Supabase:</strong> Customer authentication, database services, and storage for information such as account details, orders, and profile photos.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Resend:</strong> Sending contact-form enquiries and other configured email communications.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Stripe:</strong> Payment processing.
                  </li>
                  <li>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Google Workspace:</strong> Appointment scheduling, calendar functionality, and related business communications.
                  </li>
                </ul>
                <div className="space-y-3">
                  <p>
                    The personal information processed by each provider depends on how the relevant service is configured and used.
                  </p>
                  <p>
                    These providers process information under their applicable terms and privacy arrangements. Where a provider processes personal information on our behalf, we will put the required data protection arrangements in place.
                  </p>
                  <p>
                    We may also disclose information to professional advisers or public authorities where necessary to comply with legal obligations or establish, exercise, or defend legal claims.
                  </p>
                  <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                    We do not sell customer personal information to third parties.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  6. Cookies and Similar Technologies
                </h2>
                <div className="space-y-3">
                  <p>
                    Our website may use essential cookies and similar technologies to support functions such as account authentication, session management, security, and user preferences.
                  </p>
                  <p>
                    If analytics, advertising, or other non-essential tracking technologies are introduced, we will handle them in accordance with applicable consent requirements.
                  </p>
                  <p>
                    Where required, non-essential cookies will not be activated before the necessary consent is obtained. You can manage your preferences through the available cookie controls.
                  </p>
                  <p>
                    The specific cookies and technologies used will depend on the website&apos;s actual configuration.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  7. Data Security
                </h2>
                <div className="space-y-3">
                  <p>
                    We take reasonable technical and organisational measures to protect personal information against unauthorised access, loss, alteration, disclosure, or misuse.
                  </p>
                  <p>
                    These measures may include access restrictions, database permissions, secure connections, and safeguards provided by our service providers.
                  </p>
                  <p>
                    No method of electronic transmission or storage can guarantee absolute security. We therefore cannot promise that information will be completely secure in every circumstance, but we take reasonable steps to protect the information entrusted to us.
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  8. Data Retention
                </h2>
                <p className="mb-3">
                  We retain personal information only for as long as necessary for the purposes for which it was collected, subject to applicable legal obligations and permitted exceptions.
                </p>
                <p className="mb-3">
                  Retention depends on the type of information and the relevant purpose:
                </p>
                <ul className="list-disc pl-5 space-y-2 mb-4 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                  <li>Account information is generally retained while your account is active and until deletion is completed, subject to information that must lawfully be retained.</li>
                  <li>Booking, transaction, invoice, and accounting records may need to be retained for applicable legal or tax periods.</li>
                  <li>Birth and reading information is retained for as long as necessary to provide the requested service and manage related customer records, subject to applicable retention requirements.</li>
                  <li>Contact enquiries are retained for the time necessary to respond and handle related matters.</li>
                  <li>Profile photos are retained while you choose to use them and until they are removed or deleted, subject to technical and legal requirements.</li>
                  <li>Reviews may remain published until removed in accordance with the available review controls, applicable policies, and legal requirements.</li>
                  <li>Security and technical logs are retained for a period appropriate to their security and operational purposes.</li>
                </ul>
                <div className="space-y-3">
                  <p>
                    When information is no longer necessary, we will delete it or take appropriate steps to anonymise it, subject to applicable legal obligations and legitimate needs to establish, exercise, or defend legal claims.
                  </p>
                  <p>
                    We will determine and document specific retention periods for relevant categories of information based on our actual practices and legal requirements.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  9. Your Account and Right to Delete It
                </h2>
                <div className="space-y-3">
                  <p>
                    You may request deletion of your TheAstroKaur account through the available account settings or deletion functionality.
                  </p>
                  <p>
                    When you delete your account, we will take the appropriate steps to delete or anonymise personal information associated with it, subject to applicable legal requirements and permitted exceptions.
                  </p>
                  <p>
                    Certain records, such as transaction or accounting information, may need to be retained for legal or tax purposes. Information contained in backups may also remain for a limited period until the applicable backup retention process removes it.
                  </p>
                  <p>
                    Deleting your account does not necessarily cancel an existing booking, automatically issue a refund, or immediately remove every record that we are legally required to retain. Please contact us if you need assistance with an existing order.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  10. Your Data Protection Rights
                </h2>
                <p className="mb-3">
                  Where the GDPR applies, you may have the right to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 mb-4 marker:text-[#6B3448] dark:marker:text-[#E5B842]">
                  <li>Request access to your personal information.</li>
                  <li>Request correction of inaccurate or incomplete information.</li>
                  <li>Request deletion of your personal information where the legal conditions are met.</li>
                  <li>Request restriction of processing in certain circumstances.</li>
                  <li>Object to processing based on legitimate interests on grounds relating to your particular situation.</li>
                  <li>Request data portability where the legal conditions are met.</li>
                  <li>Withdraw consent where processing is based on consent.</li>
                  <li>Lodge a complaint with a competent data protection supervisory authority.</li>
                </ul>
                <div className="space-y-3">
                  <p>
                    These rights are subject to applicable legal conditions and exceptions.
                  </p>
                  <p>
                    To exercise your rights, contact us using the details in Section 14. We may request information necessary to verify your identity before responding.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  11. International Data Transfers
                </h2>
                <div className="space-y-3">
                  <p>
                    Some of our service providers may process personal information outside Germany or the European Economic Area (EEA).
                  </p>
                  <p>
                    Where a transfer of personal information outside the EEA takes place, we will ensure that the transfer complies with applicable data protection law. Depending on the circumstances, this may involve an adequacy decision, appropriate safeguards such as Standard Contractual Clauses, or another lawful transfer mechanism.
                  </p>
                  <p>
                    The actual processing locations and applicable safeguards depend on the services used, their configuration, and the relevant provider agreements.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  12. Third-Party Websites and Services
                </h2>
                <div className="space-y-3">
                  <p>
                    Our website may link to third-party websites or services that are not operated by TheAstroKaur.
                  </p>
                  <p>
                    Those services have their own privacy policies and data handling practices. We encourage you to review their policies before providing personal information directly to them.
                  </p>
                </div>
              </section>

              {/* Section 13 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  13. Changes to This Privacy Policy
                </h2>
                <div className="space-y-3">
                  <p>
                    We may update this Privacy Policy when our services, website functionality, technology providers, or legal requirements change.
                  </p>
                  <p>
                    The latest version will be published on our website with an updated “Last Updated” date. Where required by law, we will provide additional notice or obtain consent before implementing changes that require it.
                  </p>
                </div>
              </section>

              {/* Section 14 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  14. Contact Us
                </h2>
                <p className="mb-3">
                  For questions about this Privacy Policy, requests concerning your personal information, or account deletion assistance, please contact:
                </p>

                <div className="mt-4 p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] dark:bg-[#131F33] border border-[#E5B842]/25 space-y-1.5 text-sm sm:text-base text-[#0F172A]/85 dark:text-[#FAF8F5]/85">
                  <p className="font-serif text-base sm:text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5] mb-2">
                    TheAstroKaur
                  </p>
                  <p>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Data Controller:</strong> Harvinder Kaur
                  </p>
                  <p>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Business Address:</strong> [Insert full business address in Germany]
                  </p>
                  <p>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Privacy Contact Email:</strong> [Insert dedicated privacy email address]
                  </p>
                  <p>
                    <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">Website:</strong> [Insert official website URL]
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <p>
                    You may also lodge a complaint with the competent data protection supervisory authority. Where the GDPR applies, this may include the supervisory authority in the EU Member State of your habitual residence, place of work, or the place of the alleged infringement.
                  </p>
                  <p>
                    We encourage you to contact us first if you have a concern so that we can attempt to resolve it.
                  </p>
                </div>
              </section>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
