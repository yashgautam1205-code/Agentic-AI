import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-4 rounded-md', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-elevated border border-border flex items-center justify-center mb-4 text-tertiary">
        {icon}
      </div>
      <h3 className="font-display font-semibold text-primary mb-1">{title}</h3>
      <p className="text-sm text-secondary max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}

interface ScoreMeterProps {
  value: number;
  label: string;
  color?: string;
}

export function ScoreMeter({ value, label, color = '#5B7FFF' }: ScoreMeterProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-2xs text-secondary">{label}</span>
        <span className="text-2xs font-mono font-medium text-primary">{value}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface PlatformBadgeProps {
  platform: string;
  size?: 'sm' | 'md';
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string }> = {
  instagram: { label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  youtube: { label: 'YouTube', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  linkedin: { label: 'LinkedIn', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  x: { label: 'X', color: 'text-zinc-300', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  spotify: { label: 'Spotify', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
};

export function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const meta = PLATFORM_META[platform.toLowerCase()] ?? { label: platform, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' };
  return (
    <span className={cn('badge border', meta.bg, meta.color, size === 'md' && 'text-xs px-2.5 py-1')}>
      {meta.label}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  animated?: boolean;
}

export function ProgressBar({ value, max = 100, className, color = '#5B7FFF', animated = false }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn('h-1.5 bg-muted rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-1000', animated && 'animate-pulse-slow')}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber inline-block" />
      Demo Data
    </span>
  );
}
