/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#17B8A6",
        "accent-dark": "#0E8478",
      },
    },
  },
  plugins: [],
};
