import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.2s ease',
        fadeIn: 'fadeIn 0.2s ease',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        serif: ['"Noto Serif JP"', 'serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          2: '#f0ede8',
        },
        bg: '#f5f4f0',
        border: {
          DEFAULT: '#ddd9d0',
          strong: '#b8b2a7',
        },
        accent: {
          DEFAULT: '#2d5a3d',
          light: '#e8f0ea',
          hover: '#234830',
        },
        gold: '#c9a84c',
        ink: {
          DEFAULT: '#1a1814',
          sub: '#5a5650',
          muted: '#8a8478',
        },
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        lg: '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
