import { scenarioEdgeMarks, scenarioNpcPositions } from "./scenario-data";
import { metroData } from "./metro-data";
import { directedTunnelEventKey, quietTunnelEvent, revealTunnelEvent } from "./tunnel-events";

export type SessionTime = "Утро" | "День" | "Вечер" | "Ночь";
export type SessionPhase = "planning" | "reveal" | "challenge" | "resolution";
export type PlayerIntent = "stay" | "tunnel" | null;

export type NetworkPlayer = {
  id: number;
  name: string;
  pair: number;
  roleId: string;
  position: string;
  bullets: number;
  health: number;
  lostLimbs: string[];
  inventory: string[];
  intent: PlayerIntent;
  target: string | null;
  ready: boolean;
  onlineAt: number | null;
  selectedItem: string | null;
};

export type NetworkWorld = {
  edges: Record<string, "normal" | "safe" | "unknown" | "closed">;
  tunnelEvents: Record<string, string>;
  npcPositions: Record<string, string>;
  npcOwners: Record<string, number | null>;
  npcServiceUsed: Record<string, boolean>;
  npcMoveRounds: { gm: number; role: number };
  notes: Record<string, string>;
  swallowedStations: string[];
  blackThread: { active: boolean; everyRounds: number; lastRound: number };
  gmLog: string[];
};

export type GmConsoleSnapshot = {
  round: number;
  activePair: number;
  time: SessionTime;
  activePlayerCount: 4 | 12;
  players: Array<{
    name: string;
    health: number;
    lostLimbs: string[];
    roleId: string;
    bullets: number;
    position: string;
  }>;
  world: NetworkWorld;
};

export type SessionLog = { id: string; at: number; text: string };

export type NetworkSession = {
  code: string;
  revision: number;
  status: "lobby" | "playing" | "paused";
  playerCount: 4 | 12;
  round: number;
  activePair: number;
  time: SessionTime;
  phase: SessionPhase;
  resolvedPairs: number[];
  players: NetworkPlayer[];
  activeChallenge: string | null;
  crisisStatus: "inactive" | "active" | "resolved";
  gmMessage: string;
  world: NetworkWorld;
  log: SessionLog[];
  updatedAt: number;
};

export type Viewer =
  | { kind: "gm"; label: string }
  | { kind: "squad"; pair: number; label: string }
  | { kind: "player"; playerId: number; label: string }
  | { kind: "common"; label: string };

export const demoCredentials = {
  gm: { pin: "2600", label: "Пульт ведущей" },
  common: { pin: "0000", label: "Общий терминал" },
  squads: [
    { pair: 1, pin: "1131", label: "Компьютер отряда 1" },
    { pair: 2, pin: "2242", label: "Компьютер отряда 2" },
    { pair: 3, pin: "3353", label: "Компьютер отряда 3" },
    { pair: 4, pin: "4464", label: "Компьютер отряда 4" },
    { pair: 5, pin: "5575", label: "Компьютер отряда 5" },
    { pair: 6, pin: "6686", label: "Компьютер отряда 6" },
  ],
  players: Array.from({ length: 12 }, (_, index) => ({
    playerId: index + 1,
    pin: String(3101 + index),
    label: `Личный экран ${index + 1}`,
  })),
} as const;

export function resolveViewer(pin: string): Viewer | null {
  if (pin === demoCredentials.gm.pin) return { kind: "gm", label: demoCredentials.gm.label };
  if (pin === demoCredentials.common.pin) return { kind: "common", label: demoCredentials.common.label };
  const squad = demoCredentials.squads.find((entry) => entry.pin === pin);
  if (squad) return { kind: "squad", pair: squad.pair, label: squad.label };
  const player = demoCredentials.players.find((entry) => entry.pin === pin);
  if (player) return { kind: "player", playerId: player.playerId, label: player.label };
  return null;
}

const roleIds = ["mag", "skeptic", "mother", "teen", "scientist", "medic", "trackman", "cartographer", "signalman", "shuttle", "veteran", "smuggler"];
const starts = [
  "10::окружная",
  "10::окружная",
  "2::водный стадион",
  "2::водный стадион",
  "6::калужская",
  "6::калужская",
  "7::спартак",
  "7::спартак",
  "8A::мичуринский проспект",
  "8A::мичуринский проспект",
  "11::печатники",
  "11::печатники",
];
const bullets = [5, 7, 7, 5, 5, 7, 7, 5, 7, 10, 5, 5];
const inventories = [
  ["wire", "mirror"], ["chalk", "flashlight"], ["cloth", "hot_meal"], ["headphones", "chalk"],
  ["tube", "filter"], ["medkit", "tourniquet"], ["wrench", "wire"], ["chalk", "rope"],
  ["radio", "wire"], ["cloth", "battery"], ["crowbar", "flare"], ["pass", "painkillers"],
];

