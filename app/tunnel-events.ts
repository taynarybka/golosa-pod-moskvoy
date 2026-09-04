import { challengeCards } from "./card-data";

export const quietTunnelEvent = "__quiet__";

type TunnelEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
};

export function directedTunnelEventKey(edge: TunnelEdge, source: string, target: string) {
  if (edge.type === "transfer") return null;
  if (edge.source === source && edge.target === target) return `${edge.id}::forward`;
  if (edge.target === source && edge.source === target) return `${edge.id}::backward`;
  return null;
}

export function revealTunnelEvent(
  events: Record<string, string>,
  key: string,
  status: string,
) {
  const remembered = events[key];
  if (remembered) return remembered;

  const quietChance = status === "safe" ? 0.45 : 0.1;
  const pool = challengeCards.filter((card) => card.id !== "people-01");
  const revealed = Math.random() < quietChance
    ? quietTunnelEvent
    : pool[Math.floor(Math.random() * pool.length)]?.id || quietTunnelEvent;
  events[key] = revealed;
  return revealed;
}

