/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: '#1a1a1a',
        paper: '#faf9f6',
        accent: '#2d6a4f',       // forest green
        'accent-light': '#40916c',
        'accent-wash': '#d8f3dc',
        'accent-warm': '#c45d3e', // keep terracotta as secondary
        muted: '#7c7c7c',
        border: '#e2e0db',
      },
    },
  },
  plugins: [],
};
