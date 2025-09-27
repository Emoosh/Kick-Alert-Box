// components/VideoManager.tsx - Modal ile video preview
"use client";
import { useState, useEffect } from "react";

interface Video {
  id: string;
  alertType: string;
  videoName: string;
  videoUrl: string;
  fileSize?: number;
  duration?: number;
  mimeType?: string;
  createdAt: string;
  sortOrder: number;
}

interface VideoManagerProps {
  onVideoDeleted?: () => void;
}

export function VideoManager({ onVideoDeleted }: VideoManagerProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Video modal state'leri ekle
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Videoları yükle
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/videos/manage");
      const data = await response.json();

      if (data.success) {
        setVideos(data.videos);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch videos");
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // ✅ Video preview aç
  const openVideoPreview = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  // ✅ Video preview kapat
  const closeVideoPreview = () => {
    setSelectedVideo(null);
    setIsModalOpen(false);
  };

  // ✅ ESC tuşu ile kapat
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        closeVideoPreview();
      }
    };

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscKey);
      // Body scroll'u engelle
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  // Video sil
  const deleteVideo = async (videoId: string, videoName: string) => {
    if (!confirm(`Are you sure you want to delete "${videoName}"?`)) {
      return;
    }

    try {
      setDeleting(videoId);

      const response = await fetch("/api/videos/manage", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId }),
      });

      const data = await response.json();

      if (data.success) {
        setVideos(videos.filter((v) => v.id !== videoId));

        // Eğer silinen video preview'de açıksa kapat
        if (selectedVideo?.id === videoId) {
          closeVideoPreview();
        }

        if (onVideoDeleted) {
          onVideoDeleted();
        }
      } else {
        alert(`Failed to delete video: ${data.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete video");
    } finally {
      setDeleting(null);
    }
  };

  // Dosya boyutunu format et
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Alert type'ı format et
  const formatAlertType = (type: string) => {
    const types: { [key: string]: string } = {
      follow: "👥 Follow",
      subscribe: "⭐ Subscribe",
      tip: "💰 Tip",
    };
    return types[type] || type;
  };

  // Video gruplarını oluştur
  const videosByType = videos.reduce((acc, video) => {
    if (!acc[video.alertType]) {
      acc[video.alertType] = [];
    }
    acc[video.alertType].push(video);
    return acc;
  }, {} as { [key: string]: Video[] });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading videos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>
          <strong>Error:</strong> {error}
        </p>
        <button
          onClick={fetchVideos}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-4">🎬</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No videos uploaded yet
        </h3>
        <p className="text-gray-600">
          Upload your first alert video using the form above!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            📹 Your Alert Videos ({videos.length})
          </h3>
          <button
            onClick={fetchVideos}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            🔄 Refresh
          </button>
        </div>

        {Object.entries(videosByType).map(([alertType, typeVideos]) => (
          <div
            key={alertType}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">
                {formatAlertType(alertType)} ({typeVideos.length})
              </h4>
            </div>

            <div className="divide-y divide-gray-200">
              {typeVideos.map((video) => (
                <div key={video.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        {/* Video Thumbnail */}
                        <div className="flex-shrink-0">
                          <div
                            className="w-16 h-12 bg-gray-100 rounded border cursor-pointer hover:bg-gray-200 flex items-center justify-center"
                            onClick={() => openVideoPreview(video)}
                          >
                            <span className="text-2xl">🎬</span>
                          </div>
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {video.videoName}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>📦 {formatFileSize(video.fileSize)}</span>
                            {video.duration && (
                              <span>
                                ⏱️ {(video.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                            <span>
                              📅{" "}
                              {new Date(video.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openVideoPreview(video)}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        👁️ Preview
                      </button>

                      <button
                        onClick={() => deleteVideo(video.id, video.videoName)}
                        disabled={deleting === video.id}
                        className={`px-3 py-1 text-xs rounded ${
                          deleting === video.id
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }`}
                      >
                        {deleting === video.id ? "⏳ Deleting..." : "🗑️ Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Video Preview Modal */}
      {isModalOpen && selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={closeVideoPreview}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Video Preview
                </h3>
                <p className="text-sm text-gray-600 truncate">
                  {selectedVideo.videoName}
                </p>
              </div>

              <button
                onClick={closeVideoPreview}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Video Player */}
            <div className="mb-4">
              <video
                className="w-full max-h-96 bg-black rounded"
                controls
                autoPlay
                muted
                src={selectedVideo.videoUrl}
              >
                <source src={selectedVideo.videoUrl} type="video/webm" />
                <source src={selectedVideo.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Alert Type:</span>
                <span className="ml-2 font-medium">
                  {formatAlertType(selectedVideo.alertType)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">File Size:</span>
                <span className="ml-2 font-medium">
                  {formatFileSize(selectedVideo.fileSize)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium">
                  {selectedVideo.duration
                    ? `${(selectedVideo.duration / 1000).toFixed(1)}s`
                    : "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Upload Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(selectedVideo.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeVideoPreview}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>

              <button
                onClick={() =>
                  deleteVideo(selectedVideo.id, selectedVideo.videoName)
                }
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                🗑️ Delete Video
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
