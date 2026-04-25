/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b0f1a',
          800: '#111827',
          700: '#1a2235',
          600: '#1e293b',
        },
        accent: {
          green: '#00d4a0',
          blue: '#3b82f6',
        }
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
