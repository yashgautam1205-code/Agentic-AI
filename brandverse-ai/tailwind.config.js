/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand foundations
        void: '#090B10',
        surface: '#121722',
        elevated: '#1A2235',
        overlay: '#1E2A40',
        border: '#1F2D45',
        muted: '#2A3A55',
        // Text hierarchy
        primary: '#F0F4FF',
        secondary: '#8B9FC2',
        tertiary: '#4E5F7A',
        // Accent palette
        accent: {
          DEFAULT: '#5B7FFF',
          hover: '#7B9AFF',
          dim: '#1E2D5A',
          glow: 'rgba(91,127,255,0.15)',
        },
        violet: {
          DEFAULT: '#7C5CFC',
          hover: '#9B80FF',
          dim: '#231840',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          dim: '#0A2A33',
        },
        amber: {
          DEFAULT: '#F59E0B',
          dim: '#2A1E05',
        },
        emerald: {
          DEFAULT: '#10B981',
          dim: '#0A2419',
        },
        rose: {
          DEFAULT: '#F43F5E',
          dim: '#2A0A12',
        },
        // Status
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F43F5E',
        info: '#5B7FFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #5B7FFF 0%, #7C5CFC 100%)',
        'gradient-surface': 'linear-gradient(180deg, #121722 0%, #090B10 100%)',
        'shimmer-bg': 'linear-gradient(90deg, transparent 0%, rgba(91,127,255,0.08) 50%, transparent 100%)',
      },
      boxShadow: {
        'accent': '0 0 24px rgba(91,127,255,0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 1px rgba(91,127,255,0.1)',
        'elevated': '0 4px 24px rgba(0,0,0,0.5)',
        'glow': '0 0 40px rgba(91,127,255,0.15)',
      },
    },
  },
  plugins: [],
};
