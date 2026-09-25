/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        risk: {
          adaptive: "#10b981",    // normal/healthy/authorized
          suspicious: "#f59e0b",  // amber / medium risk
          high: "#f97316",        // orange-red
          hostile: "#ef4444",     // critical threat
        },
        slate: {
          750: "#1e293b",
          850: "#131b2e",
        },
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
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
        sans: ["'Inter'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
      }
    }
  },
  plugins: [],
}
