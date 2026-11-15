/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6F0",
        plum: "#3A2327",
        blush: "#F3DCE6",
        rose: "#E6A8BF",
        slateBlue: "#B8CEDD",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        editorial: "4px 4px 0px 0px #3A2327",
        editorialSm: "2px 2px 0px 0px #3A2327",
      },
    },
  },
  plugins: [],
};
