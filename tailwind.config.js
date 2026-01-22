/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',

        // Primary motivating color (Soft Blue/Cyan)
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',

        // Secondary accents
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',

        // Text colors
        'text-main': 'var(--color-text-main)',
        'text-muted': 'var(--color-text-muted)',

        // Status
        success: '#4ade80', // Green 400
        error: '#f87171', // Red 400
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
