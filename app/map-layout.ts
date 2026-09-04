import { schemeLayout } from "./metro-layout-scheme";

export type MapLayout = "scheme" | "geo";

/**
 * Раскладка карты метро.
 *  - "scheme": позиции со схемы метро (metro-layout-scheme.ts), как на плакате в вагоне;
 *  - "geo": географические координаты станций (старый вариант).
 * Чтобы вернуть старую карту, поменяйте значение на "geo".
 */
export const MAP_LAYOUT: MapLayout = "scheme";

/** Схема масштабируется так, чтобы размах карты был близок к географическому варианту (~1200 × 1700). */
const SCHEME_SCALE = 1.7;
const SCHEME_CENTER = { x: 421, y: 595 };

type GeoNode = { id: string; lat: number; lng: number };

/** Координаты станции в единицах карты для текущей раскладки. width/height — размер viewBox карты. */
export function layoutPosition(node: GeoNode, width: number, height: number, layout: MapLayout = MAP_LAYOUT): { x: number; y: number } {
  const scheme = layout === "scheme" ? schemeLayout[node.id] : undefined;
  if (scheme) {
    return { x: width / 2 + (scheme[0] - SCHEME_CENTER.x) * SCHEME_SCALE, y: height / 2 + (scheme[1] - SCHEME_CENTER.y) * SCHEME_SCALE };
  }
  return { x: width / 2 + (node.lng - 37.62) * 3200, y: height / 2 + (55.75 - node.lat) * 5200 };
}
