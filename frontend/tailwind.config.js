/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic Risk Hierarchy (No decorative bright blue)
        risk: {
          adaptive: "#10b981",    // subtle green (normal/healthy/authorized)
          suspicious: "#f59e0b",  // amber (medium risk / warning)
          high: "#f97316",        // orange-red (high risk)
          hostile: "#ef4444",     // strong red (critical threat / hostile)
        },
        // Neutral Slate/Zinc Enterprise Tones
        graphite: {
          950: "#070a0f",
          900: "#0c1017",
          850: "#111622",
          800: "#171e2e",
          700: "#222c40",
          600: "#334155",
        }
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    }
  },
  plugins: [],
}
