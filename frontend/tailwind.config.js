/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        aspect: {
          accent: "var(--aspect-accent)",
          "accent-hover": "var(--aspect-accent-hover)",
          text: "var(--aspect-text)",
          secondary: "var(--aspect-text-secondary)",
          tertiary: "var(--aspect-text-tertiary)",
          disabled: "var(--aspect-text-disabled)",
          glass: "var(--aspect-glass)",
          card: "var(--aspect-card)",
          "card-hover": "var(--aspect-card-hover)",
          input: "var(--aspect-input)",
          border: "var(--aspect-border)",
          "border-hover": "var(--aspect-border-hover)",
          "border-type": "var(--aspect-border-type)",
          base: "var(--aspect-base)",
          "base-strong": "var(--aspect-base-strong)",
          info: "var(--aspect-info)",
          success: "var(--aspect-success)",
          error: "var(--aspect-error)",
          warning: "var(--aspect-warning)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        display: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        secondary: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        aspect: "var(--aspect-12)",
        "aspect-sm": "var(--aspect-8)",
        "aspect-lg": "var(--aspect-16)",
        "aspect-round": "var(--aspect-round)",
      },
      backdropBlur: {
        aspect: "var(--aspect-blur)",
      },
    },
  },
  plugins: [],
}
