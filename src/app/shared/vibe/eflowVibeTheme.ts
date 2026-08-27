// Vibe remains the visual system. These are deliberately limited product-identity
// overrides supported by Vibe's ThemeProvider API.
export const eflowVibeTheme = {
  name: "eflow-vibe",
  colors: {
    light: {
      "primary-color": "#0c6f6b",
      "primary-hover-color": "#095c59",
      "primary-selected-color": "#d9f0ed",
      "primary-selected-hover-color": "#c7e8e4",
      "primary-selected-on-secondary-color": "#b9e1dc",
      "text-color-on-primary": "#ffffff",
      "brand-color": "#0c6f6b",
      "brand-hover-color": "#095c59",
      "brand-selected-color": "#d9f0ed",
      "brand-selected-hover-color": "#c7e8e4",
      "text-color-on-brand": "#ffffff",
    },
    dark: {
      "primary-color": "#57c8bd",
      "primary-hover-color": "#73d6cc",
      "primary-selected-color": "#164c49",
      "primary-selected-hover-color": "#1d605b",
      "primary-selected-on-secondary-color": "#246d67",
      "text-color-on-primary": "#0e2624",
      "brand-color": "#57c8bd",
      "brand-hover-color": "#73d6cc",
      "brand-selected-color": "#164c49",
      "brand-selected-hover-color": "#1d605b",
      "text-color-on-brand": "#0e2624",
    },
  },
} as const;
