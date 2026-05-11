import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Alpine Studio — Cockpit JK design system
        ink: {
          deepest: '#0E1F1C',
          deeper: '#162A26',
          deep: '#1F3530',
          mid: '#2A3F38',
          base: '#1A2D28',
        },
        cream: {
          50: '#F4F0E8',
          100: '#E8E2D5',
        },
        sage: {
          light: '#A8E6BC',
          DEFAULT: '#7DD3A0',
          deep: '#4ADE80',
          glow: 'rgba(74,222,128,0.5)',
        },
        glacier: {
          light: '#C5E5EE',
          DEFAULT: '#A5D8E6',
          deep: '#67B8D6',
        },
        terracotta: {
          light: '#F0B894',
          DEFAULT: '#E8946A',
          deep: '#C97550',
        },
        // muted text
        muted: {
          DEFAULT: '#A8B5B0',
          deeper: '#7A8580',
        },
        // glass surfaces
        glass: {
          5: 'rgba(255,255,255,0.05)',
          7: 'rgba(255,255,255,0.07)',
          10: 'rgba(255,255,255,0.10)',
          16: 'rgba(255,255,255,0.16)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        'eyebrow': ['11px', { letterSpacing: '0.08em', lineHeight: '1.2' }],
      },
      backdropBlur: {
        // Aligned with --glass-blur-card. Buttons, pills, badges, inputs
        // use this token; surfaces with their own blur (header, bubbles,
        // chat input bar) use dedicated `.glass-*` classes.
        glass: '6px',
      },
      borderRadius: {
        'glass': '18px',
      },
      // Only the *functional* animations remain: pill-pulse marks live state
      // indicators (Claude écoute, system status, P0 missions), shimmer drives
      // the skeleton loaders. Every decorative background animation has been
      // removed as part of the Level A++ performance pass.
      animation: {
        'pill-pulse': 'pill-pulse 2.4s ease-in-out infinite',
        'shimmer':    'shimmer 2.6s linear infinite',
      },
      keyframes: {
        'pill-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%':      { opacity: '1',    transform: 'scale(1.4)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
