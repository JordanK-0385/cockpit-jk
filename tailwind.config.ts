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
        glass: '32px',
      },
      borderRadius: {
        'glass': '18px',
      },
      animation: {
        'orb-1': 'orb-drift-1 26s ease-in-out infinite',
        'orb-2': 'orb-drift-2 30s ease-in-out infinite',
        'orb-3': 'orb-drift-3 22s ease-in-out infinite',
        'orb-4': 'orb-drift-4 28s ease-in-out infinite',
        'bokeh-pulse': 'bokeh-pulse 5s ease-in-out infinite',
        'particle-rise': 'particle-rise 18s linear infinite',
        'pill-pulse': 'pill-pulse 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 2.6s linear infinite',
      },
      keyframes: {
        'orb-drift-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(60px, -40px) scale(1.08)' },
          '66%': { transform: 'translate(-40px, 60px) scale(0.94)' },
        },
        'orb-drift-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-80px, -50px) scale(1.12)' },
        },
        'orb-drift-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(0.95)' },
          '40%': { transform: 'translate(50px, 40px) scale(1.05)' },
          '80%': { transform: 'translate(-30px, -50px) scale(1)' },
        },
        'orb-drift-4': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, -60px) scale(1.06)' },
        },
        'bokeh-pulse': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.25)' },
        },
        'particle-rise': {
          '0%': { transform: 'translateY(0) translateX(0)', opacity: '0' },
          '10%': { opacity: '0.8' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(-110vh) translateX(40px)', opacity: '0' },
        },
        'pill-pulse': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.4)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
