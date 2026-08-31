/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#040d1a",
          900: "#0a1628",
          800: "#0d1f3c",
          700: "#112550",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
        risk: {
          adaptive: "#22c55e",
          suspicious: "#eab308",
          high: "#f97316",
          hostile: "#ef4444",
        }
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      }
    }
  },
  plugins: [],
}
