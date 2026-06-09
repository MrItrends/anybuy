/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
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
    },
  },
  plugins: [],
}
