// components/VideoUpload.tsx - VideoManager'ı dahil et
"use client";
import { useState, useRef } from "react";
import { VideoManager } from "./VideoManager";

export function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [refreshVideos, setRefreshVideos] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    if (!file.type.startsWith("video/")) {
      setUploadError("Please select a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadError("Video size must be less than 100MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadSuccess(true);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Video listesini yenile
        setRefreshVideos((prev) => prev + 1);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Form */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          🎬 Upload Alert Video
        </h3>

        <div className="mb-4">
          <p className="text-sm text-gray-300 mb-4">
            Upload videos for your follow alerts.
            <br />
            <strong>Supported formats:</strong> MP4, WebM, MOV, AVI
            <br />
            <strong>Max size:</strong> 100MB
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-3 file:px-6
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              disabled:file:bg-gray-600
              disabled:file:cursor-not-allowed
              cursor-pointer"
          />
        </div>

        {/* Upload Status Messages */}
        {uploading && (
          <div className="mb-4 p-3 bg-blue-600/20 border border-blue-600 rounded">
            <div className="flex items-center text-blue-300">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
              <span>Uploading video... Please wait.</span>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600 rounded text-green-300">
            ✅ <strong>Video uploaded successfully!</strong>
          </div>
        )}

        {uploadError && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded text-red-300">
            ❌ <strong>Upload failed:</strong> {uploadError}
          </div>
        )}
      </div>

      {/* Video Manager */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <VideoManager
          key={refreshVideos} // Video yüklendikten sonra listeyi yenile
          onVideoDeleted={() => setRefreshVideos((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}