function createInitialWorld(): NetworkWorld {
  return {
    edges: { ...scenarioEdgeMarks },
    tunnelEvents: {},
    npcPositions: { ...scenarioNpcPositions, "npc-26": "2::новокузнецкая", "npc-27": "6::китай-город" },
    npcOwners: {},
    npcServiceUsed: {},
    npcMoveRounds: { gm: 0, role: -1 },
    notes: {},
    swallowedStations: [],
    blackThread: { active: false, everyRounds: 2, lastRound: 0 },
    gmLog: ["Сетевая партия создана. Полный пульт ведущей подключён к комнате."],
  };
}

export function normalizeSession(stored: NetworkSession): NetworkSession {
  const defaults = createInitialWorld();
  const world = stored.world || defaults;
  return {
    ...stored,
    resolvedPairs: stored.resolvedPairs || [],
    crisisStatus: stored.crisisStatus || "inactive",
    players: stored.players.map((player) => ({ ...player, health: Number.isFinite(player.health) ? player.health : 10 })),
    world: {
      ...defaults,
      ...world,
      edges: { ...defaults.edges, ...(world.edges || {}) },
      tunnelEvents: { ...(world.tunnelEvents || {}) },
      npcPositions: { ...defaults.npcPositions, ...(world.npcPositions || {}) },
      npcOwners: world.npcOwners || {},
      npcServiceUsed: world.npcServiceUsed || {},
      npcMoveRounds: { ...defaults.npcMoveRounds, ...(world.npcMoveRounds || {}) },
      notes: world.notes || {},
      swallowedStations: Array.isArray(world.swallowedStations) ? world.swallowedStations : [],
      blackThread: { ...defaults.blackThread, ...(world.blackThread || {}) },
      gmLog: Array.isArray(world.gmLog) ? world.gmLog : defaults.gmLog,
    },
  };
}

function logEntry(text: string): SessionLog {
  const at = Date.now();
  return { id: `${at}-${Math.random().toString(36).slice(2, 8)}`, at, text };
}

export function createDemoSession(code = "TEST26"): NetworkSession {
  const now = Date.now();
  return {
    code: code.toUpperCase(), revision: 1, status: "lobby", playerCount: 4,
    round: 1, activePair: 1, time: "Утро", phase: "planning", resolvedPairs: [],
    players: roleIds.map((roleId, index) => ({
      id: index + 1, name: `Игрок ${String(index + 1).padStart(2, "0")}`,
      pair: Math.floor(index / 2) + 1, roleId, position: starts[index], bullets: bullets[index],
      health: 10, lostLimbs: [], inventory: inventories[index], intent: null, target: null,
      ready: false, onlineAt: null, selectedItem: null,
    })),
    activeChallenge: null, crisisStatus: "inactive",
    gmMessage: "Голоса становятся тише, когда вы движетесь к Полису.",
    world: createInitialWorld(),
    log: [logEntry("Тестовая комната создана. Активны две пары и четыре личных экрана.")],
    updatedAt: now,
  };
}

export type SessionAction =
  | { type: "heartbeat"; playerId?: number }
  | { type: "set-intent"; playerId: number; intent: Exclude<PlayerIntent, null>; target?: string | null }
  | { type: "toggle-item"; playerId: number; itemId: string }
  | { type: "set-player-name"; playerId: number; name: string }
  | { type: "gm-next-phase" }
  | { type: "gm-resolve-pair"; pair: number }
  | { type: "gm-set-status"; status: NetworkSession["status"] }
  | { type: "gm-set-message"; message: string }
  | { type: "gm-set-challenge"; challengeId: string | null }
  | { type: "gm-set-crisis"; status: NetworkSession["crisisStatus"] }
  | { type: "gm-set-active-pair"; pair: number }
  | { type: "gm-set-player-count"; count: 4 | 12 }
  | { type: "gm-adjust-bullets"; playerId: number; delta: number }
  | { type: "gm-limb"; playerId: number; limb: string }
  | { type: "gm-sync-console"; snapshot: GmConsoleSnapshot }
  | { type: "gm-reset" };

const timeCycle: SessionTime[] = ["Утро", "День", "Вечер", "Ночь"];
const phaseCycle: SessionPhase[] = ["planning", "reveal", "challenge", "resolution"];
const sessionEdges = metroData.edges as readonly { id: string; source: string; target: string; type: string }[];

