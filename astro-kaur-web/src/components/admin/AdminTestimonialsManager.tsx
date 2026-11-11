"use client";
import { NativeSelect } from "@/components/ui/native-select";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Testimonial } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

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

  const fetchTestimonials = useCallback(async () => {
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
      const errObj = (err && typeof err === "object" ? err : {}) as Record<
        string,
        unknown
      >;
      console.error("Error fetching testimonials:", {
        message: errObj?.message,
        details: errObj?.details,
        hint: errObj?.hint,
        code: errObj?.code,
        raw: err,
      });
      const msg = [errObj.message, errObj.details, errObj.hint].find(
        (value): value is string => typeof value === "string" && value.length > 0,
      ) || (err instanceof Error ? err.message : String(err));
      setError(msg && msg !== "{}" ? msg : "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(fetchTestimonials);
  }, [fetchTestimonials]);

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

  const openCreateModal = () => {
    setEditingItem(null);
    setModalForm({ author_name: "", rating: 5, content: "", consent_given: false, is_published: false, sort_order: testimonials.length });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.author_name.trim() || !modalForm.content.trim()) {
      alert("Please provide both author name and testimonial content.");
      return;
    }
    if (modalForm.is_published && !modalForm.consent_given) {
      alert("Record the client's consent before publishing this testimonial.");
      return;
    }
    setSaving(true);
    try {
      const values = {
          author_name: modalForm.author_name.trim(),
          rating: Number(modalForm.rating),
          content: modalForm.content.trim(),
          consent_given: modalForm.consent_given,
          is_published: modalForm.is_published,
          sort_order: Number(modalForm.sort_order),
          updated_at: new Date().toISOString(),
      };
      const result = editingItem
        ? await supabase.from("testimonials").update(values).eq("id", editingItem.id)
        : await supabase.from("testimonials").insert(values);

      if (result.error) throw result.error;
      setActionSuccess(editingItem ? "Testimonial updated." : "Testimonial added.");

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
      : "—";

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
          <h2 className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">Testimonials</h2>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Add or edit a testimonial, then publish it when the client has given consent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={openCreateModal}>Add testimonial</Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchTestimonials}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium animate-in fade-in flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)} className="h-6 w-6 p-0 text-xs opacity-60 hover:opacity-100">✕</Button>
        </div>
      )}

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{totalReviews}</strong> total</span>
        <span><strong className="text-foreground">{publishedCount}</strong> published</span>
        <span><strong className="text-foreground">{pendingCount}</strong> pending</span>
        <span><strong className="text-foreground">{avgRating}</strong> average rating</span>
      </p>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Input
              type="search"
              aria-label="Search testimonials"
              placeholder="Search testimonials"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842] transition-colors"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1 top-1 h-7 w-7 p-0 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] p-1 border border-border text-xs">
              <Button
                type="button"
                variant={statusFilter === "all" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
                className="h-7 text-xs font-medium"
              >
                All ({testimonials.length})
              </Button>
              <Button
                type="button"
                variant={statusFilter === "published" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={statusFilter === "published"}
                onClick={() => setStatusFilter("published")}
                className={`h-7 text-xs font-medium ${statusFilter === "published" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}`}
              >
                Published ({publishedCount})
              </Button>
              <Button
                type="button"
                variant={statusFilter === "pending" ? "secondary" : "ghost"}
                size="sm"
                aria-pressed={statusFilter === "pending"}
                onClick={() => setStatusFilter("pending")}
                className={`h-7 text-xs font-medium ${statusFilter === "pending" ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}`}
              >
                Pending ({pendingCount})
              </Button>
            </div>

            {/* Rating Filter */}
            <NativeSelect
              aria-label="Filter by rating"
              value={ratingFilter}
              onChange={(e) =>
                setRatingFilter(e.target.value as "all" | "5" | "4" | "3")
              }
              className="px-3 py-2 rounded-xl text-xs bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4+ Stars</option>
              <option value="3">3 Stars & Under</option>
            </NativeSelect>
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
              <Card
                key={t.id}
                className="gap-4 p-5 justify-between hover:border-[#E5B842]/40 transition-colors"
              >
                <div className="space-y-3">
                  {/* Card Header: Author, Badges & Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E5B842]/15 text-[#E5B842] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                        {t.author_name ? t.author_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <h4 className="font-serif font-semibold text-sm">
                          {t.author_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
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
                      <Badge
                        variant={t.is_published ? "default" : "secondary"}
                        className={
                          t.is_published
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }
                      >
                        {t.is_published ? "Live on Site" : "Unpublished"}
                      </Badge>

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
                  <blockquote className="text-xs leading-relaxed italic bg-muted/40 p-3.5 rounded-xl border border-border">
                    &ldquo;{t.content}&rdquo;
                  </blockquote>

                  {/* Linked reading / Service tag */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <div className="flex items-center gap-2">
                      {t.orders?.service_title ? (
                        <Badge variant="outline" className="font-normal text-[11px]">
                          {t.orders.service_title}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">General Feedback</span>
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
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={t.is_published ? "outline" : "default"}
                    onClick={() => handleTogglePublish(t)}
                    className={
                      t.is_published
                        ? "text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
                        : "text-xs font-semibold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-500"
                    }
                  >
                    {t.is_published ? "Unpublish" : "Approve & Publish"}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(t)}
                      className="text-xs font-medium"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteTarget(t)}
                      className="text-xs font-medium"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-border bg-card text-card-foreground sm:max-w-lg">
          <DialogTitle className="pr-8 font-serif text-xl">{editingItem ? "Edit testimonial" : "Add testimonial"}</DialogTitle>
          <DialogDescription className="mt-1 mb-5">{editingItem ? "Update the review and its publication status." : "Add a review. Consent is required before publishing."}</DialogDescription>
            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label htmlFor="testimonial-author" className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                  Client Name *
                </label>
                <Input id="testimonial-author"
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={modalForm.author_name}
                  onChange={(e) => setModalForm({ ...modalForm, author_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="testimonial-rating" className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                    Rating (Stars)
                  </label>
                  <NativeSelect id="testimonial-rating"
                    value={modalForm.rating}
                    onChange={(e) => setModalForm({ ...modalForm, rating: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                  >
                    <option value={5}>5 Stars (Exceptional)</option>
                    <option value={4}>4 Stars (Very Good)</option>
                    <option value={3}>3 Stars (Good)</option>
                    <option value={2}>2 Stars (Fair)</option>
                    <option value={1}>1 Star (Poor)</option>
                  </NativeSelect>
                </div>

                <div>
                  <label htmlFor="testimonial-order" className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                    Sort Order
                  </label>
                  <Input id="testimonial-order"
                    type="number"
                    value={modalForm.sort_order}
                    onChange={(e) => setModalForm({ ...modalForm, sort_order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842]"
                    placeholder="0 = Top"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="testimonial-content" className="block font-bold tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase mb-1">
                  Testimonial / Review Text *
                </label>
                <Textarea id="testimonial-content"
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
                  <Checkbox
                    checked={modalForm.consent_given}
                    onCheckedChange={(checked) => setModalForm({ ...modalForm, consent_given: checked === true })}
                    
                  />
                  <span className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                    Client has given consent to display this review publicly
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={modalForm.is_published}
                    onCheckedChange={(checked) => setModalForm({ ...modalForm, is_published: checked === true })}
                    
                  />
                  <span className="font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                    Publish immediately to the live website showcase
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  type="button" variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl font-semibold tracking-wider uppercase bg-[#E5B842] text-[#070D18] hover:bg-[#d4a838] transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingItem ? "Save changes" : "Add testimonial"}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-border bg-card text-card-foreground">
          <AlertDialogTitle>Delete testimonial?</AlertDialogTitle>
          <AlertDialogDescription>Permanently delete the review by {deleteTarget?.author_name}? This cannot be undone.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>{deleting ? "Deleting…" : "Delete testimonial"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
