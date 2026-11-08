const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "*.{ts,tsx}"),
    path.join(__dirname, "app-language/**/*.{ts,tsx}"),
    path.join(__dirname, "components/**/*.{ts,tsx}"),
    path.join(__dirname, "editor/**/*.{ts,tsx}"),
    path.join(__dirname, "home/**/*.{ts,tsx}"),
    path.join(__dirname, "hooks/**/*.{ts,tsx}"),
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "app-bg": "var(--app-bg)",
        "app-surface": "var(--app-surface)",
        "app-surface-muted": "var(--app-surface-muted)",
        "app-border": "var(--app-border)",
        "app-text": "var(--app-text)",
        "app-text-muted": "var(--app-text-muted)",
        "app-accent": "var(--app-accent)",
        "app-danger": "var(--app-danger)",
      },
      fontFamily: {
        app: ["Assistant", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
