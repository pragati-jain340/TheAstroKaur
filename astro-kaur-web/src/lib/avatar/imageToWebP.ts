import { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_NAME = "custom_profle_photo"; // Kept exact spelling per database bucket

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
];

const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024; // 10 MB pre-compression limit
const TARGET_AVATAR_DIMENSION = 512; // 512x512 square for high-DPI display
const WEBP_QUALITY = 0.85;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an uploaded image file before processing
 */
export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: "Please select an image file." };
  }

  // Check MIME type
  const mime = file.type.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    return {
      valid: false,
      error: "Only PNG, JPG, or JPEG images are supported. Other file formats (like SVG, GIF, or PDF) are not allowed.",
    };
  }

  // Check raw file size
  if (file.size > MAX_RAW_FILE_SIZE) {
    return {
      valid: false,
      error: "Image size is too large (maximum 10 MB before compression). Please select a smaller photo.",
    };
  }

  return { valid: true };
}

/**
 * Crops an image to a centered square, resizes to target dimension (512x512),
 * and compresses it in-memory to WebP format.
 */
export async function convertImageToWebP(
  file: File,
  targetSize: number = TARGET_AVATAR_DIMENSION,
  quality: number = WEBP_QUALITY
): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;

          if (!width || !height) {
            return reject(new Error("Unable to read image dimensions."));
          }

          // Center-crop square logic
          const minSide = Math.min(width, height);
          const startX = (width - minSide) / 2;
          const startY = (height - minSide) / 2;

          // Offscreen Canvas
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Browser does not support canvas image processing."));
          }

          // High-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw cropped & resized image
          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide, // Source square
            0,
            0,
            targetSize,
            targetSize // Destination square
          );

          // Convert to WebP blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error("Failed to convert image to WebP format."));
              }
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, previewUrl });
            },
            "image/webp",
            quality
          );
        } catch (err: unknown) {
          reject(err instanceof Error ? err : new Error("Failed to process image."));
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image. The file may be corrupt or unreadable."));
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a WebP avatar blob to Supabase Storage at:
 * custom_profle_photo/{userId}/avatar.webp
 */
export async function uploadUserAvatar(
  supabase: SupabaseClient,
  userId: string,
  webpBlob: Blob
): Promise<{ publicUrl: string | null; error: string | null }> {
  try {
    if (!userId) {
      return { publicUrl: null, error: "Authentication required to upload avatar." };
    }

    const filePath = `${userId}/avatar.webp`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, webpBlob, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase Storage Avatar Upload Error:", uploadError);
      return { publicUrl: null, error: uploadError.message || "Failed to upload photo to storage." };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Append timestamp query parameter to bust browser cache on immediate replacement
    const publicUrlWithBust = `${urlData.publicUrl}?t=${Date.now()}`;

    return { publicUrl: publicUrlWithBust, error: null };
  } catch (err: unknown) {
    console.error("Unexpected error during avatar upload:", err);
    return {
      publicUrl: null,
      error: err instanceof Error ? err.message : "Unexpected upload error occurred.",
    };
  }
}

/**
 * Removes the custom avatar file from storage:
 * custom_profle_photo/{userId}/avatar.webp
 */
export async function deleteUserAvatar(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string | null }> {
  try {
    if (!userId) {
      return { error: "User ID is required." };
    }

    const filePath = `${userId}/avatar.webp`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error("Supabase Storage Avatar Deletion Error:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to remove avatar file." };
  }
}
