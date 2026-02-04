/**
 * Storage 스텁 - MinIO/Firebase Storage 대체
 * automation-server의 MinIO를 통해 파일을 관리합니다.
 */

import { apiClient } from "./apiClient";

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_token")
      : null;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) throw new Error("파일 업로드 실패");
  const data = await res.json();
  return { url: data.url ?? "", path: data.path ?? path };
}

export async function deleteFile(path: string): Promise<void> {
  await apiClient.delete(`/api/admin/files?path=${encodeURIComponent(path)}`);
}

export async function getFileUrl(path: string): Promise<string> {
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/files/${path}`;
}

export function getStorageRef(_path: string) {
  return { fullPath: _path };
}

export type UploadResult = {
  url: string;
  path: string;
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isAllowedFileType(file: File): boolean {
  return (
    ALLOWED_IMAGE_TYPES.includes(file.type) ||
    ALLOWED_VIDEO_TYPES.includes(file.type)
  );
}

export function isFileSizeAllowed(file: File, maxSize: number = MAX_FILE_SIZE): boolean {
  return file.size <= maxSize;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
