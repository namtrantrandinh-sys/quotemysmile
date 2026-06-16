/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Surfaces — cream/nude
        bone: "#F5F1E8",
        eggshell: "#EDE6D6",
        linen: "#E5DCC8",
        champagne: "#DCCFB4",

        // Ink — warm dark
        espresso: "#2A2520",
        walnut: "#4D423A",
        taupe: "#8A7E70",
        sand: "#BFB29F",

        // Accents — brushed gold + restrained semantics
        gold: "#A9CFC0",
        honey: "#A8843D",
        forest: "#4A6B4F",
        clay: "#9E5E47",

        // Dark mode surfaces
        onyx: "#1A1612",
        charcoal: "#25201B",
        slate: "#332D26",
      },
      fontFamily: {
        display: ["Lora"],
        "display-medium": ["Lora-Medium"],
        "display-semibold": ["Lora-SemiBold"],
        "display-italic": ["Lora-Italic"],
        "display-medium-italic": ["Lora-MediumItalic"],
        sans: ["Inter"],
        "sans-medium": ["Inter-Medium"],
      },
      letterSpacing: {
        editorial: "2.7px",
        cap: "1.1px",
      },
    },
  },
  plugins: [],
};
