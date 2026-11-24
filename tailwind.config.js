/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#FAF8F4',
          warm: '#F3EFE7',
          mist: '#ECEAE3',
        },
        abyss: {
          shallow: '#DDD8CF',
          mid: '#4B413B',
          deep: '#241D1A',
          floor: '#171311',
        },
        ink: {
          DEFAULT: '#171614',
          muted: '#5D5A54',
          soft: '#8D8980',
        },
        botanical: {
          DEFAULT: '#0E7C61',
          soft: '#229A7C',
          wash: '#E2F2EC',
        },
        crimson: {
          DEFAULT: '#C42B3E',
          deep: '#9A1D2D',
          glow: '#F26476',
          wash: '#F9E4E7',
        },
        amberdepth: {
          DEFAULT: '#C27018',
          bright: '#E39A3B',
          wash: '#F8ECD9',
        },
        cobalt: {
          DEFAULT: '#1D4ED8',
          soft: '#3B82F6',
          wash: '#E6EEFD',
        },
        obsidian: {
          DEFAULT: '#111110',
          surface: '#1A1917',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tag: '0.11em',
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
