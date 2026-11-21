import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  collapsed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ collapsed = false, size = 'md' }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;

  return (
    <div className="flex items-center gap-2.5">
      {/* Abstract brand mark — custom SVG */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bv-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5B7FFF" />
            <stop offset="100%" stopColor="#7C5CFC" />
          </linearGradient>
          <linearGradient id="bv-grad2" x1="32" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C5CFC" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        {/* Outer ring segment */}
        <circle cx="16" cy="16" r="14" stroke="url(#bv-grad)" strokeWidth="1.5" fill="none" strokeDasharray="60 28" strokeLinecap="round" />
        {/* Inner dynamic shape — stylized B/V confluence */}
        <path
          d="M10 10 L10 22 L16 22 Q21 22 21 17.5 Q21 14.5 17 14 Q20.5 13.5 20.5 10.5 Q20.5 10 16 10 Z"
          fill="url(#bv-grad)"
          fillOpacity="0.9"
        />
        {/* Accent accent line */}
        <line x1="10" y1="16" x2="21" y2="16" stroke="url(#bv-grad2)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Dot accent */}
        <circle cx="25" cy="8" r="2" fill="#22D3EE" fillOpacity="0.8" />
      </svg>

      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              'font-display font-bold tracking-tight bg-gradient-brand bg-clip-text text-transparent',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base'
            )}
          >
            BRANDVERSE
          </span>
          <span
            className={cn(
              'font-display font-light tracking-widest text-secondary',
              size === 'sm' ? 'text-2xs' : size === 'lg' ? 'text-sm' : 'text-xs'
            )}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
