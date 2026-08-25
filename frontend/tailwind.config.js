/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: "#fafafa",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
      },
      fontFamily: {
        sans: ["Geologica", "Arial", "sans-serif"],
        secondary: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
}
