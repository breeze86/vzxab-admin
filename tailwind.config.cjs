/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "blue-600": "#155dfc",
        "blue-700": "#1c398e",
        "blue-100": "#dbeafe",
        "blue-50": "#eff6ff",
        "indigo-50": "#eef2ff",
        "gray-900": "#0a0a0a",
        "gray-800": "#101828",
        "gray-700": "#364153",
        "gray-600": "#4a5565",
        "gray-500": "#6a7282",
        "gray-400": "#99a1af",
        "gray-200": "#e5e7eb",
        "gray-100": "#f3f4f6",
        "gray-50": "#f9fafb",
      },
      boxShadow: {
        soft:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        hero: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
      borderRadius: {
        xl: "16px",
        lg: "14px",
        pill: "999px",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      maxWidth: {
        page: "1280px",
      },
    },
  },
  plugins: [],
};
