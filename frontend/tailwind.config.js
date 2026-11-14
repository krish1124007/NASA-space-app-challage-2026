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
        background: '#05080D',
        surface: {
          DEFAULT: '#0A0F17',
          elevated: '#0E151F',
          card: '#0E151F',
          border: '#1B2533',
          hover: '#15202B',
        },
        primary: {
          DEFAULT: '#8AB4E0',
          hover: '#A8C8E8',
          dim: '#5B9BD5',
          subtle: 'rgba(138, 180, 224, 0.12)',
        },
        secondary: {
          DEFAULT: '#7D8A99',
          dim: '#5A6875',
        },
        text: {
          main: '#C9D1D9',
          muted: '#7D8A99',
          subtle: '#5A6875',
        },
        scientific: {
          success: '#4FE0C0',
          warning: '#E0B04F',
          danger: '#E05F5F',
          cyan: '#4FE0C0',
          ice: '#4FE0C0',
        }
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Source Code Pro', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Source Code Pro', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
    },
  },
  plugins: [],
}