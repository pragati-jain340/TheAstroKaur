import { redirect } from "next/navigation";

export default function LegacyTestimonialsPage() {
  redirect("/admin/content?section=testimonials");
}
