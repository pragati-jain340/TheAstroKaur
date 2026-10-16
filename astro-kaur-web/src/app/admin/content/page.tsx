"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ASCENDANT_READINGS, AscendantReading } from "@/lib/astrology/ascendantData";
import { DEFAULT_FREE_READING_CONTENT, FreeReadingContent } from "@/lib/astrology/freeReadingContent";

interface AboutContent {
  tag: string;
  heading_prefix: string;
  heading_name: string;
  paragraph_1: string;
  paragraph_2: string;
  image_url: string;
}

interface VisionContent {
  tag: string;
  heading_line_1: string;
  heading_line_2: string;
  paragraph_1: string;
  paragraph_2: string;
}

const DEFAULT_VISION: VisionContent = {
  tag: "A VISION FOR ASTROLOGY",
  heading_line_1: "There Is More Than One Way",
  heading_line_2: "to See Your Story.",
  paragraph_1:
    "The same experiences can look different when we understand ourselves a little better. Astrology offers a perspective on the relationships we build, the choices we face, and the paths we take.",
  paragraph_2:
    "Through my practice, I hope to bridge the gap between ancient Vedic wisdom and the modern world, making astrology easier to understand and relevant to everyday life. Rather than seeing it as a way to reflect on our experiences, understand ourselves better, and approach life's uncertainties with greater awareness.",
};

interface ServiceItem {
  id: string;
  sort_order: number;
  title: string;
  description: string;
  format: "text" | "voice_call";
  duration_minutes: number | null;
  price_cents: number;
  currency: string;
  is_active: boolean;
  image_url?: string | null;
  requires_partner_details?: boolean;
}