function activePairTunnelKeys(state: NetworkSession, pair = state.activePair) {
  return state.players
    .slice(0, state.playerCount)
    .filter((player) => player.pair === pair && player.intent === "tunnel" && player.target)
    .flatMap((player) => {
      const edge = sessionEdges.find((entry) =>
        (entry.source === player.position && entry.target === player.target)
        || (entry.target === player.position && entry.source === player.target));
      if (!edge || edge.type === "transfer") return [];
      const key = directedTunnelEventKey(edge, player.position, player.target!);
      return key ? [{ key, status: state.world.edges[key] || "normal" }] : [];
    })
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.key === entry.key) === index);
}

function revealActivePairChallenge(state: NetworkSession) {
  const revealed = activePairTunnelKeys(state).map(({ key, status }) => revealTunnelEvent(state.world.tunnelEvents, key, status));
  state.activeChallenge = revealed.find((eventId) => eventId !== quietTunnelEvent) || null;
}

export function applySessionAction(state: NetworkSession, action: SessionAction, viewer: Viewer): NetworkSession {
  if (action.type.startsWith("gm-") && viewer.kind !== "gm") throw new Error("Недостаточно прав для действия ведущей.");
  const activeIds = new Set(state.players.slice(0, state.playerCount).map((player) => player.id));
  const canUsePlayer = (playerId: number) => {
    if (!activeIds.has(playerId)) return false;
    if (viewer.kind === "gm") return true;
    if (viewer.kind === "player") return viewer.playerId === playerId;
    if (viewer.kind === "squad") return state.players[playerId - 1]?.pair === viewer.pair;
    return false;
  };
  let next: NetworkSession = {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    world: { ...state.world, tunnelEvents: { ...(state.world.tunnelEvents || {}) } },
    updatedAt: Date.now(),
  };
  const addLog = (text: string) => { next = { ...next, log: [logEntry(text), ...next.log].slice(0, 120) }; };

  switch (action.type) {
    case "heartbeat": {
      if (action.playerId && canUsePlayer(action.playerId)) next.players[action.playerId - 1].onlineAt = Date.now();
      break;
    }
    case "set-intent": {
      if (!canUsePlayer(action.playerId) || next.phase !== "planning") throw new Error("Сейчас это решение изменить нельзя.");
      const player = next.players[action.playerId - 1];
      player.intent = action.intent;
      player.target = action.intent === "tunnel" ? action.target || null : null;
      player.ready = true;
      addLog(`${player.name} зафиксировал личное решение.`);
      if (next.players.slice(0,next.playerCount).every((entry)=>entry.ready)) {
        next.phase = "reveal";
        addLog("Все личные решения получены. Система автоматически открыла фазу раскрытия.");
      }
      break;
    }
    case "toggle-item": {
      if (!canUsePlayer(action.playerId)) throw new Error("Эта карточка вам не принадлежит.");
      const player = next.players[action.playerId - 1];
      if (!player.inventory.includes(action.itemId)) throw new Error("Карточка отсутствует в инвентаре.");
      player.selectedItem = player.selectedItem === action.itemId ? null : action.itemId;
      break;
    }
    case "set-player-name": {
      if (!canUsePlayer(action.playerId)) throw new Error("Нельзя изменить это имя.");
      next.players[action.playerId - 1].name = action.name.trim().slice(0, 28) || next.players[action.playerId - 1].name;
      break;
    }
    case "gm-next-phase": {
      const phaseIndex = phaseCycle.indexOf(next.phase);
      if (next.phase === "resolution") {
        next.round += 1;
        next.phase = "planning";
        next.activePair = 1;
        next.resolvedPairs = [];
        next.time = timeCycle[(timeCycle.indexOf(next.time) + 1) % timeCycle.length];
        next.activeChallenge = null;
        next.players = next.players.map((player) => ({ ...player, intent: null, target: null, ready: false, selectedItem: null }));
        addLog(`Начался раунд ${next.round}. Общее время: ${next.time}.`);
      } else {
        next.phase = phaseCycle[phaseIndex + 1];
        if (next.phase === "challenge") revealActivePairChallenge(next);
        addLog(`Фаза изменена: ${next.phase}.`);
      }
      break;
    }
    case "gm-resolve-pair": {
      if (next.phase !== "challenge") throw new Error("Завершать ходы пар можно только на фазе испытаний.");
      const totalPairs=next.playerCount/2;
      next.resolvedPairs=Array.from(new Set([...next.resolvedPairs,Math.max(1,Math.min(totalPairs,action.pair))]));
      addLog(`Ход отряда ${action.pair} полностью разрешён.`);
      if(next.resolvedPairs.length===totalPairs){
        next.phase="resolution";
        addLog("Все отряды завершили действия. Раунд автоматически перешёл к итогам.");
      }else{
        next.activePair=Array.from({length:totalPairs},(_,index)=>index+1).find((pair)=>!next.resolvedPairs.includes(pair))||1;
        revealActivePairChallenge(next);
      }
      break;
    }
    case "gm-set-status": next.status = action.status; addLog(`Статус партии: ${action.status}.`); break;
    case "gm-set-message": next.gmMessage = action.message.slice(0, 220); break;
    case "gm-set-challenge": {
      const keys = activePairTunnelKeys(next);
      const fixed = keys.map(({ key }) => next.world.tunnelEvents[key]).find(Boolean);
      if (fixed) next.activeChallenge = fixed === quietTunnelEvent ? null : fixed;
      else {
        next.activeChallenge = action.challengeId;
        if (action.challengeId && keys[0]) next.world.tunnelEvents[keys[0].key] = action.challengeId;
      }
      addLog(next.activeChallenge ? "Ведущая открыла закреплённое испытание тоннеля." : "Испытание закрыто.");
      break;
    }
    case "gm-set-crisis": {
      next.crisisStatus = action.status;
      addLog(action.status === "active"
        ? "КРИЗИС: выработка патронов остановлена, Чёрное Нечто движется вдвое быстрее."
        : action.status === "resolved"
          ? "Кризис «Квадрат в кольце» разрешён. Выработка патронов восстановлена."
          : "Кризис возвращён в ожидание.");
      break;
    }
    case "gm-set-active-pair": {
      next.activePair = Math.max(1, Math.min(next.playerCount / 2, action.pair));
      if (next.phase === "challenge") revealActivePairChallenge(next);
      break;
    }
    case "gm-set-player-count": next.playerCount = action.count; next.activePair = 1; addLog(action.count === 4 ? "Включён тестовый режим: две пары." : "Включена полная партия: шесть пар."); break;
    case "gm-adjust-bullets": {
      const player = next.players[action.playerId - 1];
      player.bullets = Math.max(0, player.bullets + action.delta);
      addLog(`${player.name}: ${action.delta > 0 ? "+" : ""}${action.delta} патронов.`);
      break;
    }
    case "gm-limb": {
      const player = next.players[action.playerId - 1];
      player.lostLimbs = player.lostLimbs.includes(action.limb) ? player.lostLimbs.filter((limb) => limb !== action.limb) : [...player.lostLimbs, action.limb];
      addLog(`${player.name}: состояние конечностей изменено.`);
      break;
    }
    case "gm-sync-console": {
      const snapshot = action.snapshot;
      next.round = Math.max(1, snapshot.round);
      next.activePair = Math.max(1, Math.min(snapshot.activePlayerCount / 2, snapshot.activePair + 1));
      next.time = snapshot.time;
      next.playerCount = snapshot.activePlayerCount;
      next.players = next.players.map((player, index) => {
        const incoming = snapshot.players[index];
        return incoming ? {
          ...player,
          name: incoming.name.slice(0, 28),
          health: Math.max(0, Math.min(10, incoming.health)),
          lostLimbs: [...incoming.lostLimbs],
          roleId: incoming.roleId,
          bullets: Math.max(0, incoming.bullets),
          position: incoming.position,
        } : player;
      });
      next.world = {
        ...next.world,
        ...snapshot.world,
        edges: { ...snapshot.world.edges },
        tunnelEvents: { ...(snapshot.world.tunnelEvents || {}) },
        npcPositions: { ...snapshot.world.npcPositions },
        npcOwners: { ...snapshot.world.npcOwners },
        npcServiceUsed: { ...snapshot.world.npcServiceUsed },
        npcMoveRounds: { ...snapshot.world.npcMoveRounds },
        notes: { ...snapshot.world.notes },
        swallowedStations: [...snapshot.world.swallowedStations],
        blackThread: { ...snapshot.world.blackThread },
        gmLog: [...snapshot.world.gmLog].slice(0, 120),
      };
      break;
    }
    case "gm-reset": return createDemoSession(state.code);
  }
  return next;
}

export function projectSession(state: NetworkSession, viewer: Viewer) {
  if (viewer.kind === "gm") return state;
  const active = state.players.slice(0, state.playerCount);
  const canSeeChallenge = viewer.kind === "squad" && viewer.pair === state.activePair;
  return {
    ...state,
    activeChallenge: canSeeChallenge ? state.activeChallenge : null,
    world: {
      ...state.world,
      tunnelEvents: {},
      notes: {},
      gmLog: [],
    },
    players: active.map((player) => {
      const own = viewer.kind === "player" && viewer.playerId === player.id;
      const pair = viewer.kind === "squad" && viewer.pair === player.pair;
      return {
        ...player,
        inventory: own ? player.inventory : [],
        selectedItem: own || pair ? player.selectedItem : null,
        intent: own || pair || state.phase !== "planning" ? player.intent : null,
        target: own || pair || state.phase !== "planning" ? player.target : null,
      };
    }),
    log: viewer.kind === "common" ? state.log.slice(0, 8) : state.log.slice(0, 20),
  };
}
