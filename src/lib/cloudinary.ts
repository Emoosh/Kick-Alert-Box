// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config - supports both CLOUDINARY_URL and separate variables
if (process.env.CLOUDINARY_URL) {
  // Use CLOUDINARY_URL (recommended)
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  // Use separate environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  format: string;
}

export async function uploadVideoToCloudinary(
  buffer: Buffer,
  fileName: string,
  userId: string,
  alertType: string
): Promise<CloudinaryUploadResult> {
  try {
    console.log(`☁️ Uploading to Cloudinary: ${fileName}`);

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          public_id: `kick-alerts/${userId}/${alertType}/${fileName}`,
          overwrite: true,
          invalidate: true,
          transformation: [
            { quality: "auto" },
            { format: "mp4" }
          ]
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else if (result) {
            console.log(`✅ Cloudinary upload success: ${result.secure_url}`);
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
              bytes: result.bytes,
              duration: result.duration,
              format: result.format,
            });
          } else {
            reject(new Error("Unknown Cloudinary error"));
          }
        }
      ).end(buffer);
    });

    return result;
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    throw error;
  }
}

export async function deleteVideoFromCloudinary(publicId: string): Promise<void> {
  try {
    console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
      invalidate: true,
    });

    console.log(`✅ Cloudinary delete result:`, result);
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    throw error;
  }
}

export default cloudinary;