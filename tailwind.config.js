/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark, calm background
        background: '#0f172a', // Slate 900
        surface: '#1e293b', // Slate 800
        
        // Primary motivating color (Soft Blue/Cyan)
        primary: '#38bdf8', // Sky 400
        'primary-dark': '#0ea5e9', // Sky 500
        
        // Secondary accents
        secondary: '#818cf8', // Indigo 400
        accent: '#f472b6', // Pink 400 (for subtle highlights)
        
        // Text colors
        'text-main': '#f8fafc', // Slate 50
        'text-muted': '#94a3b8', // Slate 400
        
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
