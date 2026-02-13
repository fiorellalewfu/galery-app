declare module "*.jsx" {
  export type LightVisualPreset = "cinematic" | "fantasy";
  export const UniverseStars: (options?: { preset?: LightVisualPreset }) => () => void;
  export const LightBrushCursor: (options?: { preset?: LightVisualPreset }) => () => void;
}
