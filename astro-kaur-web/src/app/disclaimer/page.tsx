import PolicyContact from "@/components/legal/PolicyContact";
import { POLICY_UPDATED_DATE } from "@/lib/legal/details";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";

export const metadata: Metadata = {
  title: "Astrology Disclaimer — TheAstroKaur",
  description:
    "Astrology Disclaimer for TheAstroKaur. Understand the purpose, nature, and limitations of astrology readings and services offered by TheAstroKaur.",
};

export default function DisclaimerPage() {
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
                Astrology Disclaimer
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
                  1. Purpose of Astrology Readings
                </h2>
                <div className="space-y-3">
                  <p>
                    At TheAstroKaur, astrology readings are offered as a means of self-discovery, personal reflection, and gaining a different perspective on life&apos;s experiences.
                  </p>
                  <p>
                    Our readings draw on astrological interpretations and traditional practices. They are intended to encourage reflection and help you explore your thoughts, experiences, and personal circumstances.
                  </p>
                  <p>
                    Astrology readings are interpretative in nature and should not be understood as scientifically established predictions of individual events or outcomes.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  2. No Guaranteed Predictions or Results
                </h2>
                <div className="space-y-3">
                  <p>
                    Every reading represents an interpretation based on the information available and the astrological approach used.
                  </p>
                  <p>
                    We do not guarantee the accuracy of any prediction or promise a particular outcome, event, or timeline.
                  </p>
                  <p>
                    Readings concerning relationships, marriage, career, education, finances, family, or other aspects of life should be understood as perspectives for reflection, not statements of certainty.
                  </p>
                  <p>
                    Your circumstances, personal choices, and factors beyond anyone&apos;s control may influence how events unfold.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  3. Not a Substitute for Professional Advice
                </h2>
                <div className="space-y-3">
                  <p>
                    TheAstroKaur does not provide medical, psychological, psychiatric, legal, financial, investment, tax, or other regulated professional advice through its astrology services.
                  </p>
                  <p>
                    Our readings must not be used as a substitute for advice from an appropriately qualified professional.
                  </p>
                  <p>
                    For matters requiring specialist guidance, please consult a qualified professional in the relevant field.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  4. Health and Wellbeing
                </h2>
                <div className="space-y-3">
                  <p>
                    Astrology readings are not medical assessments and cannot diagnose, treat, cure, or prevent illnesses or mental health conditions.
                  </p>
                  <p>
                    Any astrological interpretation relating to health or wellbeing should not be treated as a medical conclusion.
                  </p>
                  <p>
                    Please do not start, stop, or change medication, treatment, or professional care based on an astrology reading. For health concerns, consult a qualified healthcare professional.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  5. Financial, Career and Legal Decisions
                </h2>
                <div className="space-y-3">
                  <p>
                    Astrological interpretations relating to money, business, employment, education, property, or legal matters are not professional recommendations or guarantees of success.
                  </p>
                  <p>
                    You should not make significant financial, investment, career, or legal decisions solely on the basis of an astrology reading.
                  </p>
                  <p>
                    Consider the relevant facts, assess the risks, and seek qualified professional advice where appropriate.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  6. Personal Choice and Responsibility
                </h2>
                <div className="space-y-3">
                  <p>
                    Our readings are intended to support reflection, not to replace your independent judgement.
                  </p>
                  <p>
                    You are responsible for your own decisions, actions, and choices. You may consider the perspectives offered during a reading, but you are not required to follow any interpretation or suggestion.
                  </p>
                  <p>
                    No reading should be used as the sole basis for an important life decision.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  7. Information Provided by You
                </h2>
                <div className="space-y-3">
                  <p>
                    Certain readings may rely on details such as your date of birth, time of birth, and place of birth.
                  </p>
                  <p>
                    You are responsible for providing information that is accurate to the best of your knowledge.
                  </p>
                  <p>
                    Incomplete, incorrect or approximate information may affect the chart or interpretation. Birth-time uncertainty, birthplace coordinates, time-zone estimates, daylight-saving rules and different astrological conventions can change an ascendant or other chart placements. Check the inputs shown with your result and contact support about corrections before relying on an interpretation. The free rising-sign feature uses an external calculation service and general sign-based interpretation content; it is not an individual assessment of your whole birth chart. A saved or calculated result, including a result produced in an administrator verification session, is not a guarantee of factual accuracy or a future outcome. We cannot guarantee a particular result even when the supplied information is accurate.
                  </p>
                  <p>
                    Our handling of personal information is explained in the{" "}
                    <a
                      href="/privacy-policy"
                      className="text-[#6B3448] dark:text-[#E5B842] underline hover:opacity-80 transition-opacity"
                    >
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>
              </section>

              {/* Section 8 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  8. Astrological Remedies and Suggestions
                </h2>
                <div className="space-y-3">
                  <p>
                    Where applicable, a reading may include suggestions relating to traditional spiritual practices or personal reflection.
                  </p>
                  <p>
                    Any such suggestions are optional. They are not guarantees of a particular outcome and should be considered in light of your own circumstances, beliefs, and judgement.
                  </p>
                  <p>
                    You should never feel pressured to purchase additional products, services, gemstones, or remedies to prevent a predicted misfortune or to obtain a guaranteed result.
                  </p>
                  <p>
                    Do not undertake any practice that may put your health, safety, or financial wellbeing at risk.
                  </p>
                </div>
              </section>

              {/* Section 9 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  9. Testimonials and Individual Experiences
                </h2>
                <div className="space-y-3">
                  <p>
                    Testimonials and reviews displayed on TheAstroKaur reflect individual experiences and opinions.
                  </p>
                  <p>
                    An experience shared by one person does not establish that another person will experience the same result.
                  </p>
                  <p>
                    Testimonials should not be interpreted as guarantees of accuracy, effectiveness, or future outcomes.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  10. Website Content and External Resources
                </h2>
                <div className="space-y-3">
                  <p>
                    Information published on TheAstroKaur, including general astrology-related content, is provided for informational and reflective purposes.
                  </p>
                  <p>
                    It does not become regulated professional advice because it is personalised or delivered in a paid consultation. Free charts, written readings and voice consultations remain subject to the limitations described in this Disclaimer.
                  </p>
                  <p>
                    External websites or resources referenced on our website may be governed by their own terms and policies.
                  </p>
                </div>
              </section>

              {/* Section 11 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  11. Limitation of This Disclaimer
                </h2>
                <div className="space-y-3">
                  <p>
                    This Disclaimer explains the nature and limitations of our astrology services. It does not exclude or limit any rights or liabilities that cannot lawfully be excluded or limited under applicable law.
                  </p>
                  <p>
                    Nothing in this Disclaimer removes your rights where a service is not provided as agreed, restricts a valid statutory withdrawal/refund right, or excuses fraud or other conduct for which liability cannot lawfully be excluded. The non-refundable booking policy concerns voluntary refunds and must be read subject to those rights.
                  </p>
                  <p>
                    For information about bookings, cancellations, refunds, and contractual terms, please refer to our{" "}
                    <a
                      href="/terms-of-service"
                      className="text-[#6B3448] dark:text-[#E5B842] underline hover:opacity-80 transition-opacity"
                    >
                      Terms of Service
                    </a>{" "}
                    and Cancellation &amp; Refund Policy.
                  </p>
                </div>
              </section>

              {/* Section 12 */}
              <section className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <h2 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5] font-medium tracking-tight mb-3">
                  12. Contact Us
                </h2>
                <p className="mb-3">
                  If you have questions about this Astrology Disclaimer or the nature of our services, please contact us.
                </p>

                <PolicyContact />

              </section>

              {/* Closing Acknowledgment */}
              <div className="pt-6 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs sm:text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 italic">
                TheAstroKaur offers astrological insights for self-awareness, reflection, and conscious living. Your choices remain your own, and your future is not guaranteed by any reading.
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
