/** @type {import('tailwindcss').Config} */

// All color is driven by CSS variables defined in src/index.css on :root (dark)
// and [data-theme="light"]. Tokens are exposed to Tailwind as rgb(var(--x) / alpha)
// so utilities like bg-panel/40 or text-fg work in BOTH themes. Never hardcode a hex
// in a component — add a token here and in index.css instead.
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces (theme-aware)
        base: withVar('--c-base'),       // page background floor
        abyss: withVar('--c-abyss'),     // deep panel base
        panel: withVar('--c-panel'),     // glass card fill
        hairline: withVar('--c-hairline'),// glass borders
        fg: withVar('--c-fg'),           // primary text
        muted: withVar('--c-muted'),     // secondary text
        faint: withVar('--c-faint'),     // tertiary text

        // Brand (stable across themes, lightly tuned via vars)
        brand: {
          go: withVar('--c-go'),         // "GO" — white (dark) / deep ink (light)
          luq: withVar('--c-luq'),       // "LuQ" — cyan
        },
        teal: {
          glow: withVar('--c-teal-glow'),
          neon: withVar('--c-teal-neon'),
        },
        indigo: {
          glow: withVar('--c-indigo-glow'),
          deep: withVar('--c-indigo-deep'),
        },

        // Status (sim log chips)
        success: withVar('--c-success'),
        danger: withVar('--c-danger'),
        warn: withVar('--c-warn'),
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        deva: ['Noto Sans Devanagari', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45)',
        'glass-soft': '0 4px 24px rgba(0,0,0,0.25)',
        neon: '0 0 24px rgba(34,211,238,0.45)',
        'neon-strong': '0 0 48px rgba(34,211,238,0.55)',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%, -3%, 0) scale(1.08)' },
        },
        'border-sweep': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-150% 0' },
          '100%': { backgroundPosition: '150% 0' },
        },
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.22,1,0.36,1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
