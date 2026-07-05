import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a simple unique ID (cuid-like)
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${randomPart}`;
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get color classes for status
 */
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PASSED':
    case 'APPROVED':
    case 'COMPLETED':
      return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'FAILED':
    case 'REJECTED':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'WARNING':
    case 'PENDING':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'RUNNING':
    case 'PROCESSING':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
  }
}

/**
 * Get text color based on risk score (0-100)
 */
export function getRiskColor(score: number): string {
  if (score <= 20) return 'text-green-500';
  if (score <= 60) return 'text-amber-500';
  return 'text-red-500';
}

/**
 * Get background color based on risk score (0-100)
 */
export function getRiskBgColor(score: number): string {
  if (score <= 20) return 'bg-green-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
