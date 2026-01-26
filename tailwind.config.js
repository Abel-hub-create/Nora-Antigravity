/** @type {import('tailwindcss').Config} */

/**
 * DESIGN SYSTEM - Tailwind Configuration
 *
 * Spacing: Base unit 4px (default Tailwind)
 * Typography: Inter only
 * Colors: CSS variables for theme support
 *
 * Animation Categories:
 * - Decorative: 8-14s (plant-sway, plant-breathe)
 * - UI Transitions: 150-300ms (default Tailwind)
 * - Appearances: 200-500ms (fade-in)
 */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        // Intensity: Low (backgrounds)
        background: 'var(--color-background)',

        // Intensity: Medium (surfaces)
        surface: 'var(--color-surface)',

        // Intensity: Accent (interactive elements only)
        primary: 'var(--color-primary)',
        'primary-dark': 'var(--color-primary-dark)',

        // Secondary accents
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',

        // Text colors (WCAG AA compliant)
        'text-main': 'var(--color-text-main)',
        'text-muted': 'var(--color-text-muted)',

        // Status colors
        success: '#4ade80', // Green 400
        error: '#f87171', // Red 400
      },
      fontFamily: {
        // Single font family - no other fonts allowed
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        // UI animations
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Decorative animations (8-14s, slow micro-movements)
        'plant-sway': 'plant-sway 10s ease-in-out infinite',
        'plant-breathe': 'plant-breathe 12s ease-in-out infinite',

        // Appearance animations (200-500ms)
        'fade-in': 'fade-in 300ms ease-out forwards',
      },
      transitionDuration: {
        // UI Transitions: 150-300ms
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}
