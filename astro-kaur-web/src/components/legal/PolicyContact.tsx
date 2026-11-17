import Link from "next/link";
import ContactButton from "@/components/ui/ContactButton";
import { legalDetails } from "@/lib/legal/details";

export default function PolicyContact() {
  return <div className="space-y-3 rounded-2xl border border-[#E5B842]/25 bg-[#FAF8F5] p-5 text-sm text-[#0F172A]/85 dark:bg-[#131F33] dark:text-[#FAF8F5]/85 sm:p-6 sm:text-base">
    <p className="font-serif text-lg font-medium text-[#0F172A] dark:text-[#FAF8F5]">TheAstroKaur</p>
    <p><strong className="font-medium">Operator and data controller:</strong> {legalDetails.operator}, {legalDetails.country}</p>
    <p className="whitespace-pre-line"><strong className="font-medium">Business address:</strong> {legalDetails.address || "[Insert full business mailing address]"}</p>
    <p><strong className="font-medium">Business and privacy email:</strong> {legalDetails.email ? <a href={`mailto:${legalDetails.email}`} className="break-all underline underline-offset-4">{legalDetails.email}</a> : "[Insert public business/privacy email]"}</p>
    <p><Link href="/" className="underline underline-offset-4">TheAstroKaur website</Link></p>
    <ContactButton className="font-medium text-[#6B3448] underline underline-offset-4 dark:text-[#E5B842]">Contact support or submit a privacy enquiry</ContactButton>
    <p className="text-xs leading-relaxed text-[#0F172A]/65 dark:text-[#FAF8F5]/65">For booking help, include your booking reference. For privacy requests, tell us which account or information your request concerns. Do not send passwords, verification codes or full payment-card details.</p>
  </div>;
}
