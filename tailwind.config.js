/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d1117',
          surface: '#121821',
          elevated: '#161d29',
          border: '#222b3a',
          hover: '#1c2433',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#9ba8bd',
          muted: '#6b7a90',
          dim: '#4b5668',
        },
        brand: {
          50: '#e8f9ee',
          100: '#c9f0d5',
          200: '#94e0a8',
          300: '#5ecf7d',
          400: '#3fb950',
          500: '#2ea043',
          600: '#238636',
          700: '#196c2e',
          800: '#105423',
          900: '#0a3b18',
        },
        accent: {
          warning: '#d29922',
          warningSoft: '#3b2a0d',
          danger: '#f85149',
          dangerSoft: '#3b1618',
          info: '#58a6ff',
          infoSoft: '#0d2a4a',
          success: '#3fb950',
          successSoft: '#0f2e1d',
          purple: '#bc8cff',
          purpleSoft: '#2a1f4a',
          orange: '#f0883e',
          orangeSoft: '#3b1f0d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(63,185,80,0.35), 0 0 18px rgba(63,185,80,0.15)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.8)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
