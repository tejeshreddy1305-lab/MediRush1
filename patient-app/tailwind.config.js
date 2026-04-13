/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        caption: ["11px", { lineHeight: "1.4" }],
        secondary: ["13px", { lineHeight: "1.4" }],
        body: ["15px", { lineHeight: "1.4" }],
        primary: ["17px", { lineHeight: "1.4" }],
        subheading: ["20px", { lineHeight: "1.2" }],
        heading: ["24px", { lineHeight: "1.2" }],
        display: ["32px", { lineHeight: "1.2" }],
      },
    },
  },
  plugins: [],
}
