"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Testimonial } from "@/lib/supabase/types";

interface ExtendedTestimonial extends Testimonial {
  orders?: {
    id: string;
    service_title: string;
    client_name: string | null;
  } | null;
  customer_profiles?: {
    display_name: string | null;
    email: string;
  } | null;
}

export default function AdminTestimonialsPage() {
  const supabase = createClient();

  const [testimonials, setTestimonials] = useState<ExtendedTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending">("all");
  const [ratingFilter, setRatingFilter] = useState<"all" | "5" | "4" | "3">("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedTestimonial | null>(null);
  const [modalForm, setModalForm] = useState({
    author_name: "",
    rating: 5,
    content: "",
    consent_given: true,
    is_published: true,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ExtendedTestimonial | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTestimonials = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch testimonials
      const { data: testimonialsData, error: fetchErr } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;

      // 2. Fetch orders map for service title and client name
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, service_title, client_name");

      const orderMap = new Map<string, { id: string; service_title: string; client_name: string | null }>();
      (ordersData || []).forEach((o: { id: string; service_title: string; client_name: string | null }) => {
        orderMap.set(o.id, o);
      });

      // 3. Fetch customer profiles map
      const { data: profilesData } = await supabase
        .from("customer_profiles")
        .select("id, display_name, email");

      const profileMap = new Map<string, { display_name: string | null; email: string }>();
      (profilesData || []).forEach((p: { id: string; display_name: string | null; email: string }) => {
        profileMap.set(p.id, { display_name: p.display_name, email: p.email });
      });

      // 4. Combine into ExtendedTestimonial
      const combined: ExtendedTestimonial[] = (testimonialsData || []).map((t: Testimonial) => ({
        ...t,
        orders: t.order_id ? orderMap.get(t.order_id) || null : null,
        customer_profiles: t.customer_id ? profileMap.get(t.customer_id) || null : null,
      }));

      setTestimonials(combined);
    } catch (err: unknown) {
      const errObj = err as any;
      console.error("Error fetching testimonials:", {
        message: errObj?.message,
        details: errObj?.details,
        hint: errObj?.hint,
        code: errObj?.code,
        raw: err,
      });
      const msg =
        errObj?.message ||
        errObj?.details ||
        errObj?.hint ||
        (err instanceof Error ? err.message : String(err));
      setError(msg && msg !== "{}" ? msg : "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleTogglePublish = async (testimonial: ExtendedTestimonial) => {
    const nextStatus = !testimonial.is_published;
    try {
      const { error: updateErr } = await supabase
        .from("testimonials")
        .update({ is_published: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", testimonial.id);

      if (updateErr) throw updateErr;

      setTestimonials((prev) =>
        prev.map((t) => (t.id === testimonial.id ? { ...t, is_published: nextStatus } : t))
      );
      setActionSuccess(
        nextStatus ? "Review published to the live site!" : "Review unpublished."
      );
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert("Failed to update publish status: " + ((err as Error).message || "Unknown error"));
    }
  };



  const openEditModal = (t: ExtendedTestimonial) => {
    setEditingItem(t);
    setModalForm({
      author_name: t.author_name,
      rating: t.rating ?? 5,
      content: t.content,
      consent_given: t.consent_given,
      is_published: t.is_published,
      sort_order: t.sort_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.author_name.trim() || !modalForm.content.trim()) {
      alert("Please provide both author name and testimonial content.");
      return;
    }
    setSaving(true);
    try {
      if (!editingItem) return;

      const { error: editErr } = await supabase
        .from("testimonials")
        .update({
          author_name: modalForm.author_name.trim(),
          rating: Number(modalForm.rating),
          content: modalForm.content.trim(),
          consent_given: modalForm.consent_given,
          is_published: modalForm.is_published,
          sort_order: Number(modalForm.sort_order),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);

      if (editErr) throw editErr;
      setActionSuccess("Testimonial updated successfully!");

      setIsModalOpen(false);
      setTimeout(() => setActionSuccess(null), 3000);
      await fetchTestimonials();
    } catch (err: unknown) {
      alert("Error saving testimonial: " + ((err as Error).message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", deleteTarget.id);

      if (delErr) throw delErr;

      setTestimonials((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setActionSuccess("Testimonial permanently deleted.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      alert("Failed to delete testimonial: " + ((err as Error).message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const totalReviews = testimonials.length;
  const publishedCount = testimonials.filter((t) => t.is_published).length;
  const pendingCount = testimonials.filter((t) => !t.is_published).length;
  const avgRating =
    totalReviews > 0
      ? (
          testimonials.reduce((sum, t) => sum + (t.rating || 5), 0) / totalReviews
        ).toFixed(1)
      : "5.0";

  // Filtered List
  const filtered = useMemo(() => {
    return testimonials.filter((t) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = t.author_name?.toLowerCase().includes(q);
        const matchesContent = t.content?.toLowerCase().includes(q);
        const matchesService = t.orders?.service_title?.toLowerCase().includes(q);
        if (!matchesName && !matchesContent && !matchesService) return false;
      }
      // Status
      if (statusFilter === "published" && !t.is_published) return false;
      if (statusFilter === "pending" && t.is_published) return false;
      // Rating
      if (ratingFilter === "5" && (t.rating ?? 5) < 5) return false;
      if (ratingFilter === "4" && (t.rating ?? 5) < 4) return false;
      if (ratingFilter === "3" && (t.rating ?? 5) >= 4) return false;

      return true;
    });
  }, [testimonials, search, statusFilter, ratingFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase hover:underline"
            >
              ADMIN
            </Link>
            <span className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">/</span>
            <span className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
              TESTIMONIALS
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            TESTIMONIALS & REVIEWS
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Manage client reviews, verify consent, and control publication to the public website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTestimonials}
            className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/40 transition-colors shadow-xs"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            Total Reviews
          </p>
          <p className="text-2xl font-serif font-bold text-[#0F172A] dark:text-[#FAF8F5] mt-1">
            {totalReviews}
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Lifetime submissions
          </p>
        </div>

        <div className="bg-white dark:bg-[#070D18] border border-emerald-500/20 dark:border-emerald-500/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Published Live
          </p>
          <p className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {publishedCount}
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Visible on landing page
          </p>
        </div>

        <div className="bg-white dark:bg-[#070D18] border border-amber-500/20 dark:border-amber-500/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
            Pending / Hidden
          </p>
          <p className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Awaiting approval
          </p>
        </div>

        <div className="bg-white dark:bg-[#070D18] border border-[#E5B842]/20 dark:border-[#E5B842]/20 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-[#E5B842] uppercase">
            Average Rating
          </p>
          <p className="text-2xl font-serif font-bold text-[#E5B842] mt-1 flex items-center gap-1.5">
            <span>{avgRating}</span>
            <span className="text-sm text-[#E5B842]">★★★★★</span>
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Across all feedback
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by client name, review content, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/40 focus:outline-none focus:border-[#E5B842] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-xs text-[#0F172A]/40 hover:text-[#0F172A]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] p-1 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-[#070D18] text-[#0F172A] dark:text-[#FAF8F5] shadow-xs"
                    : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
                }`}
              >
                All ({testimonials.length})
              </button>
              <button
                onClick={() => setStatusFilter("published")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === "published"
                    ? "bg-white dark:bg-[#070D18] text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                    : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
                }`}
              >
                Published ({publishedCount})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === "pending"
                    ? "bg-white dark:bg-[#070D18] text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                    : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A]"
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4+ Stars</option>
              <option value="3">3 Stars & Under</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-12 text-center text-xs text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
          Loading testimonials...
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-6 text-xs">
          <p className="font-bold mb-1">Failed to load testimonials</p>
          <p>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#E5B842]/10 text-[#E5B842] flex items-center justify-center mx-auto text-xl font-serif">
            ★
          </div>
          <h3 className="font-serif text-base font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
            {testimonials.length === 0 ? "No Testimonials Yet" : "No Testimonials Found"}
          </h3>
          <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 max-w-sm mx-auto">
            {testimonials.length === 0
              ? "Customer reviews will appear here once they are submitted."
              : "No testimonials match the active filter criteria. Try adjusting your search query or filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const ratingNum = t.rating ?? 5;
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#E5B842]/40 transition-colors"
              >
                <div className="space-y-3">
                  {/* Card Header: Author, Badges & Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E5B842]/15 text-[#E5B842] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                        {t.author_name ? t.author_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <h4 className="font-serif font-semibold text-[#0F172A] dark:text-[#FAF8F5] text-sm">
                          {t.author_name}
                        </h4>
                        <p className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                          {new Date(t.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Live Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          t.is_published
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {t.is_published ? "Live on Site" : "Unpublished"}
                      </span>

                      {/* Stars */}
                      <div className="flex items-center text-xs text-[#E5B842] tracking-widest">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={i < ratingNum ? "opacity-100" : "opacity-20 text-gray-400"}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <blockquote className="text-xs leading-relaxed text-[#0F172A]/80 dark:text-[#FAF8F5]/80 italic bg-[#FAF8F5] dark:bg-[#0D1829] p-3.5 rounded-xl border border-[#0F172A]/5 dark:border-[#FAF8F5]/5">
                    &ldquo;{t.content}&rdquo;
                  </blockquote>

                  {/* Linked reading / Service tag */}
                  <div className="flex items-center justify-between text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 pt-1">
                    <div className="flex items-center gap-2">
                      {t.orders?.service_title ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                          {t.orders.service_title}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#0F172A]/40">General Feedback</span>
                      )}

                      {t.consent_given ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          ✓ Consent Granted
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-500/70">
                          ⚠ Consent Pending
                        </span>
                      )}
                    </div>

                    {t.order_id && (
                      <Link
                        href={`/admin/readings/${t.order_id}`}
                        className="text-[10px] font-bold text-[#E5B842] hover:underline uppercase tracking-wider"
                      >
                        View Reading →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTogglePublish(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors shadow-xs ${
                      t.is_published
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    }`}
                  >
                    {t.is_published ? "Unpublish" : "Approve & Publish"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Testimonial Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                  "Edit Testimonial"
                </h3>
                <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5">
                  "Adjust client review ratings, text, or publication status."
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 flex items-center justify-center text-xs hover:bg-[#0F172A]/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={modalForm.author_name}
                  onChange={(e) => setModalForm({ ...modalForm, author_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                    Rating (Stars)
                  </label>
                  <select
                    value={modalForm.rating}
                    onChange={(e) => setModalForm({ ...modalForm, rating: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                  >
                    <option value={5}>5 Stars (Exceptional)</option>
                    <option value={4}>4 Stars (Very Good)</option>
                    <option value={3}>3 Stars (Good)</option>
                    <option value={2}>2 Stars (Fair)</option>
                    <option value={1}>1 Star (Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={modalForm.sort_order}
                    onChange={(e) => setModalForm({ ...modalForm, sort_order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                    placeholder="0 = Top"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                  Testimonial / Review Text *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter client feedback and quotes here..."
                  value={modalForm.content}
                  onChange={(e) => setModalForm({ ...modalForm, content: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842] leading-relaxed"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalForm.consent_given}
                    onChange={(e) => setModalForm({ ...modalForm, consent_given: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E5B842] focus:ring-[#E5B842]"
                  />
                  <span className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                    Client has given consent to display this review publicly
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalForm.is_published}
                    onChange={(e) => setModalForm({ ...modalForm, is_published: e.target.checked })}
                    className="w-4 h-4 rounded text-[#E5B842] focus:ring-[#E5B842]"
                  />
                  <span className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                    Publish immediately to the live website showcase
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-semibold tracking-wider uppercase bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#070D18] border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-xl font-serif">
              ✕
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                Delete Testimonial?
              </h3>
              <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                Are you sure you want to permanently delete the review by <strong>{deleteTarget.author_name}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
