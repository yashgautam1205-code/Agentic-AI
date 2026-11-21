import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = now.getTime() - then.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return formatDate(dateStr);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    instagram: '#E1306C',
    youtube: '#FF0000',
    linkedin: '#0A66C2',
    x: '#000000',
    spotify: '#1DB954',
  };
  return colors[platform.toLowerCase()] ?? '#5B7FFF';
}

export function getPlatformBg(platform: string): string {
  const colors: Record<string, string> = {
    instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    youtube: 'bg-red-500/10 text-red-400 border-red-500/20',
    linkedin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    x: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    spotify: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return colors[platform.toLowerCase()] ?? 'badge-accent';
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald';
  if (score >= 75) return 'text-accent';
  if (score >= 60) return 'text-amber';
  return 'text-rose';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    processed: 'badge-success',
    processing: 'badge-accent',
    pending_review: 'badge-warning',
    draft: 'badge-violet',
    approved: 'badge-success',
    failed: 'badge-error',
  };
  return map[status] ?? 'badge-accent';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    processed: 'Processed',
    processing: 'Processing',
    pending_review: 'Review',
    draft: 'Draft',
    approved: 'Approved',
    failed: 'Failed',
  };
  return map[status] ?? status;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
