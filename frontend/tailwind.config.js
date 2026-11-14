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
        background: '#0B1016',
        surface: {
          DEFAULT: '#111923',
          elevated: '#18232E',
          card: '#131D28',
          border: '#1F2D3D',
          hover: '#1D2A37',
        },
        primary: {
          DEFAULT: '#8CB7D8',
          hover: '#A4C8E5',
          dim: '#658FA’',
          subtle: 'rgba(140, 183, 216, 0.12)',
        },
        secondary: {
          DEFAULT: '#A6B6C4',
          dim: '#7C8C9A',
        },
        text: {
          main: '#E6EDF3',
          muted: '#8795A3',
          subtle: '#5A6875',
        },
        scientific: {
          success: '#78B99A',
          warning: '#E5A962',
          danger: '#E06C75',
          cyan: '#5EEAD4',
          ice: '#A5F3FC',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        '2xs': '0.65rem',
      }
    },
  },
  plugins: [],
}