function getServiceSlug(title?: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("matchmaking")) return "matchmaking-reading";
  if (t.includes("future partner") && !t.includes("karma") && !t.includes("relationship")) return "future-partner";
  if (t.includes("karma") || t.includes("relationship")) return "relationship-karma";
  if (t.includes("voice") && (t.includes("career") || t.includes("money") || t.includes("guidance"))) return "career-money-guidance";
  if (t.includes("guidance")) return "career-money-guidance";
  if (t.includes("career") || t.includes("money")) return "career-money-reading";
  if (t.includes("extensive") || t.includes("birth chart")) return "extensive-chart";
  return "extensive-chart";
}

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<"about" | "vision" | "free-reading" | "readings">("about");
  const [loading, setLoading] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingVision, setSavingVision] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [savingFreeReading, setSavingFreeReading] = useState(false);

  // Database setup state
  const [dbStatus, setDbStatus] = useState<{
    profiles: { exists: boolean; rows: number };
    services: { exists: boolean; rows: number };
    freeReadingContent: { exists: boolean; rows: number };
  } | null>(null);
  const [settingUpDb, setSettingUpDb] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // About Me form state
  const [aboutForm, setAboutForm] = useState<AboutContent>({
    tag: "THE PERSON BEHIND THE READINGS",
    heading_prefix: "Meet",
    heading_name: "TheAstroKaur",
    paragraph_1: "",
    paragraph_2: "",
    image_url: "/Owner_image.png",
  });

  // Vision Section form state
  const [visionForm, setVisionForm] = useState<VisionContent>(DEFAULT_VISION);
  const [selectedAscendant, setSelectedAscendant] = useState("Aries");
  const [ascendantContent, setAscendantContent] = useState<Record<string, AscendantReading>>(ASCENDANT_READINGS);
  const [freeReadingForm, setFreeReadingForm] = useState<FreeReadingContent>(DEFAULT_FREE_READING_CONTENT);

  // Photo Upload & WebP Conversion state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [webpStatus, setWebpStatus] = useState<{
    originalKB: number;
    webpKB: number;
    savingsPercent: number;
  } | null>(null);

  // Convert any image file (PNG, JPG, HEIC, etc.) to WebP in browser using HTML5 Canvas
  const convertImageToWebP = (
    file: File,
    maxWidth = 1400,
    maxHeight = 1800,
    quality = 0.88
  ): Promise<{ webpBlob: Blob; webpKB: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Proportional scaling for optimal web display
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Browser does not support Canvas processing."));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("Failed to convert image to WebP format."));
              }
              resolve({
                webpBlob: blob,
                webpKB: Math.round(blob.size / 1024),
              });
            },
            "image/webp",
            quality
          );
        };

        img.onerror = () => reject(new Error("Unable to decode the chosen image file."));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Unable to read image file from disk."));
      reader.readAsDataURL(file);
    });
  };

  // Handle image selection from PC
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotification({
        type: "error",
        message: "Please select a valid image file (PNG, JPG, JPEG, or WEBP).",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const originalKB = Math.round(file.size / 1024);
      // 1. Convert to WebP in browser
      const { webpBlob, webpKB } = await convertImageToWebP(file);
      const savingsPercent = Math.max(
        0,
        Math.round(((originalKB - webpKB) / originalKB) * 100)
      );

      setWebpStatus({ originalKB, webpKB, savingsPercent });

      // 2. Upload WebP blob to API endpoint
      const formData = new FormData();
      formData.append("file", webpBlob, "profile_photo.webp");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload image file");

      // 3. Immediately set the new WebP URL in state
      setAboutForm((prev) => ({
        ...prev,
        image_url: json.url,
      }));

      setNotification({
        type: "success",
        message: `Image converted to WebP (${webpKB} KB, ${savingsPercent}% smaller) and uploaded! Click "Save About Section" to publish.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to process image.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Services state
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Service Artwork Upload & WebP state
  const serviceFileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingServicePhoto, setUploadingServicePhoto] = useState(false);
  const [isServiceDragging, setIsServiceDragging] = useState(false);
  const [serviceWebpStatus, setServiceWebpStatus] = useState<{
    originalKB: number;
    webpKB: number;
    savingsPercent: number;
  } | null>(null);

  const [serviceForm, setServiceForm] = useState<{
    id?: string;
    title: string;
    description: string;
    format: "text" | "voice_call";
    duration_minutes: number | string;
    price_eur: number | string;
    is_active: boolean;
    sort_order: number | string;
    image_url: string;
  }>({
    title: "",
    description: "",
    format: "voice_call",
    duration_minutes: 45,
    price_eur: 60,
    is_active: true,
    sort_order: 1,
    image_url: "",
  });

  // Handle Reading Service image selection from PC
  const handleServiceFileSelect = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotification({
        type: "error",
        message: "Please select a valid image file (PNG, JPG, JPEG, WEBP, or SVG).",
      });
      return;
    }

    setUploadingServicePhoto(true);

    try {
      const originalKB = Math.round(file.size / 1024);
      // 1. Convert to WebP in browser (proportional scaling up to 600x600 for card artwork)
      const { webpBlob, webpKB } = await convertImageToWebP(file, 600, 600, 0.90);
      const savingsPercent = Math.max(
        0,
        Math.round(((originalKB - webpKB) / originalKB) * 100)
      );

      setServiceWebpStatus({ originalKB, webpKB, savingsPercent });

      // 2. Upload WebP blob to API endpoint
      const formData = new FormData();
      formData.append("file", webpBlob, `reading_service_${Date.now()}.webp`);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload image file");

      // 3. Immediately set the new WebP URL in state
      setServiceForm((prev) => ({
        ...prev,
        image_url: json.url,
      }));

      setNotification({
        type: "success",
        message: `Reading artwork converted to WebP (${webpKB} KB, ${savingsPercent}% smaller) and uploaded!`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to process image.",
      });
    } finally {
      setUploadingServicePhoto(false);
    }
  };

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Check DB table status
  const checkDbStatus = async () => {
    try {
      const res = await fetch("/api/admin/setup-db");
      const json = await res.json();
      setDbStatus(json);
    } catch {
      // silently ignore
    }
  };

  // One-click database setup — creates tables + seeds default data
  const handleSetupDb = async () => {
    setSettingUpDb(true);
    try {
      const res = await fetch("/api/admin/setup-db", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Setup failed");
      setNotification({
        type: "success",
        message: "✓ Database tables created! Loading content now…",
      });
      await checkDbStatus();
      await loadContent();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: "DB setup failed: " + (err.message || "Unknown error"),
      });
    } finally {
      setSettingUpDb(false);
    }
  };

  // Load content from API
  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      const json = await res.json();

      if (json.about) {
        setAboutForm(json.about);
      }
      if (json.vision) {
        setVisionForm(json.vision);
      }
      if (json.ascendantReadings) {
        const savedContent = json.ascendantReadings.reduce(
          (all: Record<string, AscendantReading>, item: { sign: string; content: AscendantReading | null }) => {
            if (item.content) all[item.sign] = item.content;
            return all;
          },
          { ...ASCENDANT_READINGS }
        );
        setAscendantContent(savedContent);
      }
      if (json.services) {
        setServices(json.services);
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: "Failed to load website content: " + (err.message || "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDbStatus();
    loadContent();
  }, []);

  // Save About Section
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAbout(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "about",
          data: aboutForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save about content");

      setNotification({
        type: "success",
        message: "About Me section successfully updated on the website!",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not save about content",
      });
    } finally {
      setSavingAbout(false);
    }
  };

  // Save Vision Section
  const handleSaveVision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVision(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "vision",
          data: visionForm,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save vision content");

      setNotification({
        type: "success",
        message: "Vision section successfully updated on the website!",
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not save vision content",
      });
    } finally {
      setSavingVision(false);
    }
  };

  const handleSaveFreeReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFreeReading(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ascendant_reading", data: { sign: selectedAscendant, content: ascendantContent[selectedAscendant] } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save free reading content");
      setNotification({ type: "success", message: `${selectedAscendant} Ascendant reading updated on the website!` });
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "Could not save free reading content" });
    } finally {
      setSavingFreeReading(false);
    }
  };

  // Open Edit Service Modal
  const openEditService = (service: ServiceItem) => {
    setIsCreatingNew(false);
    setEditingService(service);
    setServiceWebpStatus(null);
    setServiceForm({
      id: service.id,
      title: service.title,
      description: service.description,
      format: service.format,
      duration_minutes: service.duration_minutes ?? "",
      price_eur: (service.price_cents / 100).toFixed(0),
      is_active: service.is_active,
      sort_order: service.sort_order,
      image_url: service.image_url || "",
    });
    setIsServiceModalOpen(true);
  };

  // Open Create Service Modal
  const openCreateService = () => {
    setIsCreatingNew(true);
    setEditingService(null);
    setServiceWebpStatus(null);
    setServiceForm({
      title: "",
      description: "",
      format: "voice_call",
      duration_minutes: 45,
      price_eur: 50,
      is_active: true,
      sort_order: services.length + 1,
      image_url: "",
    });
    setIsServiceModalOpen(true);
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingService(true);
    try {
      const priceCents = Math.round(Number(serviceForm.price_eur) * 100);
      const durationMins =
        serviceForm.format === "text"
          ? null
          : serviceForm.duration_minutes
          ? Number(serviceForm.duration_minutes)
          : null;

      const payload = {
        type: isCreatingNew ? "service_create" : "service_update",
        data: {
          id: serviceForm.id,
          title: serviceForm.title,
          description: serviceForm.description,
          format: serviceForm.format,
          duration_minutes: durationMins,
          price_cents: priceCents,
          is_active: serviceForm.is_active,
          sort_order: Number(serviceForm.sort_order),
          image_url: serviceForm.image_url || null,
        },
      };

      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reading service");

      setNotification({
        type: "success",
        message: isCreatingNew
          ? "New reading service created successfully!"
          : "Reading service updated successfully!",
      });

      setIsServiceModalOpen(false);
      await loadContent();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not save reading service",
      });
    } finally {
      setSavingService(false);
    }
  };

  // Toggle Service Active Quick Action
  const handleToggleActive = async (service: ServiceItem) => {
    try {
      const updatedActive = !service.is_active;
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "service_update",
          data: {
            id: service.id,
            title: service.title,
            description: service.description,
            format: service.format,
            duration_minutes: service.duration_minutes,
            price_cents: service.price_cents,
            is_active: updatedActive,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: updatedActive } : s))
      );

      setNotification({
        type: "success",
        message: `Service "${service.title}" is now ${updatedActive ? "Active" : "Hidden"}.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to update status",
      });
    }
  };

  // Service deletion state & handlers
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const confirmDeleteService = (service: ServiceItem) => {
    setServiceToDelete(service);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setDeletingServiceId(serviceToDelete.id);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "service_delete",
          data: { id: serviceToDelete.id },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete reading service");

      // Remove immediately from local state
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));

      // If the edit modal was open for this service, close it
      if (editingService?.id === serviceToDelete.id) {
        setIsServiceModalOpen(false);
      }

      setIsDeleteModalOpen(false);
      const deletedTitle = serviceToDelete.title;
      setServiceToDelete(null);

      setNotification({
        type: "success",
        message: `Service "${deletedTitle}" and its uploaded storage assets were successfully deleted!`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Could not delete reading service",
      });
    } finally {
      setDeletingServiceId(null);
    }
  };

  const activeServicesCount = services.filter((s) => s.is_active).length;
  const hiddenServicesCount = services.filter((s) => !s.is_active).length;
  const readingSectionKeys = [
    ["Core Energy", "coreEnergy"],
    ["Career & Success", "careerSuccess"],
    ["Love & Relationships", "loveRelationships"],
    ["Money & Security", "moneySecurity"],
    ["Your Emotional World", "emotionalWorld"],
    ["Your Hidden Potential", "hiddenPotential"],
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* ─── Header matching Admin Dashboard design ─── */}
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
              CONTENT
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            WEBSITE CONTENT
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Edit About Me and Vision sections copy, reading catalog prices, duration, and formats.
          </p>
        </div>

        <button
          type="button"
          onClick={loadContent}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5 transition-all shadow-xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <span className={loading ? "animate-spin" : ""}>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── Metrics Bar matching Testimonials & Overview tabs ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            Active Readings
          </p>
          <p className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {activeServicesCount}
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Visible to clients
          </p>
        </div>

        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            Hidden Readings
          </p>
          <p className="text-2xl font-serif font-bold text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-1">
            {hiddenServicesCount}
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Draft / Inactive
          </p>
        </div>

        <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold tracking-wider text-[#E5B842] uppercase">
            Pricing Tiers
          </p>
          <p className="text-2xl font-serif font-bold text-[#E5B842] mt-1">
            €20 – €60
          </p>
          <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-0.5">
            Text &amp; Voice calls
          </p>
        </div>
      </div>

      {/* ─── Database Setup Warning Banner ─── */}
      {dbStatus && (!dbStatus.profiles.exists || !dbStatus.services.exists || !dbStatus.freeReadingContent.exists) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/8 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-base mt-0.5">⚠</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Database tables are missing
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                {!dbStatus.profiles.exists && <span className="mr-2">❌ <code>profiles</code> (About Me + Vision)</span>}
                {!dbStatus.services.exists && <span>❌ <code>services</code> (Readings catalog)</span>}
                {!dbStatus.freeReadingContent.exists && <span className="mr-2">❌ <code>free_reading_content</code> (Free Reading copy)</span>}
                {" — admin edits won't save until tables are created."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSetupDb}
            disabled={settingUpDb}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
          >
            {settingUpDb ? (
              <><span className="animate-spin">⟳</span> Creating tables…</>
            ) : (
              <>⚡ Create Tables Now</>
            )}
          </button>
        </div>
      )}

      {/* ─── DB tables all good banner ─── */}
      {dbStatus && dbStatus.profiles.exists && dbStatus.services.exists && dbStatus.freeReadingContent.exists && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/6 text-[11px] text-emerald-700 dark:text-emerald-400">
          <span>✓</span>
          <span>
            Database ready — <code>profiles</code> ({dbStatus.profiles.rows} row{dbStatus.profiles.rows !== 1 ? "s" : ""}){" "}
            &amp; <code>services</code> ({dbStatus.services.rows} service{dbStatus.services.rows !== 1 ? "s" : ""})
            {" "}&amp; <code>free_reading_content</code> ({dbStatus.freeReadingContent.rows} record{dbStatus.freeReadingContent.rows !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* ─── 5-Second Dismissible Notification Alert ─── */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-4 p-4 rounded-2xl text-xs sm:text-sm border transition-all animate-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
              : "bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span>{notification.type === "success" ? "✓" : "⚠"}</span>
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer p-1"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Filter & Sub-Tabs Bar matching Readings & Users tabs ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xs">
        {/* Unified Tab Pills Container */}
        <div className="inline-flex max-w-full overflow-x-auto shrink-0 [&>button]:shrink-0 p-1 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "about"
                ? "bg-[#E5B842] text-[#0F172A] font-semibold shadow-xs"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            About Me Section
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vision")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "vision"
                ? "bg-[#E5B842] text-[#0F172A] font-semibold shadow-xs"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            Vision Section
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("free-reading")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "free-reading"
                ? "bg-[#E5B842] text-[#0F172A] font-semibold shadow-xs"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            Free Reading
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("readings")}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === "readings"
                ? "bg-[#E5B842] text-[#0F172A] font-semibold shadow-xs"
                : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            Readings &amp; Services ({services.length})
          </button>
        </div>

        {/* Action Button for Readings Tab */}
        {activeTab === "readings" && (
          <button
            type="button"
            onClick={openCreateService}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <span>+ Add New Reading</span>
          </button>
        )}
      </div>

      {/* ── SUB-TAB 1: ABOUT ME SECTION ── */}
      {activeTab === "about" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Edit Form */}
          <div className="lg:col-span-7 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 sm:p-7 shadow-xs">
            <h2 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] mb-5 uppercase tracking-wide">
              Edit Meet TheAstroKaur
            </h2>

            <form onSubmit={handleSaveAbout} className="space-y-4">
              {/* Badge Label */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Badge Label (Uppercase Pill)
                </label>
                <input
                  type="text"
                  value={aboutForm.tag}
                  onChange={(e) => setAboutForm({ ...aboutForm, tag: e.target.value })}
                  placeholder="THE PERSON BEHIND THE READINGS"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  required
                />
              </div>

              {/* Heading: Prefix & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Heading Line 1
                  </label>
                  <input
                    type="text"
                    value={aboutForm.heading_prefix}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, heading_prefix: e.target.value })
                    }
                    placeholder="Meet"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Heading Line 2 (Gold Accent)
                  </label>
                  <input
                    type="text"
                    value={aboutForm.heading_name}
                    onChange={(e) =>
                      setAboutForm({ ...aboutForm, heading_name: e.target.value })
                    }
                    placeholder="TheAstroKaur"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                    required
                  />
                </div>
              </div>

              {/* Story Paragraph 1 */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Story Paragraph 1 (Academic Background &amp; Rational Logic)
                </label>
                <textarea
                  rows={4}
                  value={aboutForm.paragraph_1}
                  onChange={(e) =>
                    setAboutForm({ ...aboutForm, paragraph_1: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 leading-relaxed"
                  required
                />
              </div>

              {/* Story Paragraph 2 */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Story Paragraph 2 (Astrological Awakening &amp; Growth)
                </label>
                <textarea
                  rows={4}
                  value={aboutForm.paragraph_2}
                  onChange={(e) =>
                    setAboutForm({ ...aboutForm, paragraph_2: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 leading-relaxed"
                  required
                />
              </div>

              {/* Profile Photo Uploader with Auto WebP Conversion */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                    Profile Photograph (Auto-converts to WebP)
                  </label>
                  <span className="text-[10px] font-semibold text-[#E5B842] uppercase tracking-wider">
                    ⚡ WebP Compressed
                  </span>
                </div>

                {/* Drag & Drop Upload Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${
                    isDragging
                      ? "border-[#E5B842] bg-[#E5B842]/10"
                      : "border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5]/50 dark:bg-[#131F33]/50 hover:border-[#E5B842]/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {/* Thumbnail of Current Image */}
                    <div className="relative w-16 h-20 rounded-tr-2xl overflow-hidden border border-[#E5B842] shadow-sm shrink-0 bg-black/5 dark:bg-white/5">
                      <Image
                        src={aboutForm.image_url || "/Owner_image.png"}
                        alt="Current Profile Photo"
                        fill
                        className="object-cover object-top"
                        sizes="80px"
                      />
                    </div>

                    <div className="text-center sm:text-left space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] shadow-xs cursor-pointer transition-all disabled:opacity-50"
                        >
                          {uploadingPhoto ? (
                            <>
                              <span className="animate-spin text-xs">↻</span>
                              <span>Converting &amp; Uploading...</span>
                            </>
                          ) : (
                            <>
                              <span>↑ Choose Image from PC</span>
                            </>
                          )}
                        </button>
                        <span className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                          or drag &amp; drop file here
                        </span>
                      </div>

                      <p className="text-[11px] text-[#0F172A]/55 dark:text-[#FAF8F5]/55">
                        Accepts PNG, JPG, JPEG, WEBP. Converts directly to optimized WebP format before saving.
                      </p>

                      {webpStatus && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                          <span>
                            ✓ Converted: {webpStatus.originalKB} KB → {webpStatus.webpKB} KB ({webpStatus.savingsPercent}% lighter)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={savingAbout}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingAbout ? (
                    <>
                      <span className="animate-spin text-xs">↻</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save About Section</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Preview Box */}
          <div className="lg:col-span-5 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 shadow-xs">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-4">
              LIVE HOMEPAGE PREVIEW
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 shadow-xs text-left">
              {/* Photo Arch Frame Preview */}
              <div className="relative w-36 aspect-[3/4] mx-auto mb-4 rounded-tr-[45px] overflow-hidden border border-[#E5B842] shadow-md bg-black/5 dark:bg-white/5">
                <Image
                  src={aboutForm.image_url || "/Owner_image.png"}
                  alt="Live Preview"
                  fill
                  className="object-cover object-top"
                  sizes="150px"
                />
              </div>

              <div className="inline-flex items-center px-3 py-0.5 rounded-full text-[9px] font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/60 mb-3">
                {aboutForm.tag || "THE PERSON BEHIND THE READINGS"}
              </div>

              <h3 className="font-serif text-2xl font-normal leading-tight mb-3">
                <span className="block text-[#0F172A] dark:text-white">
                  {aboutForm.heading_prefix || "Meet"}
                </span>
                <span className="block text-[#B8871E] dark:text-[#E5B842]">
                  {aboutForm.heading_name || "TheAstroKaur"}
                </span>
              </h3>

              <div className="space-y-2.5 text-xs text-[#0F172A]/75 dark:text-slate-300 font-light leading-relaxed">
                <p>{aboutForm.paragraph_1}</p>
                <p>{aboutForm.paragraph_2}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB: VISION SECTION ── */}
      {activeTab === "vision" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Edit Form */}
          <div className="lg:col-span-7 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide">
                  Edit A Vision For Astrology
                </h2>
                <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-1">
                  Customize the philosophical vision section presented on the homepage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVisionForm(DEFAULT_VISION)}
                className="text-[11px] font-medium text-[#E5B842] hover:underline cursor-pointer"
                title="Restore default copy"
              >
                Reset to Default
              </button>
            </div>

            <form onSubmit={handleSaveVision} className="space-y-4">
              {/* Badge Label */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Badge Label (Uppercase Pill)
                </label>
                <input
                  type="text"
                  value={visionForm.tag}
                  onChange={(e) => setVisionForm({ ...visionForm, tag: e.target.value })}
                  placeholder="A VISION FOR ASTROLOGY"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  required
                />
                <p className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
                  Displays in the gold-bordered eyebrow pill above the main headline.
                </p>
              </div>

              {/* Headline Line 1 & Line 2 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Headline Line 1
                  </label>
                  <input
                    type="text"
                    value={visionForm.heading_line_1}
                    onChange={(e) =>
                      setVisionForm({ ...visionForm, heading_line_1: e.target.value })
                    }
                    placeholder="There Is More Than One Way"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Headline Line 2 (Sub-line)
                  </label>
                  <input
                    type="text"
                    value={visionForm.heading_line_2}
                    onChange={(e) =>
                      setVisionForm({ ...visionForm, heading_line_2: e.target.value })
                    }
                    placeholder="to See Your Story."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
              </div>

              {/* Vision Paragraph 1 */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Vision Statement — Paragraph 1 (Perspective &amp; Awareness)
                </label>
                <textarea
                  rows={4}
                  value={visionForm.paragraph_1}
                  onChange={(e) =>
                    setVisionForm({ ...visionForm, paragraph_1: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 leading-relaxed"
                  placeholder="The same experiences can look different when we understand ourselves a little better..."
                  required
                />
              </div>

              {/* Vision Paragraph 2 */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Vision Statement — Paragraph 2 (Bridging Ancient Vedic Wisdom)
                </label>
                <textarea
                  rows={4}
                  value={visionForm.paragraph_2}
                  onChange={(e) =>
                    setVisionForm({ ...visionForm, paragraph_2: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 leading-relaxed"
                  placeholder="Through my practice, I hope to bridge the gap between ancient Vedic wisdom and the modern world..."
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingVision}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingVision ? (
                    <>
                      <span className="animate-spin text-xs">↻</span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Vision Section</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Preview Box */}
          <div className="lg:col-span-5 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                LIVE HOMEPAGE PREVIEW
              </div>
              <span className="text-[9px] font-semibold text-[#E5B842] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
                ✦ Celestial Center Stage
              </span>
            </div>

            {/* Live Preview Container framed with celestial accents */}
            <div className="relative p-6 sm:p-7 rounded-2xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 shadow-xs text-center overflow-hidden">
              {/* Subtle decorative background ambient glow */}
              <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#E5B842]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[#E5B842]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Left decorative line preview */}
              <div className="absolute left-3 top-6 bottom-6 w-2 hidden sm:flex flex-col items-center pointer-events-none opacity-70">
                <span className="w-1 h-1 rounded-full bg-[#E5B842]" />
                <span className="w-px flex-1 bg-gradient-to-b from-transparent via-[#E5B842]/60 to-[#E5B842]" />
                <span className="my-1 text-[#E5B842] text-[9px]">✦</span>
                <span className="w-px flex-1 bg-gradient-to-b from-[#E5B842] via-[#E5B842]/60 to-transparent" />
                <span className="w-1 h-1 rounded-full bg-[#E5B842]" />
              </div>

              {/* Right decorative line preview */}
              <div className="absolute right-3 top-6 bottom-6 w-2 hidden sm:flex flex-col items-center pointer-events-none opacity-70">
                <span className="w-1 h-1 rounded-full bg-[#E5B842]" />
                <span className="w-px flex-1 bg-gradient-to-b from-transparent via-[#E5B842]/60 to-[#E5B842]" />
                <span className="my-1 text-[#E5B842] text-[9px]">✦</span>
                <span className="w-px flex-1 bg-gradient-to-b from-[#E5B842] via-[#E5B842]/60 to-transparent" />
                <span className="w-1 h-1 rounded-full bg-[#E5B842]" />
              </div>

              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-semibold tracking-widest uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/30 mb-4">
                {visionForm.tag || "A VISION FOR ASTROLOGY"}
              </div>

              {/* Heading */}
              <h3 className="font-serif text-xl sm:text-2xl font-normal leading-tight text-[#0F172A] dark:text-[#FAF8F5] mb-4">
                <span className="block">{visionForm.heading_line_1 || "There Is More Than One Way"}</span>
                {visionForm.heading_line_2 && (
                  <span className="block mt-1">{visionForm.heading_line_2}</span>
                )}
              </h3>

              {/* Paragraphs */}
              <div className="space-y-3 text-xs text-[#0F172A]/75 dark:text-slate-300 font-light leading-relaxed max-w-sm mx-auto">
                {visionForm.paragraph_1 && (
                  <p>{visionForm.paragraph_1}</p>
                )}
                {visionForm.paragraph_2 && (
                  <p className="text-[11px] text-[#0F172A]/65 dark:text-slate-400">
                    {visionForm.paragraph_2}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-4 text-center">
              This section is rendered with an interactive scroll-linked focal zoom animation on the homepage.
            </p>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: READINGS & SERVICES ── */}
      {activeTab === "free-reading" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 sm:p-7 shadow-xs">
            <h2 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide">Edit Ascendant Reading</h2>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-1 mb-5">Choose a sign and edit the complete reading shown to people with that Ascendant.</p>
            <form onSubmit={handleSaveFreeReading} className="space-y-4">
              <div><label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">Ascendant Sign</label><select value={selectedAscendant} onChange={(e) => setSelectedAscendant(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-sm text-[#0F172A] dark:text-[#FAF8F5]">{Object.keys(ASCENDANT_READINGS).map((sign) => <option key={sign}>{sign}</option>)}</select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">Sanskrit Name</label><input value={ascendantContent[selectedAscendant].sanskritName} onChange={(e) => setAscendantContent({ ...ascendantContent, [selectedAscendant]: { ...ascendantContent[selectedAscendant], sanskritName: e.target.value } })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 bg-white dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-sm" /></div><div><label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">Ruling Planet</label><input value={ascendantContent[selectedAscendant].ruler} onChange={(e) => setAscendantContent({ ...ascendantContent, [selectedAscendant]: { ...ascendantContent[selectedAscendant], ruler: e.target.value } })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 bg-white dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-sm" /></div></div>
              {readingSectionKeys.map(([label, key]) => { const section = ascendantContent[selectedAscendant][key]; return <div key={key} className="p-4 rounded-2xl border border-[#E5B842]/25 bg-[#E5B842]/5 space-y-3"><label className="block text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">{label}</label><input value={section.title} onChange={(e) => setAscendantContent({ ...ascendantContent, [selectedAscendant]: { ...ascendantContent[selectedAscendant], [key]: { ...section, title: e.target.value } } })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 bg-white dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-sm" placeholder="Section heading" /><textarea rows={5} value={section.paragraphs.join('\n\n')} onChange={(e) => setAscendantContent({ ...ascendantContent, [selectedAscendant]: { ...ascendantContent[selectedAscendant], [key]: { ...section, paragraphs: e.target.value.split(/\n\s*\n/).filter(Boolean) } } })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 bg-white dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-sm leading-relaxed" placeholder="Write one paragraph, leave a blank line, then write the next." /><p className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Use a blank line between paragraphs.</p></div>; })}
              <button type="submit" disabled={savingFreeReading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer disabled:opacity-50">{savingFreeReading ? "Saving..." : `Save ${selectedAscendant} Reading`}</button>
            </form>
          </div>
          <div className="lg:col-span-4 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 shadow-xs sticky top-6"><p className="text-[10px] font-bold tracking-widest uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-4">Live reading preview</p><div className="max-h-[70vh] overflow-y-auto p-5 rounded-2xl bg-gradient-to-b from-[#E5B842]/20 to-transparent border border-[#E5B842]/35 space-y-5"><div><h3 className="font-serif text-2xl text-[#0F172A] dark:text-[#FAF8F5]">{selectedAscendant} Ascendant</h3><p className="text-xs italic text-[#0F172A]/60 mt-1">{ascendantContent[selectedAscendant]?.sanskritName} Lagna · Ruled by {ascendantContent[selectedAscendant]?.ruler}</p></div>{(['coreEnergy', 'careerSuccess', 'loveRelationships', 'moneySecurity', 'emotionalWorld', 'hiddenPotential'] as const).map((key) => <div key={key} className="border-t border-[#0F172A]/10 pt-4"><h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5]">{ascendantContent[selectedAscendant][key].title}</h4>{ascendantContent[selectedAscendant][key].paragraphs.map((paragraph, index) => <p key={index} className="mt-2 text-xs leading-relaxed text-[#0F172A]/70 dark:text-[#FAF8F5]/70">{paragraph}</p>)}</div>)}</div></div>
        </div>
      )}

      {false && activeTab === "free-reading" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide">Edit Free Reading Section</h2>
                <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-1">Control the public copy shown before and after a visitor receives their Vedic Ascendant reading.</p>
              </div>
              <button type="button" onClick={() => setFreeReadingForm(DEFAULT_FREE_READING_CONTENT)} className="shrink-0 text-[11px] font-medium text-[#E5B842] hover:underline cursor-pointer">Reset to Default</button>
            </div>
            <form onSubmit={handleSaveFreeReading} className="space-y-4">
              {Object.entries(freeReadingForm).map(([key, value]) => {
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
                const isLongCopy = ["section_intro", "sign_in_description", "cta_description", "cta_quote"].includes(key);
                return <div key={key}>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">{label}</label>
                  {isLongCopy ? <textarea rows={3} value={value} onChange={(e) => setFreeReadingForm({ ...freeReadingForm, [key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40" required /> : <input type="text" value={value} onChange={(e) => setFreeReadingForm({ ...freeReadingForm, [key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40" required />}
                </div>;
              })}
              <button type="submit" disabled={savingFreeReading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer disabled:opacity-50">{savingFreeReading ? "Saving..." : "Save Free Reading Section"}</button>
            </form>
          </div>
          <div className="lg:col-span-5 bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-6 shadow-xs sticky top-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-4">Live homepage preview</p>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-b from-[#E5B842]/20 via-[#E5B842]/5 to-transparent border border-[#E5B842]/35 space-y-4">
              <h3 className="font-serif text-2xl text-[#0F172A] dark:text-[#FAF8F5]">{freeReadingForm.section_heading}</h3>
              <p className="text-xs leading-relaxed text-[#0F172A]/70 dark:text-[#FAF8F5]/70">{freeReadingForm.section_intro}</p>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] bg-white/70 dark:bg-[#0F172A]/70 border border-[#0F172A]/10 dark:border-white/10 text-[#0F172A]/70 dark:text-[#FAF8F5]/70">{freeReadingForm.eligibility_note}</span>
              <div className="pt-5 border-t border-[#0F172A]/10 dark:border-white/10"><h4 className="font-serif text-xl text-[#0F172A] dark:text-[#FAF8F5]">{freeReadingForm.cta_heading}</h4><p className="mt-2 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70">{freeReadingForm.cta_description}</p><p className="mt-3 text-xs font-semibold text-[#6B3448] dark:text-[#E5B842]">✦ {freeReadingForm.cta_accent}</p><button type="button" className="mt-4 px-5 py-2.5 rounded-full bg-[#E5B842] text-[#0F172A] text-[10px] font-bold uppercase">{freeReadingForm.cta_primary_label}</button></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "readings" && (
        <div className="space-y-6">
          {/* Services Cards Grid: Spacious & Breathable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {services.map((service) => {
              const slug = getServiceSlug(service.title);
              return (
                <div
                  key={service.id}
                  className={`bg-white dark:bg-[#070D18] border border-[#E5B842]/25 dark:border-[#E5B842]/20 rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(229,184,66,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] hover:border-[#E5B842]/55 hover:shadow-[0_10px_30px_rgba(229,184,66,0.12)] transition-all duration-300 flex flex-col justify-between ${
                    !service.is_active ? "opacity-60 border-dashed" : ""
                  }`}
                >
                  <div>
                    {/* Top Status & Format Badges (Matches Website Theme) */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold tracking-wider uppercase bg-[#E5B842]/10 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/25">
                        {service.format === "voice_call" ? (
                          <svg
                            className="w-3 h-3 text-[#B87936] dark:text-[#E5B842] shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3 h-3 text-[#6B3448] dark:text-[#E5B842] shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                            />
                          </svg>
                        )}
                        <span>{service.format === "voice_call" ? "Voice call" : "Text-based"}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(service)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold tracking-wider uppercase border transition-all cursor-pointer ${
                          service.is_active
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/20"
                        }`}
                        title="Click to toggle Active status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            service.is_active ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span>{service.is_active ? "Active" : "Hidden"}</span>
                      </button>
                    </div>

                    {/* Celestial Logo Artwork (Matching the Website Theme) */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto my-3 flex items-center justify-center pointer-events-none">
                      {service.image_url ? (
                        <Image
                          src={service.image_url}
                          alt={service.title}
                          fill
                          sizes="128px"
                          className="object-contain"
                        />
                      ) : (
                        <>
                          <Image
                            src={`/readings_logo/${slug}-light.webp`}
                            alt={service.title}
                            fill
                            sizes="128px"
                            className="object-contain dark:hidden"
                          />
                          <Image
                            src={`/readings_logo/${slug}-dark.webp`}
                            alt={service.title}
                            fill
                            sizes="128px"
                            className="object-contain hidden dark:block"
                          />
                        </>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-lg sm:text-xl font-normal text-center text-[#0F172A] dark:text-[#FAF8F5] leading-snug mb-2">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-center text-[#0F172A]/70 dark:text-[#FAF8F5]/70 font-light leading-relaxed mb-4 px-2 min-h-[44px]">
                      {service.description}
                    </p>
                  </div>

                  {/* Celestial Divider & Footer */}
                  <div>
                    <div className="w-16 h-px bg-[#0F172A]/10 dark:bg-[#FAF8F5]/10 my-3 mx-auto relative flex items-center justify-center">
                      <span className="text-[#E5B842] text-[9px] bg-white dark:bg-[#070D18] px-1.5">✦</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-serif text-2xl sm:text-3xl font-normal text-[#6B3448] dark:text-[#E5B842]">
                          €{(service.price_cents / 100).toFixed(0)}
                        </span>
                        {service.duration_minutes && (
                          <span className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                            · {service.duration_minutes}m
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditService(service)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#E5B842]/30 hover:border-[#E5B842] bg-white dark:bg-[#131F33] text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-all cursor-pointer shadow-xs"
                        >
                          <span>Edit</span>
                          <span className="text-xs text-[#E5B842]">✎</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmDeleteService(service)}
                          className="inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A]/40 dark:text-[#FAF8F5]/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all cursor-pointer shadow-xs"
                          title={`Delete ${service.title}`}
                          aria-label={`Delete ${service.title}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SERVICE EDIT / CREATE MODAL ── */}
      {isServiceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-2xl p-6 sm:p-7 shadow-2xl text-[#0F172A] dark:text-[#FAF8F5] max-h-[calc(100dvh-2rem)] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 mb-5">
              <h3 className="font-serif text-lg font-semibold uppercase tracking-wide">
                {isCreatingNew ? "Add New Reading Service" : "Edit Reading Service"}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 flex items-center justify-center hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 cursor-pointer text-xs"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              {/* Artwork / Icon Image Uploader with WebP conversion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                    Service Artwork / Icon
                  </label>
                  <span className="text-[10px] font-semibold text-[#E5B842] uppercase tracking-wider">
                    ⚡ Auto-converts to WebP
                  </span>
                </div>

                {/* Dropzone Container */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsServiceDragging(true);
                  }}
                  onDragLeave={() => setIsServiceDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsServiceDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleServiceFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-3.5 text-center transition-all ${
                    isServiceDragging
                      ? "border-[#E5B842] bg-[#E5B842]/10"
                      : "border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5]/50 dark:bg-[#131F33]/50 hover:border-[#E5B842]/60"
                  }`}
                >
                  <input
                    ref={serviceFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleServiceFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex items-center gap-4">
                    {/* Artwork Preview */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#E5B842]/40 shadow-xs shrink-0 bg-white dark:bg-[#070D18] flex items-center justify-center p-1">
                      {serviceForm.image_url ? (
                        <Image
                          src={serviceForm.image_url}
                          alt="Service Artwork Preview"
                          fill
                          className="object-contain p-1"
                          sizes="80px"
                        />
                      ) : (
                        <>
                          <Image
                            src={`/readings_logo/${getServiceSlug(serviceForm.title)}-light.webp`}
                            alt="Default Artwork"
                            fill
                            sizes="80px"
                            className="object-contain p-1 dark:hidden"
                          />
                          <Image
                            src={`/readings_logo/${getServiceSlug(serviceForm.title)}-dark.webp`}
                            alt="Default Artwork"
                            fill
                            sizes="80px"
                            className="object-contain p-1 hidden dark:block"
                          />
                        </>
                      )}
                    </div>

                    {/* Upload Controls & Status */}
                    <div className="text-left space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => serviceFileInputRef.current?.click()}
                          disabled={uploadingServicePhoto}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[#E5B842] hover:bg-[#d8ab34] text-[#070D18] shadow-xs cursor-pointer transition-all disabled:opacity-50"
                        >
                          {uploadingServicePhoto ? (
                            <>
                              <span className="animate-spin text-xs">↻</span>
                              <span>Converting &amp; Uploading...</span>
                            </>
                          ) : (
                            <>
                              <span>↑ Choose Image from PC</span>
                            </>
                          )}
                        </button>

                        {serviceForm.image_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setServiceForm((prev) => ({ ...prev, image_url: "" }));
                              setServiceWebpStatus(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title="Reset to default celestial artwork"
                          >
                            Reset Default
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-[#0F172A]/55 dark:text-[#FAF8F5]/55">
                        Accepts PNG, JPG, WEBP. Converts automatically to WebP before uploading.
                      </p>

                      {serviceWebpStatus && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                          <span>
                            ✓ Converted: {serviceWebpStatus.originalKB} KB → {serviceWebpStatus.webpKB} KB ({serviceWebpStatus.savingsPercent}% lighter)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Reading Title
                </label>
                <input
                  type="text"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  placeholder="e.g. Matchmaking Reading"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  required
                />
              </div>

              {/* Format & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Format
                  </label>
                  <select
                    value={serviceForm.format}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        format: e.target.value as "text" | "voice_call",
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 cursor-pointer"
                  >
                    <option value="voice_call">Voice call (Interactive)</option>
                    <option value="text">Text-based reading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={serviceForm.format === "text" ? "" : serviceForm.duration_minutes}
                    disabled={serviceForm.format === "text"}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, duration_minutes: e.target.value })
                    }
                    placeholder={serviceForm.format === "text" ? "N/A (Text reading)" : "e.g. 45"}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Price (EUR) & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Price in EUR (€)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
                      €
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={serviceForm.price_eur}
                      onChange={(e) =>
                        setServiceForm({ ...serviceForm, price_eur: e.target.value })
                      }
                      placeholder="60"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={serviceForm.sort_order}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, sort_order: e.target.value })
                    }
                    placeholder="1"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, description: e.target.value })
                  }
                  placeholder="Summary of what the client will explore..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 bg-[#FAF8F5] dark:bg-[#131F33] text-xs focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 leading-relaxed"
                  required
                />
              </div>

              {/* Active Toggle Checkbox */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="modal_is_active"
                  checked={serviceForm.is_active}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, is_active: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#E5B842] rounded cursor-pointer"
                />
                <label
                  htmlFor="modal_is_active"
                  className="text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80 cursor-pointer select-none"
                >
                  Active &amp; Visible on website
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
                <div>
                  {!isCreatingNew && editingService && (
                    <button
                      type="button"
                      onClick={() => confirmDeleteService(editingService)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Permanently delete this reading service"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      <span>Delete Reading</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingService}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingService ? "Saving..." : isCreatingNew ? "Create Service" : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && serviceToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
          role="alertdialog"
          aria-modal="true"
        >
          <div
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain relative w-full max-w-md bg-white dark:bg-[#0D1829] border border-rose-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl text-[#0F172A] dark:text-[#FAF8F5] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 mx-auto sm:mx-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>

            <h3 className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] mb-2 text-center sm:text-left">
              Delete Reading Service?
            </h3>

            <p className="text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-relaxed mb-4 text-center sm:text-left">
              Are you sure you want to permanently delete{" "}
              <strong className="text-[#0F172A] dark:text-[#FAF8F5] font-semibold">
                &ldquo;{serviceToDelete.title}&rdquo;
              </strong>
              ? This will remove the reading from your website catalog and automatically purge its uploaded artwork from Supabase Storage to free up space.
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-5 text-[11px] text-rose-700 dark:text-rose-300">
              ⚠️ This action is permanent and cannot be undone.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                type="button"
                disabled={Boolean(deletingServiceId)}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setServiceToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(deletingServiceId)}
                onClick={handleDeleteService}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {deletingServiceId ? (
                  <>
                    <span className="animate-spin text-xs">↻</span>
                    <span>Deleting &amp; Purging...</span>
                  </>
                ) : (
                  <span>Yes, Delete Service</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
