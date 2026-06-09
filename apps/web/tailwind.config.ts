import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0E2A2B',
          orange: '#FF6A3D',
          green: '#22C55E',
          'off-white': '#FBF9FA',
        },
        neutral: {
          900: '#111827',
          600: '#6B7280',
          200: '#E5E7EB',
          100: '#F3F4F6',
        },
        category: {
          phones: '#3B82F6',
          fashion: '#A855F7',
          home: '#F59E0B',
          electronics: '#14B8A6',
          sports: '#EC4899',
        },
      },
      fontFamily: {
        satoshi: ['Satoshi', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.15', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['1.75rem', { lineHeight: '1.25', fontWeight: '700' }],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0E2A2B 0%, #1a4445 100%)',
        'orange-gradient': 'linear-gradient(135deg, #FF6A3D 0%, #ff8a65 100%)',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.14)',
        orange: '0 4px 16px rgba(255,106,61,0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
