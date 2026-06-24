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
        // "forest" is kept as a tailwind class name for back-compat but
        // now resolves to deep mint, never green. The user's brief is:
        // every previously-green hue should be either gradient mint or
        // this dark mint #2E7268 — no #4A6B4F sage / forest green and
        // no olive-leaning #1F4F47 either (read as dark green to the
        // user). #2E7268 is the same hue family as the brand mint
        // #5FA89B, just darker — keeps everything in the teal/mint
        // family without drifting toward green.
        forest: "#2E7268",
        clay: "#9E5E47",
        // Patient-side warm accent borrowed from Candid (DTC aligners) —
        // a deliberate softening from clinical teal/blue. Used SELECTIVELY
        // on patient onboarding & hero status cards only; dentist surfaces
        // and AHPRA badges stay mint/teal to keep the two sides distinct.
        blush: "#F3D7CE",
        "blush-soft": "#FBEDE7",

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
