/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-container': '#1d2027',
        'primary': '#adc6ff',
        'surface': '#10131a',
        'surface-variant': '#32353c',
        'on-background': '#e1e2ec',
        'on-surface': '#e1e2ec',
        'on-surface-variant': '#c2c6d6',
        'surface-dim': '#10131a',
        'background': '#0B0F19',
        'outline': '#8c909f',
        'outline-variant': '#424754',
        'primary-container': '#4d8eff',
        'card-bg': '#111827',
        'card-hover': '#151d2e',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'meta-data': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '700' }],
      },
      spacing: {
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'space-xs': '0.25rem',
      },
    },
  },
  plugins: [],
}