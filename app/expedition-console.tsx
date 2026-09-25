"use client";

/* eslint-disable react-hooks/refs */

import type { MqttClient } from "mqtt";
import { useCallback, useEffect, useRef, useState } from "react";
import { activeCaravansForRound } from "./caravan-data";
import { challengeCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { DeathModal } from "./death-modal";
import { cordonRules, getCordonProfile, itemInspectionRisk, npcCards, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { healthRatio, MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";
import { directedTunnelEventKey, quietTunnelEvent, revealTunnelEvent } from "./tunnel-events";

type MetroEdge = { id: string; source: string; target: string; type: string; color: string };
type TunnelId = "forward" | "backward";
type CompetitivePassage = { edge: MetroEdge; target: string; status: string; tunnelId: TunnelId | null };
type SetupPlayer = { name: string; roleId: string; start: string };
type ExpeditionPhase = "planning" | "challenge" | "cordon" | "encounters" | "summary" | "finished";
type FinishRecord = { playerId: number; rank: number; round: number };
type PlayerStats = {
  tunnels: number; visited: string[]; healed: number; knowledge: string[];
  abilities: number; interventions: number; injuries: number; npcs: number; bulletsSpent: number; route: string[];
};
type PlannedAction = { kind: "stay" } | { kind: "move"; target: string; edgeId: string; tunnelId?: TunnelId | null };
type Encounter = { playerId: number; source: string; target: string; edgeId: string; tunnelId?: TunnelId | null; challengeId: string; alternatives?: string[]; companionId?: number; resolved: boolean };
type InterventionId = "false-alarm" | "cordon-tax" | "switched-points" | "raid" | "caravan-intercept" | "planted-evidence";
type InterventionEffect = { id: string; type: InterventionId; sourceId: number; targetId: number; round: number; edgeId?: string };
type TradeOffer = { id: string; fromId: number; toId: number; itemId?: string; bullets?: number; remote: boolean; status: "pending" | "accepted" | "rejected" };
type AllianceOffer = { id: string; fromId: number; toId: number; edgeId: string; target: string; round: number; status: "pending" | "accepted" | "rejected" };
type ExpeditionSave = {
  session: NetworkSession;
  humanIds: number[];
  activeHuman: number;
  phase: ExpeditionPhase;
  pendingTarget: string | null;
  pendingEdge: string | null;
  report: string[];
  traversals: { source: string; target: string; playerId: number }[];
  finishers: FinishRecord[];
  botControlledIds: number[];
  stats: Record<number, PlayerStats>;
  roleUses: Record<string, number>;
  version?: 2;
  plans?: Record<number, PlannedAction>;
  encounters?: Record<number, Encounter>;
  interventionHands?: Record<number, InterventionId[]>;
  effects?: InterventionEffect[];
  tradeOffers?: TradeOffer[];
  allianceOffers?: AllianceOffer[];
  finaleEndsAfterRound?: number | null;
  initiativeOffset?: number;
  caravanOffset?: number;
  timerEnabled?: boolean;
  planningEndsAt?: number | null;
  originalHumanIds?: number[];
  originalPlayerByClient?: Record<string, number>;
  takeoverOriginals?: Record<string, number>;
  temporaryEdges?: Record<string, string>;
  privateNotes?: Record<number, string[]>;
};
type Outcome = { move: boolean; injury?: boolean; note: string; reward?: string };
type LobbyMember = SetupPlayer & { clientId: string; connected: boolean; ready: boolean; joinedAt: number };
type SharedRoom = {
  code: string;
  hostClientId: string;
  status: "lobby" | "playing";
  members: LobbyMember[];
  playerByClient: Record<string, number>;
  save: ExpeditionSave | null;
  timerEnabled?: boolean;
  planningSeconds?: number;
  processedCommandIds?: string[];
};
type RoomCommand =
  | { type: "join"; member: LobbyMember }
  | { type: "profile"; patch: Partial<SetupPlayer> }
  | { type: "ready"; ready: boolean }
  | { type: "disconnect" }
  | { type: "start" }
  | { type: "choose"; target: string | null; edgeId?: string }
  | { type: "resolve"; optionId: string }
  | { type: "resolve-cordon"; mode: "pay" | "inspection" | "pass" | "retreat" }
  | { type: "use-item"; itemId: string }
  | { type: "discard-item"; itemId: string }
  | { type: "give-item"; itemId: string; targetPlayerId: number }
  | { type: "recruit-npc"; npcId: string }
  | { type: "use-npc"; npcId: string }
  | { type: "skip-disconnected" }
  | { type: "bot-takeover"; playerId: number }
  | { type: "restore-human"; playerId: number }
  | { type: "role-action"; edgeId?: string }
  | { type: "next-round" }
  | { type: "set-timer"; enabled: boolean }
  | { type: "remove-member"; clientId: string }
  | { type: "plan"; action: PlannedAction }
  | { type: "resolve-encounter"; optionId: string }
  | { type: "play-intervention"; cardId: InterventionId; targetPlayerId: number; edgeId?: string }
  | { type: "competitive-ability"; targetPlayerId?: number; edgeId?: string }
  | { type: "offer-trade"; targetPlayerId: number; itemId?: string; bullets?: number }
  | { type: "answer-trade"; offerId: string; accept: boolean }
  | { type: "offer-alliance"; targetPlayerId: number; edgeId: string; target: string }
  | { type: "answer-alliance"; offerId: string; accept: boolean }
  | { type: "transfer-npc"; npcId: string; targetPlayerId: number }
  | { type: "claim-bot"; playerId: number }
  | { type: "rematch" };
type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const edges = metroData.edges as readonly MetroEdge[];
const nodes = metroData.nodes as readonly { id: string; name: string; lineName: string; color: string }[];
const nodeById = new Map(nodes.map((node) => [node.id, node]));
const polisIds = new Set(["1::библиотека им.ленина", "3::арбатская", "4::александровский сад", "9::боровицкая"]);
const starts = ["10::окружная", "2::водный стадион", "6::калужская", "7::спартак", "8A::мичуринский проспект", "11::печатники"];
const botNames = ["Север", "Лис", "Яна", "Сыч", "Док", "Шило", "Марта", "Картограф", "Искра", "Челнок", "Старик", "Тихий"];
const limbCycle = ["leftArm", "rightArm", "leftLeg", "rightLeg"];
const timeCycle: SessionTime[] = ["Утро", "День", "Вечер", "Ночь"];
const rewards = ["chalk", "cloth", "wire", "lighter", "tourniquet"];
const itemNames: Record<string, string> = {
  chalk: "Мел", cloth: "Плотная ткань", wire: "Моток проволоки", lighter: "Зажигалка", tourniquet: "Жгут", medkit: "Аптечка",
  mirror: "Осколок зеркала", flashlight: "Фонарь", hot_meal: "Горячая еда", headphones: "Наушники", tube: "Герметичный тубус",
  filter: "Фильтр", wrench: "Путевой ключ", rope: "Верёвка", radio: "Радиостанция", battery: "Батарея", crowbar: "Карабин",
  flare: "Сигнальный патрон", pass: "Поддельный пропуск", painkillers: "Обезболивающее", tarp: "Тент", boots: "Сапоги",
  rat_spray: "Средство от крыс", whistle: "Свисток", antiseptic: "Антисептик", splint: "Шина",
};
const suspiciousLabel = (itemId: string) => (itemInspectionRisk[itemId] || 0) > 0 ? `подозрительность ${itemInspectionRisk[itemId]}` : "обычный предмет";
const emptyStats = (): PlayerStats => ({ tunnels: 0, visited: [], healed: 0, knowledge: [], abilities: 0, interventions: 0, injuries: 0, npcs: 0, bulletsSpent: 0, route: [] });
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const shuffle = <T,>(source: readonly T[]) => {
  const result = [...source];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const interventionCards: Record<InterventionId, { name: string; text: string; defense: string }> = {
  "false-alarm": { name: "Ложная тревога", text: "Известный тоннель цели выглядит непонятным до конца раунда.", defense: "Скептик или NPC-защитник отменяет эффект." },
  "cordon-tax": { name: "Укреплённый кордон", text: "Следующий кордон цели стоит на 1 патрон дороже.", defense: "Поддельный пропуск или способность Контрабандиста." },
  "switched-points": { name: "Переведённые стрелки", text: "Одно направление перед целью закрыто на этот раунд.", defense: "Путеец может открыть его своей способностью." },
  raid: { name: "Облава", text: "Цель показывает случайный предмет; подозрительный добавляет пошлину.", defense: "Пустой рюкзак, пропуск или Скептик." },
  "caravan-intercept": { name: "Перехват каравана", text: "Вы получаете разовый безопасный переход по соседнему направлению.", defense: "Это полезное вмешательство, защиты не требует." },
  "planted-evidence": { name: "Подброшенная улика", text: "Следующий шмон цели получает +1 к подозрительности.", defense: "Скептик или защитная услуга NPC." },
};
const interventionDeck = Object.keys(interventionCards) as InterventionId[];
const competitiveRoles: Record<string, { title: string; description: string; cooldown: string; range: string; counter: string }> = {
  mag: { title: "Предчувствие", description: "Посмотреть зафиксированное событие соседнего тоннеля, не входя в него.", cooldown: "раз в 2 раунда", range: "соседний тоннель", counter: "событие не становится публичным" },
  skeptic: { title: "Опровержение", description: "Автоматически отменяет одно направленное против вас вмешательство.", cooldown: "раз в 2 раунда", range: "на себя", counter: "после отмены защита уходит на перезарядку" },
  mother: { title: "Не разлучать", description: "Защитить себя и одного игрока на своей станции от задержки и разделения.", cooldown: "раз в 3 раунда", range: "одна станция", counter: "не защищает от ранений" },
  teen: { title: "Два сна", description: "При следующем новом испытании увидеть два варианта и получить менее опасный.", cooldown: "раз в 3 раунда", range: "на себя", counter: "работает только при первом раскрытии" },
  scientist: { title: "Расчёт обхода", description: "Потратить три знания и открыть соседнее закрытое направление на раунд.", cooldown: "за 3 знания", range: "соседний тоннель", counter: "в конце раунда закрытие вернётся" },
  medic: { title: "Полевое лечение", description: "Вернуть конечность себе или игроку на той же станции, не меняя план движения.", cooldown: "нужна аптечка", range: "одна станция", counter: "аптечка расходуется" },
  trackman: { title: "Аварийный проход", description: "Открыть одно соседнее закрытое направление до конца раунда.", cooldown: "раз в 2 раунда", range: "соседний тоннель", counter: "после шага мира тоннель закроется" },
  cartographer: { title: "Публичная отметка", description: "После прохода неизвестного тоннеля раскрыть его статус всем и получить 1 патрон.", cooldown: "пассивно", range: "пройденный тоннель", counter: "не действует на кордоны" },
  signalman: { title: "Эфир каравана", description: "Показать маршрут выбранного каравана на два его следующих шага.", cooldown: "раз в 2 раунда", range: "любой караван", counter: "караван может стоять один раунд" },
  shuttle: { title: "Дальняя сделка", description: "Предложить добровольный обмен предметом удалённому игроку.", cooldown: "раз в 2 раунда", range: "любой живой игрок", counter: "получатель должен подтвердить" },
  veteran: { title: "Бронепластина", description: "Автоматически отменить первую потерю конечности за игру.", cooldown: "один раз за игру", range: "на себя", counter: "после срабатывания защита исчерпана" },
  smuggler: { title: "Тихий проход", description: "Следующий кордон проходится бесплатно и без шмона.", cooldown: "раз в 3 раунда", range: "на себя", counter: "действует только на один кордон" },
};
const botProfiles = ["Спринтер", "Сборщик", "Осторожный"] as const;
const hostStorageKey = "golosa-expedition-host-room-v2";
const guestStorageKey = "golosa-expedition-guest-room-v1";
const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from({ length: 6 }, () => roomAlphabet[Math.floor(Math.random() * roomAlphabet.length)]).join("");
const makeClientId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const invitedRoomCode = () => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("room")?.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6) || "";
const brokerUrl = "wss://broker.emqx.io:8084/mqtt";
const roomNamespace = (code: string) => {
  let a = 2166136261;
  let b = 2246822519;
  for (const char of `golosa-room-v5:${code.toUpperCase()}`) {
    a = Math.imul(a ^ char.charCodeAt(0), 16777619);
    b = Math.imul(b ^ char.charCodeAt(0), 3266489917);
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
};
const roomTopic = (code: string, channel: "state" | "command") => `golosa-pod-moskvoy/v5/${roomNamespace(code)}/${channel}`;
const mqttId = () => `golosa_${Math.random().toString(36).slice(2, 17)}`;
/** MQTT нужен только в браузере: серверный рендер не умеет импортировать его Node-зависимости, поэтому модуль грузится лениво. */
const loadMqtt = () => import("mqtt").then((module) => module.default ?? module);
/** Каталог открытых комнат: хост держит здесь retained-запись, экран входа подписывается на `rooms/+`. */
const roomsDirectoryTopic = "golosa-pod-moskvoy/v5/rooms";
const roomListingTopic = (code: string) => `${roomsDirectoryTopic}/${code.toUpperCase()}`;
type RoomListing = { code: string; hostName: string; members: number; status: SharedRoom["status"]; updatedAt: number };
const listingTtl = 20000;
const listingFor = (room: SharedRoom): RoomListing => ({
  code: room.code,
  hostName: room.members.find((member) => member.clientId === room.hostClientId)?.name || "Создатель партии",
  members: room.members.filter((member) => member.connected).length,
  status: room.status,
  updatedAt: Date.now(),
});
const memberWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? "путник" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "путника" : "путников";

function edgeStatus(session: NetworkSession, edge: MetroEdge, position: string) {
  if (edge.type === "transfer") return "cordon";
  const direction = edge.source === position ? "forward" : "backward";
  return session.world.edges[`${edge.id}::${direction}`] || (scenarioEdgeMarks as Record<string, string>)[`${edge.id}::${direction}`] || "normal";
}

function laneStatus(session: NetworkSession, edge: MetroEdge, tunnelId: TunnelId) {
  return session.world.edges[`${edge.id}::${tunnelId}`] || (scenarioEdgeMarks as Record<string, string>)[`${edge.id}::${tunnelId}`] || "normal";
}

function passages(position: string, session: NetworkSession) {
  const ordinary = edges.flatMap((edge) => {
    if (edge.source !== position && edge.target !== position) return [];
    const target = edge.source === position ? edge.target : edge.source;
    if (edge.type === "transfer") return [{ edge, target, status: "cordon" }];
    const statuses = (["forward", "backward"] as const).map((tunnelId) => laneStatus(session, edge, tunnelId));
    const status = statuses.find((entry) => entry !== "closed");
    return status ? [{ edge, target, status }] : [];
  });
  const caravan = activeCaravansForRound(session.round).flatMap((entry) => {
    if (entry.resting || entry.stationId !== position) return [];
    const edge = edges.find((item) => (item.source === entry.stationId && item.target === entry.nextStationId) || (item.target === entry.stationId && item.source === entry.nextStationId));
    return edge ? [{ edge, target: entry.nextStationId, status: "caravan" }] : [];
  });
  return [...ordinary, ...caravan].filter((entry, index, array) => array.findIndex((other) => other.edge.id === entry.edge.id && other.target === entry.target) === index);
}

function distance(start: string, session: NetworkSession) {
  if (polisIds.has(start)) return 0;
  const queue: [string, number][] = [[start, 0]];
  const seen = new Set([start]);
  while (queue.length) {
    const [current, d] = queue.shift()!;
    for (const option of passages(current, session)) {
      if (seen.has(option.target)) continue;
      if (polisIds.has(option.target)) return d + 1;
      seen.add(option.target);
      queue.push([option.target, d + 1]);
    }
  }
  return 999;
}

function stationDistance(start: string, finish: string, session: NetworkSession) {
  if (start === finish) return 0;
  const queue: [string, number][] = [[start, 0]]; const seen = new Set([start]);
  while (queue.length) {
    const [current, length] = queue.shift()!;
    for (const option of passages(current, session)) {
      if (seen.has(option.target)) continue;
      if (option.target === finish) return length + 1;
      seen.add(option.target); queue.push([option.target, length + 1]);
    }
  }
  return 999;
}

function botStep(player: NetworkPlayer, session: NetworkSession) {
  return passages(player.position, session).sort((a, b) => distance(a.target, session) - distance(b.target, session))[0]?.target || null;
}

function addResource(player: NetworkPlayer, session: NetworkSession, report: string[]) {
  const resource = stationResources[player.position];
  if (resource?.kind === "rice") {
    const amount = session.time === "День" ? 2 : 1;
    player.bullets += amount;
    report.push(`${player.name}: +${amount} ◉ на станции.`);
  } else if (resource?.kind === "medkit") {
    player.inventory.push("medkit");
    report.push(`${player.name}: получена аптечка.`);
  } else if (resource?.kind === "wire") {
    player.inventory.push("wire");
    report.push(`${player.name}: получена проволока.`);
  } else {
    report.push(`${player.name}: локальная сцена без добычи.`);
  }
}

function cloneSession(session: NetworkSession): NetworkSession {
  return {
    ...session,
    players: session.players.map((player) => ({ ...player, inventory: [...player.inventory], lostLimbs: [...player.lostLimbs] })),
    world: {
      ...session.world,
      edges: { ...session.world.edges },
      tunnelEvents: { ...(session.world.tunnelEvents || {}) },
      npcPositions: { ...session.world.npcPositions },
      npcOwners: { ...session.world.npcOwners },
      npcServiceUsed: { ...session.world.npcServiceUsed },
    },
  };
}

function createExpedition(code: string, members: LobbyMember[]): Pick<SharedRoom, "save" | "playerByClient"> {
  const session = createDemoSession(code);
  session.status = "playing";
  session.playerCount = 12;
  session.gmMessage = "Компания людей и ботов движется к Полису без ведущей.";
  // География остаётся узнаваемой, а состояние направлений, NPC и фаза караванов меняются от партии к партии.
  edges.filter((edge) => edge.type !== "transfer").forEach((edge) => {
    (["forward", "backward"] as const).forEach((direction) => {
      const roll = Math.random();
      session.world.edges[`${edge.id}::${direction}`] = roll < .08 ? "closed" : roll < .30 ? "unknown" : roll < .42 ? "safe" : "normal";
    });
  });
  const selectedRoles = members.map((entry) => entry.roleId);
  const leftovers = roleCards.map((role) => role.id).filter((id) => !selectedRoles.includes(id));
  session.players = session.players.map((player, index) => {
    const human = index < members.length;
    const roleId = human ? members[index].roleId : leftovers[index - members.length];
    const roleIndex = roleCards.findIndex((role) => role.id === roleId);
    const base = createDemoSession().players[roleIndex];
    return {
      ...player,
      roleId,
      pair: Math.floor(index / 2) + 1,
      name: human ? members[index].name : botNames[index],
      position: human ? members[index].start : base.position,
      bullets: base.bullets * 3,
      inventory: [...base.inventory],
      onlineAt: human ? Date.now() : null,
    };
  });
  // Если жёсткая случайная блокировка отрезала старт, закрытия становятся неизвестными: путь остаётся, но риск сохраняется.
  if (session.players.some((player) => distance(player.position, session) >= 999)) {
    Object.entries(session.world.edges).forEach(([key, value]) => { if (value === "closed") session.world.edges[key] = "unknown"; });
  }
  const npcStations = shuffle(nodes.map((node) => node.id).filter((id) => !polisIds.has(id) && !starts.includes(id) && distance(id, session) >= 3 && distance(id, session) <= 10));
  npcCards.forEach((npc, index) => { session.world.npcPositions[npc.id] = npcStations[index % Math.max(1, npcStations.length)] || starts[index % starts.length]; });
  const humanIds = members.map((_, index) => index + 1);
  const stats = Object.fromEntries(session.players.map((player) => [player.id, { ...emptyStats(), visited: [player.position], route: [player.position] }]));
  const cards = Object.fromEntries(humanIds.map((id) => [id, shuffle(interventionDeck).slice(0, 2)]));
  const timerEnabled = true;
  return {
    playerByClient: Object.fromEntries(members.map((member, index) => [member.clientId, index + 1])),
    save: {
      session,
      humanIds,
      activeHuman: 0,
      phase: "planning",
      pendingTarget: null,
      pendingEdge: null,
      report: [],
      traversals: [],
      finishers: [],
      botControlledIds: [],
      stats,
      roleUses: {},
      version: 2,
      plans: {},
      encounters: {},
      interventionHands: cards,
      effects: [],
      tradeOffers: [],
      allianceOffers: [],
      finaleEndsAfterRound: null,
      initiativeOffset: 0,
      caravanOffset: Math.floor(Math.random() * 8),
      timerEnabled,
      planningEndsAt: Date.now() + 60000,
      originalHumanIds: humanIds,
      originalPlayerByClient: Object.fromEntries(members.map((member, index) => [member.clientId, index + 1])),
    takeoverOriginals: {},
      temporaryEdges: {},
      privateNotes: {},
    },
  };
}

function normalizedSave(save: ExpeditionSave): ExpeditionSave {
  const normalizeStats = (value?: Partial<PlayerStats>, position?: string): PlayerStats => ({
    ...emptyStats(), ...value,
    visited: [...(value?.visited || (position ? [position] : []))],
    knowledge: [...(value?.knowledge || [])],
    route: [...(value?.route || value?.visited || (position ? [position] : []))],
  });
  return {
    ...save,
    finishers: save.finishers || [],
    botControlledIds: save.botControlledIds || [],
    stats: Object.fromEntries(save.session.players.map((player) => [player.id, normalizeStats(save.stats?.[player.id], player.position)])),
    roleUses: save.roleUses || {},
    version: 2,
    plans: save.plans || {},
    encounters: save.encounters || {},
    interventionHands: save.interventionHands || Object.fromEntries(save.humanIds.map((id) => [id, shuffle(interventionDeck).slice(0, 2)])),
    effects: save.effects || [],
    tradeOffers: save.tradeOffers || [],
    allianceOffers: save.allianceOffers || [],
    finaleEndsAfterRound: save.finaleEndsAfterRound ?? null,
    initiativeOffset: save.initiativeOffset || 0,
    caravanOffset: save.caravanOffset || 0,
    timerEnabled: save.timerEnabled ?? true,
    planningEndsAt: save.planningEndsAt ?? (Date.now() + 60000),
    originalHumanIds: save.originalHumanIds || [...save.humanIds],
    originalPlayerByClient: save.originalPlayerByClient || {},
    takeoverOriginals: save.takeoverOriginals || {},
    temporaryEdges: save.temporaryEdges || {},
    privateNotes: save.privateNotes || {},
    session: {
      ...save.session,
      world: { ...save.session.world, tunnelEvents: { ...(save.session.world.tunnelEvents || {}) } },
    },
  };
}

function isOut(save: ExpeditionSave, player: NetworkPlayer) {
  return player.lostLimbs.length >= 4 || save.finishers.some((entry) => entry.playerId === player.id);
}

function addArrival(finishers: FinishRecord[], player: NetworkPlayer, round: number, report: string[]) {
  if (!polisIds.has(player.position) || finishers.some((entry) => entry.playerId === player.id)) return;
  const rank = finishers.length + 1;
  finishers.push({ playerId: player.id, rank, round });
  report.push(rank === 1 ? `${player.name} первым достиг Полиса — суперпобеда.` : rank <= 6 ? `${player.name} достиг Полиса ${rank}-м и победил.` : `${player.name} достиг Полиса ${rank}-м: путь завершён, но первая шестёрка уже внутри.`);
}

function moveOwnedNpcs(session: NetworkSession, player: NetworkPlayer) {
  Object.entries(session.world.npcOwners).forEach(([npcId, ownerId]) => {
    if (ownerId === player.id) session.world.npcPositions[npcId] = player.position;
  });
}

function injure(player: NetworkPlayer, report: string[]) {
  const limb = limbCycle.find((entry) => !player.lostLimbs.includes(entry));
  if (!limb) return;
  player.lostLimbs.push(limb);
  report.push(`${player.name} потерял конечность${player.lostLimbs.length >= 4 ? " и погиб." : "."}`);
}

function botRound(base: ExpeditionSave, session: NetworkSession, report: string[], finishers: FinishRecord[]) {
  const botIds = new Set(session.players.filter((player) => !base.humanIds.includes(player.id) || base.botControlledIds.includes(player.id)).map((player) => player.id));
  session.players.filter((player) => botIds.has(player.id)).forEach((bot) => {
    if (isOut({ ...base, finishers }, bot)) return;
    const shouldStay = Math.random() < 0.46 || (bot.lostLimbs.length > 0 && Math.random() < 0.62);
    if (shouldStay) {
      addResource(bot, session, report);
      return;
    }
    const target = botStep(bot, session);
    if (!target) {
      addResource(bot, session, report);
      return;
    }
    const passage = passages(bot.position, session).find((entry) => entry.target === target);
    if (!passage) return;
    if (passage.edge.type === "transfer") {
      const toll = cordonRules.calculate(1, session.time, getCordonProfile(passage.edge.id).price);
      if (bot.bullets < toll) {
        report.push(`${bot.name} не смог оплатить кордон и остался.`);
        addResource(bot, session, report);
        return;
      }
      bot.bullets -= toll;
      bot.position = target;
      moveOwnedNpcs(session, bot);
      report.push(`${bot.name} заплатил ${toll} ◉ на кордоне.`);
      addArrival(finishers, bot, session.round, report);
      return;
    }
    const caravan = activeCaravansForRound(session.round).some((entry) => !entry.resting && entry.stationId === bot.position && entry.nextStationId === target);
    const baseRisk = caravan ? 0 : passage.status === "safe" ? 0.06 : passage.status === "unknown" ? 0.22 : session.time === "Ночь" ? 0.2 : 0.12;
    const protective = bot.inventory.find((item) => ["wire", "chalk", "rope", "crowbar", "flashlight"].includes(item));
    const risk = protective ? baseRisk * 0.55 : baseRisk;
    if (Math.random() < risk) {
      if (protective) bot.inventory.splice(bot.inventory.indexOf(protective), 1);
      injure(bot, report);
      return;
    }
    bot.position = target;
    moveOwnedNpcs(session, bot);
    addArrival(finishers, bot, session.round, report);
  });
}

function finishTurn(baseInput: ExpeditionSave, outcome: Outcome): ExpeditionSave {
  const base = normalizedSave(baseInput);
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  const source = player.position;
  const report = [...base.report, outcome.note];
  const traversals = [...base.traversals];
  const finishers = [...base.finishers];
  const stats = Object.fromEntries(Object.entries(base.stats).map(([id, value]) => [Number(id), { ...value, visited: [...value.visited], knowledge: [...value.knowledge] }]));
  const roleUses = { ...base.roleUses };
  if (outcome.move && base.pendingTarget) {
    player.position = base.pendingTarget;
    moveOwnedNpcs(session, player);
    traversals.push({ source, target: base.pendingTarget, playerId: player.id });
    stats[player.id] ||= emptyStats();
    stats[player.id].tunnels += 1;
    if (!stats[player.id].visited.includes(player.position)) stats[player.id].visited.push(player.position);
    const traversed = edges.find((edge) => edge.id === base.pendingEdge);
    if (player.roleId === "cartographer" && traversed && edgeStatus(base.session, traversed, source) === "unknown") {
      session.world.edges[`${traversed.id}::forward`] = "normal";
      session.world.edges[`${traversed.id}::backward`] = "normal";
      report.push("Картограф сделал неизвестный перегон общедоступным.");
    }
    addArrival(finishers, player, session.round, report);
  }
  if (outcome.injury) {
    const veteranKey = `veteran:${player.id}`;
    if (player.roleId === "veteran" && roleUses[veteranKey] !== session.round) {
      roleUses[veteranKey] = session.round;
      report.push("Бронепластина Ветерана приняла удар; конечность сохранена.");
    } else injure(player, report);
  }
  if (outcome.reward) {
    player.inventory.push(outcome.reward);
    report.push(`Получен предмет: ${itemNames[outcome.reward] || outcome.reward}.`);
  }
  const draft = { ...base, session, traversals, finishers, stats, roleUses, report };
  const nextHuman = base.humanIds.findIndex((id, index) => index > base.activeHuman && !base.botControlledIds.includes(id) && !isOut(draft, session.players[id - 1]));
  if (nextHuman >= 0) return { ...draft, activeHuman: nextHuman, phase: "planning", pendingTarget: null, pendingEdge: null };
  botRound(draft, session, report, finishers);
  session.activeChallenge = null;
  const allHumansDone = base.humanIds.every((id) => base.botControlledIds.includes(id) || isOut({ ...draft, finishers }, session.players[id - 1]));
  return { ...draft, session, activeHuman: 0, phase: allHumansDone ? "finished" : "summary", pendingTarget: null, pendingEdge: null, report: report.slice(0, 18), traversals: [], finishers };
}

function choosePath(base: ExpeditionSave, target: string | null, edgeId?: string): ExpeditionSave {
  if (base.phase !== "planning") return base;
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  if (!target) {
    const report: string[] = [];
    const stats = base.stats[player.id] || emptyStats();
    const resource = stationResources[player.position];
    if (player.roleId === "scientist" && resource?.kind !== "rice" && !stats.knowledge.includes(player.position)) {
      const nextStats = { ...base.stats, [player.id]: { ...stats, knowledge: [...stats.knowledge, player.position] } };
      player.inventory.push(`knowledge:${player.position}`);
      return finishTurn({ ...base, session, stats: nextStats }, { move: false, note: `${player.name} получил карту знания на станции ${nodeById.get(player.position)?.name}.` });
    }
    addResource(player, session, report);
    return finishTurn({ ...base, session }, { move: false, note: report.join(" ") || `${player.name} остался на станции.` });
  }
  const passage = passages(player.position, session).find((entry) => entry.target === target && entry.edge.id === edgeId);
  if (!passage) return base;
  const pending = { ...base, session, pendingTarget: target, pendingEdge: passage.edge.id };
  if (passage.edge.type === "transfer") {
    const smugglerKey = `smuggler:${player.id}`;
    if (player.roleId === "smuggler" && base.roleUses[smugglerKey] !== session.round) {
      return finishTurn({ ...pending, roleUses: { ...base.roleUses, [smugglerKey]: session.round } }, { move: true, note: `${player.name} провёл группу через кордон по тайному ходу без пошлины.` });
    }
    return { ...pending, phase: "cordon", report: [...base.report, `Перед ${player.name} межлинейный кордон.`] };
  }
  const caravan = activeCaravansForRound(session.round).find((entry) => !entry.resting && entry.stationId === player.position && entry.nextStationId === target);
  if (caravan) {
    const reward = Math.random() < 0.5 ? rewards[Math.floor(Math.random() * rewards.length)] : undefined;
    return finishTurn(pending, { move: true, reward, note: `${player.name} прошёл с караваном «${caravan.name}». Испытания не было.` });
  }
  const companion = base.traversals.find((entry) => entry.source === player.position && entry.target === target);
  if (companion) return finishTurn(pending, { move: true, note: `${player.name} присоединился к попутчику и безопасно прошёл тоннель.` });
  const npcPass = player.inventory.indexOf("npc_pass");
  if (npcPass >= 0) {
    player.inventory.splice(npcPass, 1);
    return finishTurn(pending, { move: true, note: `${player.name} использовал помощь NPC и безопасно прошёл тоннель.` });
  }
  const eventKey = directedTunnelEventKey(passage.edge, player.position, target);
  if (!eventKey) return base;
  const remembered = Boolean(session.world.tunnelEvents[eventKey]);
  const eventId = revealTunnelEvent(session.world.tunnelEvents, eventKey, passage.status);
  if (eventId === quietTunnelEvent) {
    return finishTurn(pending, { move: true, note: remembered ? "Знакомый тихий тоннель снова пропустил путника без испытания." : "Тоннель оказался тихим и останется таким до конца этой партии." });
  }
  session.activeChallenge = eventId;
  return { ...pending, session, phase: "challenge", report: [...base.report, remembered ? "Знакомое событие тоннеля повторилось." : "Карта события открыта и закреплена за этим тоннелем до конца партии."] };
}

function resolveCordon(baseInput: ExpeditionSave, mode: "pay" | "inspection" | "pass" | "retreat"): ExpeditionSave {
  const base = normalizedSave(baseInput);
  if (base.phase !== "cordon" || !base.pendingEdge) return base;
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  const profile = getCordonProfile(base.pendingEdge);
  const toll = cordonRules.calculate(1, session.time, profile.price);
  if (mode === "retreat") return finishTurn({ ...base, session }, { move: false, note: `${player.name} отказался от условий кордона и вернулся.` });
  if (mode === "pass") {
    const passIndex = player.inventory.indexOf("pass");
    if (passIndex < 0) return base;
    player.inventory.splice(passIndex, 1);
    return finishTurn({ ...base, session }, { move: true, note: `${player.name} предъявил разовый пропуск и прошёл кордон без оплаты.` });
  }
  if (mode === "inspection") {
    if (!profile.inspection) return base;
    const found = player.inventory.map((item) => ({ item, risk: itemInspectionRisk[item] || 0 })).sort((a, b) => b.risk - a.risk)[0];
    const surcharge = found?.risk || 0;
    if (player.bullets < surcharge) return finishTurn({ ...base, session }, { move: false, note: `После шмона потребовали ${surcharge} ◉, но патронов не хватило.` });
    player.bullets -= surcharge;
    return finishTurn({ ...base, session }, { move: true, note: surcharge ? `Шмон обнаружил «${itemNames[found.item] || found.item}»: ${player.name} доплатил ${surcharge} ◉.` : `Шмон ничего подозрительного не нашёл. ${player.name} прошёл бесплатно.` });
  }
  if (profile.inspection) return base;
  if (player.bullets < toll) return finishTurn({ ...base, session }, { move: false, note: `На кордон нужно ${toll} ◉. Патронов не хватило.` });
  player.bullets -= toll;
  return finishTurn({ ...base, session }, { move: true, note: `${player.name} заплатил ${toll} ◉ и прошёл кордон без досмотра.` });
}

function resolveChallenge(base: ExpeditionSave, optionId: string): ExpeditionSave {
  if (base.phase !== "challenge") return base;
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  const option = (challengeSolutions[session.activeChallenge || ""] || []).filter((entry) => !entry.roleIds?.length).find((entry) => entry.id === optionId);
  if (!option) return base;
  const item = option.itemIds?.find((id) => player.inventory.includes(id));
  if (option.itemIds?.length && !item) return base;
  if (option.bulletCost && player.bullets < option.bulletCost) return base;
  if (option.bulletCost) player.bullets -= option.bulletCost;
  if (item && option.consumeItem) player.inventory.splice(player.inventory.indexOf(item), 1);
  if (option.outcome === "retreat") return finishTurn({ ...base, session }, { move: false, note: `${player.name}: отступление без ранения.` });
  const failure = option.outcome === "risk" ? 0.48 : item ? 0.18 : option.bulletCost ? 0.12 : 0.3;
  const success = Math.random() >= failure;
  if (success && option.rewardBullets) player.bullets += option.rewardBullets;
  const reward = success && option.outcome === "reward" ? option.rewardItem || rewards[Math.floor(Math.random() * rewards.length)] : undefined;
  return finishTurn({ ...base, session }, { move: success, injury: !success, reward, note: success ? `${option.label}: получилось${option.rewardBullets ? `, найдено ${option.rewardBullets} ◉` : ""}.` : `${option.label}: тоннель оказался сильнее.` });
}

function nextRound(baseInput: ExpeditionSave): ExpeditionSave {
  const base = normalizedSave(baseInput);
  const session = cloneSession(base.session);
  if (base.version === 2) {
    Object.entries(base.temporaryEdges || {}).forEach(([key, status]) => { session.world.edges[key] = status as "normal" | "safe" | "unknown" | "closed"; });
    session.round += 1;
    session.time = timeCycle[(timeCycle.indexOf(session.time) + 1) % timeCycle.length];
    session.activeChallenge = null;
    return {
      ...base, session, phase: "planning", plans: {}, encounters: {}, report: [], traversals: [], temporaryEdges: {},
      effects: (base.effects || []).filter((effect) => effect.round >= session.round),
      initiativeOffset: ((base.initiativeOffset || 0) + 1) % 12,
      planningEndsAt: base.timerEnabled ? Date.now() + 60000 : null,
      allianceOffers: (base.allianceOffers || []).filter((offer) => offer.status === "pending" && offer.round >= session.round),
    };
  }
  session.round += 1;
  session.time = timeCycle[(timeCycle.indexOf(session.time) + 1) % timeCycle.length];
  session.activeChallenge = null;
  const firstHuman = base.humanIds.findIndex((id) => !base.botControlledIds.includes(id) && !isOut(base, session.players[id - 1]));
  if (firstHuman < 0) return { ...base, session, phase: "finished", report: [...base.report, "Путь всех людей завершён."] };
  return { ...base, session, activeHuman: firstHuman, phase: "planning", pendingTarget: null, pendingEdge: null, report: [], traversals: [] };
}

function updatePlayerInventory(baseInput: ExpeditionSave, sourcePlayerId: number, command: Extract<RoomCommand, { type: "use-item" | "discard-item" | "give-item" }>): ExpeditionSave {
  const base = normalizedSave(baseInput);
  const session = cloneSession(base.session);
  const player = session.players[sourcePlayerId - 1];
  if (!player || isOut(base, player)) return base;
  const itemIndex = player.inventory.indexOf(command.itemId);
  if (itemIndex < 0) return base;
  const report = [...base.report];
  const stats = Object.fromEntries(Object.entries(base.stats).map(([id, value]) => [Number(id), { ...value, visited: [...value.visited], knowledge: [...value.knowledge] }]));
  if (command.type === "use-item") {
    if (command.itemId !== "medkit" || player.lostLimbs.length === 0) return base;
    player.inventory.splice(itemIndex, 1);
    const restored = player.lostLimbs.pop();
    report.push(`${player.name} использовал аптечку и восстановил конечность (${restored}).`);
  } else if (command.type === "discard-item") {
    player.inventory.splice(itemIndex, 1);
    report.push(`${player.name} выбросил предмет «${itemNames[command.itemId] || command.itemId}».`);
  } else {
    const target = session.players[command.targetPlayerId - 1];
    if (!target || target.position !== player.position || isOut(base, target)) return base;
    player.inventory.splice(itemIndex, 1);
    if (player.roleId === "medic" && command.itemId === "medkit" && target.lostLimbs.length > 0) {
      target.lostLimbs.pop();
      stats[player.id] ||= emptyStats();
      stats[player.id].healed += 1;
      report.push(`${player.name} вылечил конечность игроку ${target.name}.`);
    } else {
      target.inventory.push(command.itemId);
      report.push(`${player.name} передал «${itemNames[command.itemId] || command.itemId}» игроку ${target.name}.`);
    }
  }
  return { ...base, session, report, stats };
}

function updateNpc(baseInput: ExpeditionSave, sourcePlayerId: number, command: Extract<RoomCommand, { type: "recruit-npc" | "use-npc" }>): ExpeditionSave {
  const base = normalizedSave(baseInput);
  const session = cloneSession(base.session);
  const player = session.players[sourcePlayerId - 1];
  const npc = npcCards.find((entry) => entry.id === command.npcId);
  if (!player || !npc || isOut(base, player)) return base;
  const report = [...base.report];
  const stats = cloneStats(base.stats);
  if (command.type === "recruit-npc") {
    if (session.world.npcOwners[npc.id] != null || session.world.npcPositions[npc.id] !== player.position || player.bullets < npc.price) return base;
    player.bullets -= npc.price;
    session.world.npcOwners[npc.id] = player.id;
    stats[player.id].npcs += 1;
    stats[player.id].bulletsSpent += npc.price;
    report.push(`${player.name} нанял NPC «${npc.name}» за ${npc.price} ◉.`);
    return { ...base, session, report, stats };
  }
  if (session.world.npcOwners[npc.id] !== player.id || session.world.npcServiceUsed[npc.id]) return base;
  session.world.npcServiceUsed[npc.id] = true;
  if (/возвращает одну руку|возвращает одну.*ногу|восстанавливает/i.test(npc.service) && player.lostLimbs.length) {
    player.lostLimbs.pop();
    report.push(`${npc.name} восстановил конечность игроку ${player.name}.`);
  } else if (/открыва|закрыт|ремонт/i.test(npc.service)) {
    const candidate = edges.flatMap((entry) => entry.type !== "transfer" && (entry.source === player.position || entry.target === player.position) ? (["forward", "backward"] as const).map((tunnelId) => ({ edge: entry, tunnelId })) : []).find(({ edge, tunnelId }) => laneStatus(session, edge, tunnelId) === "closed");
    if (candidate) {
      session.world.edges[`${candidate.edge.id}::${candidate.tunnelId}`] = "unknown";
      report.push(`${npc.name} открыл соседний тоннель ${candidate.tunnelId === "backward" ? "B" : "A"} до непонятного статуса.`);
    } else player.inventory.push("npc_pass");
  } else if (/аптечк/i.test(npc.service)) {
    player.inventory.push("medkit");
    report.push(`${npc.name} выдал аптечку.`);
  } else if (/кордон|пошлин|пропуск/i.test(npc.service)) {
    player.inventory.push("npc_pass");
    report.push(`${npc.name} подготовил бесплатный проход через кордон.`);
  } else if (/защит|конфиск|крад/i.test(npc.service)) {
    player.inventory.push("npc_protection");
    report.push(`${npc.name} поставил защитную метку на следующий предмет.`);
  } else if (/караван/i.test(npc.service)) {
    player.inventory.push("npc_caravan");
    report.push(`${npc.name} вызвал караванный жетон безопасного прохода.`);
  } else if (/событ|предупреж|тоннел/i.test(npc.service)) {
    const edge = edges.find((entry) => entry.type !== "transfer" && (entry.source === player.position || entry.target === player.position));
    if (edge) {
      const tunnelId = (["forward", "backward"] as const).find((candidate) => !session.world.tunnelEvents[`${edge.id}::${candidate}`]) || "forward";
      const key = `${edge.id}::${tunnelId}`;
      revealTunnelEvent(session.world.tunnelEvents, key, laneStatus(session, edge, tunnelId));
      report.push(`${npc.name} разведал соседний тоннель.`);
    }
  } else if (/вмешатель|конфликт/i.test(npc.service)) {
    const effects = (base.effects || []).filter((effect) => effect.targetId !== player.id || effect.round !== session.round);
    report.push(`${npc.name} отменил направленное вмешательство.`);
    return { ...base, session, report, stats, effects };
  } else if (/крад|забира/i.test(npc.service)) {
    const victim = session.players.find((entry) => entry.id !== player.id && entry.position === player.position && entry.inventory.length);
    if (victim) player.inventory.push(victim.inventory.pop()!);
    report.push(`${npc.name} добыл чужой предмет.`);
  } else if (/час|фаз|время/i.test(npc.service)) {
    session.time = timeCycle[(timeCycle.indexOf(session.time) + 1) % timeCycle.length];
    report.push(`${npc.name} сдвинул время на следующую фазу.`);
  } else if (/патрон/i.test(npc.service)) {
    player.bullets += 3;
    report.push(`${npc.name} принёс 3 ◉.`);
  } else {
    player.inventory.push("npc_pass");
    report.push(`${npc.name} подготовил безопасный проход через следующий тоннель.`);
  }
  return { ...base, session, report, stats };
}

function applyRoleAction(baseInput: ExpeditionSave, sourcePlayerId: number, edgeId?: string): ExpeditionSave {
  const base = normalizedSave(baseInput);
  const session = cloneSession(base.session);
  const player = session.players[sourcePlayerId - 1];
  const edge = edges.find((entry) => entry.id === edgeId && (entry.source === player?.position || entry.target === player?.position));
  if (!player || !edge) return base;
  const key = `${player.roleId}:${player.id}`;
  if (base.roleUses[key] === session.round) return base;
  const status = edgeStatus(session, edge, player.position);
  const report = [...base.report];
  if (player.roleId === "mag") {
    if (!(["Вечер", "Ночь"] as SessionTime[]).includes(session.time) || status !== "unknown") return base;
    session.world.edges[`${edge.id}::forward`] = "normal";
    session.world.edges[`${edge.id}::backward`] = "normal";
    report.push(`${player.name} увидел, что неизвестный перегон проходим.`);
  } else if (player.roleId === "trackman") {
    if (status !== "closed" && status !== "unknown") return base;
    session.world.edges[`${edge.id}::forward`] = "normal";
    session.world.edges[`${edge.id}::backward`] = "normal";
    report.push(`${player.name} восстановил соседний перегон.`);
  } else return base;
  return { ...base, session, report, roleUses: { ...base.roleUses, [key]: session.round } };
}

function botTakeover(baseInput: ExpeditionSave, playerId: number): ExpeditionSave {
  const base = normalizedSave(baseInput);
  if (!base.humanIds.includes(playerId) || base.botControlledIds.includes(playerId)) return base;
  const nextBotControlled = [...base.botControlledIds, playerId];
  const report = [...base.report, `${base.session.players[playerId - 1]?.name} временно передан боту.`];
  const draft = { ...base, botControlledIds: nextBotControlled, report };
  if (base.humanIds[base.activeHuman] !== playerId) return draft;
  const nextHuman = base.humanIds.findIndex((id, index) => index > base.activeHuman && !nextBotControlled.includes(id) && !isOut(draft, base.session.players[id - 1]));
  if (nextHuman >= 0) return { ...draft, activeHuman: nextHuman, phase: "planning", pendingTarget: null, pendingEdge: null };
  const session = cloneSession(base.session);
  const finishers = [...base.finishers];
  botRound(draft, session, report, finishers);
  return { ...draft, session, finishers, activeHuman: 0, phase: "summary", pendingTarget: null, pendingEdge: null, traversals: [] };
}

function cloneStats(stats: Record<number, PlayerStats>) {
  return Object.fromEntries(Object.entries(stats).map(([id, value]) => [Number(id), {
    ...emptyStats(), ...value, visited: [...value.visited], knowledge: [...value.knowledge], route: [...(value.route || value.visited)],
  }])) as Record<number, PlayerStats>;
}

function caravansFor(save: ExpeditionSave) {
  return activeCaravansForRound(save.session.round + (save.caravanOffset || 0));
}

function competitivePassages(save: ExpeditionSave, player: NetworkPlayer): CompetitivePassage[] {
  const ordinary: CompetitivePassage[] = [];
  for (const edge of edges) {
    if (edge.source !== player.position && edge.target !== player.position) continue;
    const target = edge.source === player.position ? edge.target : edge.source;
    if (edge.type === "transfer") { ordinary.push({ edge, target, status: "cordon", tunnelId: null }); continue; }
    for (const tunnelId of ["forward", "backward"] as const) {
      let status = laneStatus(save.session, edge, tunnelId);
      const blocked = save.effects?.some((effect) => effect.type === "switched-points" && effect.targetId === player.id && effect.edgeId === edge.id && effect.round === save.session.round);
      if (blocked) status = "closed";
      const falseAlarm = save.effects?.some((effect) => effect.type === "false-alarm" && effect.targetId === player.id && effect.edgeId === edge.id && effect.round === save.session.round);
      if (falseAlarm && status !== "closed") status = "unknown";
      if (status !== "closed") ordinary.push({ edge, target, status, tunnelId });
    }
  }
  const caravan: CompetitivePassage[] = caravansFor(save).flatMap((entry) => {
    if (entry.resting || entry.stationId !== player.position) return [] as CompetitivePassage[];
    const edge = edges.find((item) => (item.source === entry.stationId && item.target === entry.nextStationId) || (item.target === entry.stationId && item.source === entry.nextStationId));
    return edge ? [{ edge, target: entry.nextStationId, status: "caravan", tunnelId: null }] : [] as CompetitivePassage[];
  });
  return [...ordinary, ...caravan].filter((entry, index, list) => list.findIndex((other) => other.edge.id === entry.edge.id && other.target === entry.target && other.tunnelId === entry.tunnelId && other.status === entry.status) === index);
}

function knownEventRisk(save: ExpeditionSave, player: NetworkPlayer, option: ReturnType<typeof competitivePassages>[number]) {
  if (option.status === "caravan" || option.status === "safe") return 0;
  const key = option.edge.type === "transfer" ? null : `${option.edge.id}::${option.tunnelId || "forward"}`;
  const known = key ? save.session.world.tunnelEvents[key] : null;
  if (!known || known === quietTunnelEvent) return known === quietTunnelEvent ? -.6 : 0;
  return .8;
}

function botPlan(save: ExpeditionSave, player: NetworkPlayer): PlannedAction {
  const profile = botProfiles[(player.id - 1) % botProfiles.length];
  const options = competitivePassages(save, player);
  const hurt = player.lostLimbs.length;
  const stayChance = profile === "Спринтер" ? .16 : profile === "Сборщик" ? .27 : .24 + hurt * .12;
  if (!options.length || Math.random() < stayChance) return { kind: "stay" };
  const resource = stationResources[player.position];
  if (profile === "Сборщик" && resource && Math.random() < .34) return { kind: "stay" };
  const ranked = options.map((option) => {
    const progress = distance(player.position, save.session) - distance(option.target, save.session);
    const cordon = option.edge.type === "transfer" ? (player.bullets < getCordonProfile(option.edge.id).price ? -8 : -1.2) : 0;
    const caravan = option.status === "caravan" ? 3 : 0;
    const risk = knownEventRisk(save, player, option) * (profile === "Осторожный" ? 2.2 : profile === "Спринтер" ? .7 : 1.2);
    const targetResource = stationResources[option.target]?.kind === "rice" ? .25 : stationResources[option.target] ? .65 : 0;
    return { option, score: progress * 3 + caravan + cordon + targetResource - risk + Math.random() * 1.4 };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0]?.option;
  return best ? { kind: "move", target: best.target, edgeId: best.edge.id, tunnelId: best.tunnelId } : { kind: "stay" };
}

function applyStationAction(player: NetworkPlayer, save: ExpeditionSave, report: string[], stats: Record<number, PlayerStats>) {
  const resource = stationResources[player.position];
  if (player.roleId === "scientist" && resource?.kind !== "rice" && !stats[player.id].knowledge.includes(player.position)) {
    stats[player.id].knowledge.push(player.position);
    player.inventory.push(`knowledge:${player.position}`);
    report.push(`${player.name} записал знание станции.`);
    return;
  }
  addResource(player, save.session, report);
}

function recordMove(player: NetworkPlayer, source: string, target: string, save: ExpeditionSave, report: string[], stats: Record<number, PlayerStats>, traversals: ExpeditionSave["traversals"], tunnelId: TunnelId | null = null) {
  player.position = target;
  moveOwnedNpcs(save.session, player);
  traversals.push({ source, target, playerId: player.id });
  const stat = stats[player.id] ||= emptyStats();
  stat.tunnels += 1;
  stat.route.push(target);
  if (!stat.visited.includes(target)) stat.visited.push(target);
  const edge = edges.find((entry) => (entry.source === source && entry.target === target) || (entry.target === source && entry.source === target));
  if (player.roleId === "cartographer" && edge && tunnelId && laneStatus(save.session, edge, tunnelId) === "unknown") {
    save.session.world.edges[`${edge.id}::${tunnelId}`] = "normal";
    player.bullets += 1;
    report.push(`${player.name} опубликовал разведку тоннеля и получил 1 ◉.`);
  }
}

function applyInjury(player: NetworkPlayer, save: ExpeditionSave, report: string[], stats: Record<number, PlayerStats>) {
  const veteranKey = `veteran-used:${player.id}`;
  if (player.roleId === "veteran" && !save.roleUses[veteranKey]) {
    save.roleUses[veteranKey] = save.session.round;
    report.push(`${player.name}: бронепластина отменила потерю конечности.`);
    return;
  }
  const before = player.lostLimbs.length;
  injure(player, report);
  if (player.lostLimbs.length > before) stats[player.id].injuries += 1;
}

function addRoundArrivals(save: ExpeditionSave, report: string[]) {
  const arrived = save.session.players.filter((player) => polisIds.has(player.position) && !save.finishers.some((entry) => entry.playerId === player.id));
  if (!arrived.length) return;
  const rank = save.finishers.length + 1;
  arrived.forEach((player) => {
    save.finishers.push({ playerId: player.id, rank, round: save.session.round });
    report.push(rank === 1 ? `${player.name} первым достиг Полиса!` : `${player.name} достиг Полиса: место ${rank}.`);
  });
  if (save.finaleEndsAfterRound == null) {
    save.finaleEndsAfterRound = save.session.round + 2;
    report.push(`Начались два заключительных раунда. Остальные ещё могут добраться до Полиса.`);
  }
}

function finishCompetitiveRound(input: ExpeditionSave): ExpeditionSave {
  const save = normalizedSave(input);
  const report = [...save.report];
  addRoundArrivals(save, report);
  const finished = save.finaleEndsAfterRound != null && save.session.round >= save.finaleEndsAfterRound;
  return { ...save, phase: finished ? "finished" : "summary", report: report.slice(-28), plans: {}, encounters: {}, planningEndsAt: null };
}

function resolvePlannedRound(input: ExpeditionSave): ExpeditionSave {
  const base = normalizedSave(input);
  const save: ExpeditionSave = { ...base, session: cloneSession(base.session), stats: cloneStats(base.stats), finishers: [...base.finishers], traversals: [], roleUses: { ...base.roleUses }, encounters: {}, report: [] };
  const report = save.report;
  const stats = save.stats;
  const plans = { ...(save.plans || {}) };
  const botIds = save.session.players.filter((player) => !save.humanIds.includes(player.id) || save.botControlledIds.includes(player.id)).map((player) => player.id);
  botIds.forEach((id) => {
    const player = save.session.players[id - 1];
    if (!isOut(save, player)) plans[id] = botPlan(save, player);
  });
  const ordered = [...save.session.players].sort((a, b) => ((a.id - 1 - (save.initiativeOffset || 0) + 12) % 12) - ((b.id - 1 - (save.initiativeOffset || 0) + 12) % 12));
  ordered.forEach((player) => {
    if (isOut(save, player)) return;
    if (Object.values(save.encounters || {}).some((encounter) => encounter.companionId === player.id)) return;
    const action = plans[player.id] || { kind: "stay" };
    if (action.kind === "stay") { applyStationAction(player, save, report, stats); return; }
    const source = player.position;
    const option = competitivePassages(save, player).find((entry) => entry.target === action.target && entry.edge.id === action.edgeId && (entry.edge.type === "transfer" || entry.status === "caravan" || entry.tunnelId === (action.tunnelId || "forward")));
    if (!option) { report.push(`${player.name}: выбранный путь закрылся; путник остался на станции.`); applyStationAction(player, save, report, stats); return; }
    const acceptedAlliance = save.allianceOffers?.some((offer) => offer.status === "accepted" && offer.round === save.session.round && offer.edgeId === action.edgeId && (offer.fromId === player.id || offer.toId === player.id));
    const intercepted = save.effects?.some((effect) => effect.type === "caravan-intercept" && effect.targetId === player.id && effect.round === save.session.round);
    const npcPass = player.inventory.indexOf("npc_pass");
    if (option.edge.type === "transfer") {
      const smugglerPass = save.roleUses[`smuggler-pass:${player.id}`] === save.session.round;
      const profile = getCordonProfile(option.edge.id);
      const extra = save.effects?.filter((effect) => effect.targetId === player.id && effect.round === save.session.round && ["cordon-tax", "planted-evidence", "raid"].includes(effect.type)).length || 0;
      const inspection = profile.inspection ? Math.max(0, ...player.inventory.map((item) => itemInspectionRisk[item] || 0)) + extra : extra;
      const toll = smugglerPass || npcPass >= 0 ? 0 : cordonRules.calculate(1, save.session.time, profile.price, inspection);
      if (npcPass >= 0) player.inventory.splice(npcPass, 1);
      if (player.bullets < toll) { report.push(`${player.name}: не хватило ${toll} ◉ на кордон; ход стал отдыхом.`); applyStationAction(player, save, report, stats); return; }
      player.bullets -= toll; stats[player.id].bulletsSpent += toll;
      report.push(`${player.name} прошёл ${profile.title.toLowerCase()}${toll ? ` за ${toll} ◉` : " бесплатно"}.`);
      recordMove(player, source, action.target, save, report, stats, save.traversals, null);
      return;
    }
    const caravan = option.status === "caravan";
    if (caravan || intercepted) {
      recordMove(player, source, action.target, save, report, stats, save.traversals, option.tunnelId);
      report.push(`${player.name}: безопасный проход ${caravan ? "с караваном" : "по перехваченному маршруту"}.`);
      return;
    }
    const key = `${option.edge.id}::${option.tunnelId || "forward"}`;
    const firstReveal = Boolean(key && !save.session.world.tunnelEvents[key]);
    const challengeId = key ? revealTunnelEvent(save.session.world.tunnelEvents, key, option.status) : quietTunnelEvent;
    if (challengeId === quietTunnelEvent) { recordMove(player, source, action.target, save, report, stats, save.traversals, option.tunnelId); report.push(`${player.name}: тихий тоннель, проход свободен.`); return; }
    const isBot = botIds.includes(player.id);
    if (isBot) {
      const protective = player.inventory.find((item) => ["wire", "chalk", "rope", "crowbar", "flashlight"].includes(item));
      const risk = (option.status === "unknown" ? .27 : .17) * (protective ? .55 : 1);
      if (Math.random() < risk) applyInjury(player, save, report, stats);
      else recordMove(player, source, action.target, save, report, stats, save.traversals, option.tunnelId);
      return;
    }
    let alternatives: string[] | undefined;
    if (firstReveal && player.roleId === "teen" && save.roleUses[`teen-ready:${player.id}`] === save.session.round) {
      const other = shuffle(challengeCards.filter((card) => card.id !== challengeId && card.id !== "people-01"))[0]?.id;
      if (other) alternatives = [challengeId, other];
    }
    const alliance = acceptedAlliance ? save.allianceOffers?.find((offer) => offer.status === "accepted" && offer.round === save.session.round && offer.edgeId === action.edgeId && (offer.fromId === player.id || offer.toId === player.id)) : undefined;
    const companionId = alliance ? (alliance.fromId === player.id ? alliance.toId : alliance.fromId) : undefined;
    const companionPlan = companionId ? plans[companionId] : undefined;
    save.encounters![player.id] = { playerId: player.id, source, target: action.target, edgeId: action.edgeId, tunnelId: option.tunnelId, challengeId, alternatives, companionId: companionPlan?.kind === "move" && companionPlan.edgeId === action.edgeId && companionPlan.target === action.target && companionPlan.tunnelId === action.tunnelId ? companionId : undefined, resolved: false };
  });
  if (!Object.keys(save.encounters || {}).length) return finishCompetitiveRound(save);
  return { ...save, plans, phase: "encounters", report: [...report, "Движение раскрыто. Игроки с испытаниями отвечают одновременно."] };
}

function submitPlan(input: ExpeditionSave, playerId: number, action: PlannedAction): ExpeditionSave {
  const save = normalizedSave(input);
  if (save.phase !== "planning" || save.botControlledIds.includes(playerId) || isOut(save, save.session.players[playerId - 1])) return save;
  if (action.kind === "move" && !competitivePassages(save, save.session.players[playerId - 1]).some((entry) => entry.edge.id === action.edgeId && entry.target === action.target)) return save;
  const plans = { ...(save.plans || {}), [playerId]: action };
  const waiting = save.humanIds.filter((id) => !save.botControlledIds.includes(id) && !isOut(save, save.session.players[id - 1]));
  const next = { ...save, plans };
  return waiting.every((id) => plans[id]) ? resolvePlannedRound(next) : next;
}

function resolveCompetitiveEncounter(input: ExpeditionSave, playerId: number, optionId: string): ExpeditionSave {
  const save = normalizedSave(input);
  if (save.phase !== "encounters") return save;
  const encounter = save.encounters?.[playerId];
  if (!encounter || encounter.resolved) return save;
  if (optionId.startsWith("event:")) {
    const picked = optionId.slice(6);
    if (!encounter.alternatives?.includes(picked)) return save;
    return { ...save, encounters: { ...save.encounters, [playerId]: { ...encounter, challengeId: picked, alternatives: undefined } } };
  }
  const option = (challengeSolutions[encounter.challengeId] || []).filter((entry) => !entry.roleIds?.length).find((entry) => entry.id === optionId);
  if (!option) return save;
  const session = cloneSession(save.session);
  const player = session.players[playerId - 1];
  const item = option.itemIds?.find((id) => player.inventory.includes(id));
  if (option.itemIds?.length && !item) return save;
  if (option.bulletCost && player.bullets < option.bulletCost) return save;
  if (item) player.inventory.splice(player.inventory.indexOf(item), 1);
  if (option.bulletCost) { player.bullets -= option.bulletCost; save.stats[playerId].bulletsSpent += option.bulletCost; }
  const failure = option.outcome === "risk" ? .48 : item ? .18 : option.bulletCost ? .12 : option.outcome === "retreat" ? 0 : .30;
  const success = option.outcome !== "retreat" && Math.random() >= failure;
  const report = [...save.report];
  const stats = cloneStats(save.stats);
  const draft = { ...save, session, stats, report, roleUses: { ...save.roleUses }, traversals: [...save.traversals] };
  if (success) {
    recordMove(player, encounter.source, encounter.target, draft, report, stats, draft.traversals, encounter.tunnelId || null);
    if (encounter.companionId) {
      const companion = session.players[encounter.companionId - 1];
      if (companion.position === encounter.source) recordMove(companion, encounter.source, encounter.target, draft, report, stats, draft.traversals, encounter.tunnelId || null);
    }
    if (option.outcome === "reward") { const reward = option.rewardItem || rewards[Math.floor(Math.random() * rewards.length)]; player.inventory.push(reward); report.push(`${player.name} получил: ${itemNames[reward] || reward}.`); }
    report.push(`${player.name}: испытание «${challengeCards.find((card) => card.id === encounter.challengeId)?.title || "Тоннель"}» пройдено.`);
  } else if (option.outcome === "retreat") report.push(`${player.name} отступил без ранения.`);
  else { applyInjury(player, draft, report, stats); report.push(`${player.name}: решение не сработало.`); }
  const encounters = { ...save.encounters, [playerId]: { ...encounter, resolved: true } };
  const next = { ...draft, encounters };
  return Object.values(encounters).every((entry) => entry.resolved) ? finishCompetitiveRound(next) : next;
}

function playIntervention(input: ExpeditionSave, sourceId: number, cardId: InterventionId, targetId: number, edgeId?: string): ExpeditionSave {
  const save = normalizedSave(input);
  if (save.phase !== "planning") return save;
  const hand = save.interventionHands?.[sourceId] || [];
  const source = save.session.players[sourceId - 1];
  const target = save.session.players[targetId - 1];
  if (!hand.includes(cardId) || !source || !target || isOut(save, source) || isOut(save, target)) return save;
  const hostile = cardId !== "caravan-intercept";
  if (hostile && sourceId === targetId) return save;
  if (hostile && save.effects?.some((effect) => effect.targetId === targetId && effect.round === save.session.round && effect.type !== "caravan-intercept")) return save;
  const closeEnough = distance(target.position, save.session) < distance(source.position, save.session) || stationDistance(source.position, target.position, save.session) <= 2;
  if (hostile && !closeEnough) return save;
  const skepticReady = target.roleId === "skeptic" && save.roleUses[`skeptic-shield:${targetId}`] === save.session.round;
  const motherReady = save.roleUses[`mother-shield:${targetId}`] === save.session.round;
  const report = [...save.report];
  const hands = { ...(save.interventionHands || {}), [sourceId]: hand.filter((id) => id !== cardId) };
  const stats = cloneStats(save.stats); stats[sourceId].interventions += 1;
  if (hostile && (skepticReady || motherReady)) {
    report.push(`${target.name} отменил вмешательство «${interventionCards[cardId].name}».`);
    return { ...save, interventionHands: hands, report, stats };
  }
  const selectedEdge = edgeId || competitivePassages(save, target)[0]?.edge.id;
  const effect: InterventionEffect = { id: uid("effect"), type: cardId, sourceId, targetId, round: save.session.round, edgeId: selectedEdge };
  const plans = { ...(save.plans || {}) };
  if (cardId === "switched-points" && plans[targetId]?.kind === "move" && plans[targetId].edgeId === selectedEdge) delete plans[targetId];
  report.push(`${source.name} сыграл «${interventionCards[cardId].name}» против ${target.name}.`);
  return { ...save, interventionHands: hands, effects: [...(save.effects || []), effect], report, stats, plans };
}

function applyCompetitiveAbility(input: ExpeditionSave, sourceId: number, targetId?: number, edgeId?: string): ExpeditionSave {
  const save = normalizedSave(input);
  if (save.phase !== "planning") return save;
  const session = cloneSession(save.session);
  const player = session.players[sourceId - 1];
  if (!player || isOut(save, player)) return save;
  const role = player.roleId;
  const last = save.roleUses[`ability:${sourceId}`] || -99;
  const cooldown = role === "mother" || role === "teen" || role === "smuggler" ? 3 : 2;
  if (!["scientist", "medic", "cartographer", "veteran"].includes(role) && session.round - last < cooldown) return save;
  const target = targetId ? session.players[targetId - 1] : player;
  const edge = edgeId ? edges.find((entry) => entry.id === edgeId && (entry.source === player.position || entry.target === player.position)) : undefined;
  const report = [...save.report];
  const roleUses = { ...save.roleUses, [`ability:${sourceId}`]: session.round };
  const stats = cloneStats(save.stats);
  const privateNotes = { ...(save.privateNotes || {}) };
  const temporaryEdges = { ...(save.temporaryEdges || {}) };
  const openEdge = () => {
    if (!edge) return false;
    const tunnelId = (["forward", "backward"] as const).find((candidate) => laneStatus(session, edge, candidate) === "closed") || "forward";
    const key = `${edge.id}::${tunnelId}`;
    temporaryEdges[key] = session.world.edges[key] || (scenarioEdgeMarks as Record<string, string>)[key] || "normal";
    session.world.edges[key] = "normal";
    return true;
  };
  if (role === "mag") {
    if (!edge || edge.type === "transfer") return save;
    const destination = edge.source === player.position ? edge.target : edge.source;
    const tunnelId = (["forward", "backward"] as const).find((candidate) => laneStatus(session, edge, candidate) === "unknown") || "forward";
    const key = `${edge.id}::${tunnelId}`;
    const eventId = revealTunnelEvent(session.world.tunnelEvents, key, laneStatus(session, edge, tunnelId));
    const title = eventId === quietTunnelEvent ? "тихий проход" : challengeCards.find((card) => card.id === eventId)?.title || "неясное испытание";
    privateNotes[sourceId] = [`Предчувствие: путь к станции «${nodeById.get(destination)?.name}» — ${title}.`, ...(privateNotes[sourceId] || [])].slice(0, 5);
  } else if (role === "skeptic") roleUses[`skeptic-shield:${sourceId}`] = session.round;
  else if (role === "mother") {
    if (!target || target.position !== player.position) return save;
    roleUses[`mother-shield:${sourceId}`] = session.round; roleUses[`mother-shield:${target.id}`] = session.round;
  } else if (role === "teen") roleUses[`teen-ready:${sourceId}`] = session.round;
  else if (role === "scientist") {
    if (stats[sourceId].knowledge.length < 3 || !openEdge()) return save;
    stats[sourceId].knowledge.splice(0, 3);
  } else if (role === "medic") {
    if (!target || target.position !== player.position || !target.lostLimbs.length) return save;
    const medkit = player.inventory.indexOf("medkit"); if (medkit < 0) return save;
    player.inventory.splice(medkit, 1); target.lostLimbs.pop(); stats[sourceId].healed += 1;
  } else if (role === "trackman") { if (!openEdge()) return save; }
  else if (role === "signalman") {
    const caravan = caravansFor(save).find((entry) => entry.id === edgeId) || caravansFor(save)[0];
    if (!caravan) return save;
    privateNotes[sourceId] = [`Эфир: «${caravan.name}» сейчас у ${nodeById.get(caravan.stationId)?.name}, затем идёт к ${nodeById.get(caravan.nextStationId)?.name}.`, ...(privateNotes[sourceId] || [])].slice(0, 5);
  } else if (role === "smuggler") roleUses[`smuggler-pass:${sourceId}`] = session.round;
  else return save;
  stats[sourceId].abilities += 1;
  report.push(`${player.name} применил способность «${competitiveRoles[role]?.title || "роль"}».`);
  return { ...save, session, roleUses, report, stats, privateNotes, temporaryEdges };
}

function offerTrade(input: ExpeditionSave, sourceId: number, targetId: number, itemId?: string, bullets?: number): ExpeditionSave {
  const save = normalizedSave(input);
  const source = save.session.players[sourceId - 1]; const target = save.session.players[targetId - 1];
  if (!source || !target || sourceId === targetId || isOut(save, source) || isOut(save, target)) return save;
  const remote = source.position !== target.position;
  if (remote && source.roleId !== "shuttle") return save;
  if (remote && save.session.round - (save.roleUses[`ability:${sourceId}`] || -99) < 2) return save;
  if (itemId && !source.inventory.includes(itemId)) return save;
  const amount = Math.max(0, Math.min(Number(bullets) || 0, source.bullets));
  if (!itemId && !amount) return save;
  const offer: TradeOffer = { id: uid("trade"), fromId: sourceId, toId: targetId, itemId, bullets: amount || undefined, remote, status: "pending" };
  const roleUses = remote ? { ...save.roleUses, [`ability:${sourceId}`]: save.session.round } : save.roleUses;
  const stats = cloneStats(save.stats); if (remote) stats[sourceId].abilities += 1;
  return { ...save, roleUses, stats, tradeOffers: [...(save.tradeOffers || []), offer], report: [...save.report, `${source.name} предложил сделку игроку ${target.name}.`] };
}

function answerTrade(input: ExpeditionSave, playerId: number, offerId: string, accept: boolean): ExpeditionSave {
  const save = normalizedSave(input);
  const offer = save.tradeOffers?.find((entry) => entry.id === offerId && entry.toId === playerId && entry.status === "pending");
  if (!offer) return save;
  const session = cloneSession(save.session); const source = session.players[offer.fromId - 1]; const target = session.players[offer.toId - 1];
  const valid = (!offer.itemId || source.inventory.includes(offer.itemId)) && (!offer.bullets || source.bullets >= offer.bullets) && (offer.remote || source.position === target.position);
  if (accept && valid) {
    if (offer.itemId) { source.inventory.splice(source.inventory.indexOf(offer.itemId), 1); target.inventory.push(offer.itemId); }
    if (offer.bullets) { source.bullets -= offer.bullets; target.bullets += offer.bullets; }
  }
  const status = accept && valid ? "accepted" : "rejected";
  return { ...save, session, tradeOffers: save.tradeOffers!.map((entry) => entry.id === offerId ? { ...entry, status } : entry), report: [...save.report, `${target.name} ${status === "accepted" ? "принял" : "отклонил"} сделку ${source.name}.`] };
}

function answerAlliance(input: ExpeditionSave, playerId: number, offerId: string, accept: boolean): ExpeditionSave {
  const save = normalizedSave(input);
  const offer = save.allianceOffers?.find((entry) => entry.id === offerId && entry.toId === playerId && entry.status === "pending");
  if (!offer) return save;
  const status = accept ? "accepted" : "rejected";
  return { ...save, allianceOffers: save.allianceOffers!.map((entry) => entry.id === offerId ? { ...entry, status } : entry), report: [...save.report, `${save.session.players[playerId - 1].name} ${accept ? "принял союз на один переход" : "отказался от союза"}.`] };
}

function sanitizeProfile(room: SharedRoom, sourceClientId: string, patch: Partial<SetupPlayer>) {
  const current = room.members.find((member) => member.clientId === sourceClientId);
  if (!current) return room;
  const roleTaken = patch.roleId && room.members.some((member) => member.clientId !== sourceClientId && member.roleId === patch.roleId);
  const roleId = roleTaken ? current.roleId : patch.roleId || current.roleId;
  const start = patch.start && starts.includes(patch.start) ? patch.start : current.start;
  const name = typeof patch.name === "string" ? patch.name.trim().slice(0, 24) || current.name : current.name;
  return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, name, roleId, start, ready: false } : member) };
}

function reduceRoom(room: SharedRoom, command: RoomCommand, sourceClientId: string): SharedRoom {
  if (command.type === "join") {
    const existing = room.members.find((member) => member.clientId === sourceClientId);
    if (existing) {
      const playerId = room.playerByClient[sourceClientId];
      return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, connected: true } : member), save: room.save && playerId ? { ...room.save, botControlledIds: room.save.botControlledIds.filter((id) => id !== playerId), report: [...room.save.report, `${room.save.session.players[playerId - 1]?.name} вернулся под управление игрока.`] } : room.save };
    }
    if (room.status !== "lobby" || room.members.length >= 12) return room;
    const usedRoles = new Set(room.members.map((member) => member.roleId));
    const roleId = usedRoles.has(command.member.roleId) ? roleCards.find((role) => !usedRoles.has(role.id))?.id || command.member.roleId : command.member.roleId;
    return { ...room, members: [...room.members, { ...command.member, clientId: sourceClientId, roleId, connected: true }] };
  }
  if (command.type === "disconnect") {
    const playerId = room.playerByClient[sourceClientId];
    return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, connected: false } : member), save: room.save && playerId ? { ...room.save, botControlledIds: [...new Set([...room.save.botControlledIds, playerId])], report: [...room.save.report, `${room.save.session.players[playerId - 1]?.name}: связь потеряна, управление временно принял бот.`] } : room.save };
  }
  if (command.type === "set-timer" && room.status === "lobby" && sourceClientId === room.hostClientId) return { ...room, timerEnabled: command.enabled };
  if (command.type === "remove-member" && room.status === "lobby" && sourceClientId === room.hostClientId && command.clientId !== room.hostClientId) return { ...room, members: room.members.filter((member) => member.clientId !== command.clientId) };
  if (command.type === "profile" && room.status === "lobby") return sanitizeProfile(room, sourceClientId, command.patch);
  if (command.type === "ready" && room.status === "lobby") return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, ready: command.ready } : member) };
  if (command.type === "start" && sourceClientId === room.hostClientId && room.status === "lobby" && room.members.filter((member) => member.connected).length >= 2 && room.members.filter((member) => member.connected).every((member) => member.ready)) {
    const activeMembers = room.members.filter((member) => member.connected);
    const created = createExpedition(room.code, activeMembers);
    if (created.save) {
      created.save.timerEnabled = room.timerEnabled ?? true;
      created.save.planningEndsAt = created.save.timerEnabled ? Date.now() + (room.planningSeconds || 60) * 1000 : null;
    }
    return { ...room, status: "playing", ...created };
  }
  if (!room.save || room.status !== "playing") return room;
  const save = normalizedSave(room.save);
  const sourcePlayerId = room.playerByClient[sourceClientId];
  const activePlayerId = save.humanIds[save.activeHuman];
  const isHost = sourceClientId === room.hostClientId;
  if (command.type === "next-round" && isHost && save.phase === "summary") return { ...room, save: nextRound(save) };
  if (command.type === "bot-takeover" && isHost) return { ...room, save: save.version === 2 ? { ...save, botControlledIds: [...new Set([...save.botControlledIds, command.playerId])], report: [...save.report, `${save.session.players[command.playerId - 1]?.name} временно передан боту.`] } : botTakeover(save, command.playerId) };
  if (command.type === "restore-human" && isHost) return { ...room, save: { ...save, botControlledIds: save.botControlledIds.filter((id) => id !== command.playerId), report: [...save.report, `${save.session.players[command.playerId - 1]?.name} снова управляется человеком.`] } };
  if (command.type === "skip-disconnected" && isHost) {
    const activeClientId = Object.entries(room.playerByClient).find(([, id]) => id === activePlayerId)?.[0];
    const member = room.members.find((entry) => entry.clientId === activeClientId);
    if (member?.connected !== false) return room;
    return { ...room, save: save.version === 2 ? submitPlan(save, activePlayerId, { kind: "stay" }) : finishTurn(save, { move: false, note: `Ход игрока ${save.session.players[activePlayerId - 1]?.name} пропущен после потери соединения.` }) };
  }
  if (command.type === "rematch" && isHost && save.phase === "finished") {
    const activeMembers = room.members.filter((member) => member.connected);
    const roles = shuffle(activeMembers.map((member) => member.roleId));
    const shuffledStarts = shuffle(starts);
    const rematchMembers = activeMembers.map((member, index) => ({ ...member, roleId: roles[index], start: shuffledStarts[index % shuffledStarts.length], ready: true }));
    const created = createExpedition(room.code, rematchMembers);
    if (created.save) { created.save.timerEnabled = save.timerEnabled; created.save.planningEndsAt = save.timerEnabled ? Date.now() + 60000 : null; }
    return { ...room, members: rematchMembers, ...created };
  }
  if (!sourcePlayerId) return room;
  if (command.type === "claim-bot") {
    const original = save.originalPlayerByClient?.[sourceClientId] || sourcePlayerId;
    if (save.session.players[original - 1]?.lostLimbs.length < 4) return room;
    const botIsFree = !save.humanIds.includes(command.playerId) && !Object.values(room.playerByClient).includes(command.playerId) && !isOut(save, save.session.players[command.playerId - 1]);
    if (!botIsFree) return room;
    return { ...room, playerByClient: { ...room.playerByClient, [sourceClientId]: command.playerId }, save: { ...save, humanIds: [...save.humanIds, command.playerId], interventionHands: { ...(save.interventionHands || {}), [command.playerId]: shuffle(interventionDeck).slice(0, 2) }, takeoverOriginals: { ...(save.takeoverOriginals || {}), [sourceClientId]: original }, report: [...save.report, `${save.session.players[original - 1].name} погиб; игрок продолжает вне зачёта за ${save.session.players[command.playerId - 1].name}.`] } };
  }
  if (command.type === "plan") return { ...room, save: submitPlan(save, sourcePlayerId, command.action) };
  if (command.type === "resolve-encounter") return { ...room, save: resolveCompetitiveEncounter(save, sourcePlayerId, command.optionId) };
  if (command.type === "play-intervention") return { ...room, save: playIntervention(save, sourcePlayerId, command.cardId, command.targetPlayerId, command.edgeId) };
  if (command.type === "competitive-ability") return { ...room, save: applyCompetitiveAbility(save, sourcePlayerId, command.targetPlayerId, command.edgeId) };
  if (command.type === "offer-trade") return { ...room, save: offerTrade(save, sourcePlayerId, command.targetPlayerId, command.itemId, command.bullets) };
  if (command.type === "answer-trade") return { ...room, save: answerTrade(save, sourcePlayerId, command.offerId, command.accept) };
  if (command.type === "answer-alliance") return { ...room, save: answerAlliance(save, sourcePlayerId, command.offerId, command.accept) };
  if (command.type === "offer-alliance") {
    const source = save.session.players[sourcePlayerId - 1]; const target = save.session.players[command.targetPlayerId - 1];
    const valid = source && target && source.position === target.position && competitivePassages(save, source).some((entry) => entry.edge.id === command.edgeId && entry.target === command.target);
    if (!valid) return room;
    const offer: AllianceOffer = { id: uid("alliance"), fromId: sourcePlayerId, toId: command.targetPlayerId, edgeId: command.edgeId, target: command.target, round: save.session.round, status: "pending" };
    return { ...room, save: { ...save, allianceOffers: [...(save.allianceOffers || []), offer], report: [...save.report, `${source.name} предложил ${target.name} пройти один тоннель вместе.`] } };
  }
  if (command.type === "transfer-npc") {
    const target = save.session.players[command.targetPlayerId - 1]; const source = save.session.players[sourcePlayerId - 1];
    if (!target || !source || target.position !== source.position || save.session.world.npcOwners[command.npcId] !== sourcePlayerId) return room;
    const session = cloneSession(save.session); session.world.npcOwners[command.npcId] = target.id; session.world.npcPositions[command.npcId] = target.position;
    return { ...room, save: { ...save, session, report: [...save.report, `${source.name} передал NPC игроку ${target.name}.`] } };
  }
  if (command.type === "use-item" || command.type === "discard-item" || command.type === "give-item") return { ...room, save: updatePlayerInventory(save, sourcePlayerId, command) };
  if (command.type === "recruit-npc" || command.type === "use-npc") return { ...room, save: updateNpc(save, sourcePlayerId, command) };
  if (command.type === "role-action") return { ...room, save: save.version === 2 ? applyCompetitiveAbility(save, sourcePlayerId, undefined, command.edgeId) : applyRoleAction(save, sourcePlayerId, command.edgeId) };
  if (save.version === 2) return room;
  if (sourcePlayerId !== activePlayerId || save.botControlledIds.includes(sourcePlayerId)) return room;
  if (command.type === "choose") return { ...room, save: choosePath(room.save, command.target, command.edgeId) };
  if (command.type === "resolve") return { ...room, save: resolveChallenge(room.save, command.optionId) };
  if (command.type === "resolve-cordon") return { ...room, save: resolveCordon(room.save, command.mode) };
  return room;
}

function newLobbyMember(clientId: string, name: string, roleId: string, start: string): LobbyMember {
  return { clientId, name: name.trim() || "Путник", roleId, start, connected: true, ready: false, joinedAt: Date.now() };
}

function normalizeRoom(room: SharedRoom): SharedRoom {
  return {
    ...room,
    timerEnabled: room.timerEnabled ?? true,
    planningSeconds: room.planningSeconds || 60,
    processedCommandIds: room.processedCommandIds || [],
    members: room.members.map((member) => ({ ...member, ready: member.ready ?? room.status === "playing" })),
    save: room.save ? normalizedSave(room.save) : null,
  };
}

export function ExpeditionConsole() {
  // На сервере хранилища нет: там достаточно временного id, в браузере инициализатор выполнится заново.
  const [clientId] = useState(() => (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("golosa-client-id")) || makeClientId());
  const brokerRef = useRef<MqttClient | null>(null);
  const lastStateAtRef = useRef(0);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [room, setRoom] = useState<SharedRoom | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [entryMode, setEntryMode] = useState<"choice" | "create" | "join">(() => invitedRoomCode().length === 6 ? "join" : "choice");
  const [joinCode, setJoinCode] = useState(invitedRoomCode);
  const [selectedRoom, setSelectedRoom] = useState<RoomListing | null>(null);
  const [rooms, setRooms] = useState<Record<string, RoomListing & { seenAt: number }>>({});
  const [roomsStatus, setRoomsStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [profile, setProfile] = useState<SetupPlayer>({ name: "", roleId: roleCards[0].id, start: starts[0] });
  const [restorableRoom] = useState<SharedRoom | null>(() => {
    try {
      const value = localStorage.getItem(hostStorageKey);
      const saved = value ? normalizeRoom(JSON.parse(value) as SharedRoom) : null;
      return saved?.hostClientId === clientId ? saved : null;
    } catch { return null; }
  });
  const [guestResume] = useState<{ code: string; profile: SetupPlayer } | null>(() => {
    try { const value = sessionStorage.getItem(guestStorageKey); return value ? JSON.parse(value) as { code: string; profile: SetupPlayer } : null; } catch { return null; }
  });

  useEffect(() => {
    sessionStorage.setItem("golosa-client-id", clientId);
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      brokerRef.current?.end(true);
    };
  }, [clientId]);
  const [deathSeen, setDeathSeen] = useState<string | null>(null);
  const [damageFlash, setDamageFlash] = useState(0);
  const lostLimbsRef = useRef<number | null>(null);
  const myLostLimbs = (() => { const playerId = room?.playerByClient[clientId]; return playerId && room?.save ? room.save.session.players[playerId - 1]?.lostLimbs.length : undefined; })();
  useEffect(() => {
    if (myLostLimbs == null) { lostLimbsRef.current = null; return; }
    if (lostLimbsRef.current != null && myLostLimbs > lostLimbsRef.current) setDamageFlash((value) => value + 1);
    lostLimbsRef.current = myLostLimbs;
  }, [myLostLimbs]);

  const inRoom = room !== null;
  useEffect(() => {
    if (inRoom) return;
    let broker: MqttClient | null = null;
    let cancelled = false;
    void loadMqtt().then((mqtt) => {
    if (cancelled) return;
    const client = mqtt.connect(brokerUrl, { clientId: mqttId(), clean: true, reconnectPeriod: 3000, connectTimeout: 10000, protocolVersion: 4 });
    broker = client;
    client.on("connect", () => {
      client.subscribe(`${roomsDirectoryTopic}/+`, { qos: 1 }, (error) => setRoomsStatus(error ? "offline" : "online"));
    });
    client.on("message", (topic, payload) => {
      if (!topic.startsWith(`${roomsDirectoryTopic}/`)) return;
      const code = topic.slice(roomsDirectoryTopic.length + 1);
      const text = payload.toString();
      if (!text) {
        setRooms((current) => { if (!(code in current)) return current; const next = { ...current }; delete next[code]; return next; });
        return;
      }
      try {
        const listing = JSON.parse(text) as RoomListing;
        if (listing.code !== code || typeof listing.updatedAt !== "number") return;
        // Запись старше трёх минут — хост давно пропал, а will не сработал.
        if (Date.now() - listing.updatedAt > 180000) return;
        setRooms((current) => ({ ...current, [code]: { ...listing, seenAt: Date.now() } }));
      } catch { /* Чужой трафик на публичном брокере. */ }
    });
    client.on("offline", () => setRoomsStatus("offline"));
    client.on("error", () => setRoomsStatus("offline"));
    }).catch(() => setRoomsStatus("offline"));
    const prune = setInterval(() => {
      const now = Date.now();
      setRooms((current) => {
        const alive = Object.fromEntries(Object.entries(current).filter(([, entry]) => now - entry.seenAt < listingTtl));
        return Object.keys(alive).length === Object.keys(current).length ? current : alive;
      });
    }, 5000);
    return () => { cancelled = true; clearInterval(prune); broker?.end(true); };
  }, [inRoom]);

  const applyHostCommand = useCallback((command: RoomCommand, sourceClientId: string, commandId = uid("command")) => {
    setRoom((current) => {
      if (!current || current.processedCommandIds?.includes(commandId)) return current;
      const next = reduceRoom(current, command, sourceClientId);
      return { ...next, processedCommandIds: [...(next.processedCommandIds || []), commandId].slice(-180) };
    });
  }, []);

  useEffect(() => {
    if (!room || room.hostClientId !== clientId) return;
    localStorage.setItem(hostStorageKey, JSON.stringify(room));
    const publish = () => {
      const broker = brokerRef.current;
      if (!broker?.connected) return;
      broker.publish(roomTopic(room.code, "state"), JSON.stringify({ type: "state", room, sentAt: Date.now() }), { qos: 1, retain: true });
      broker.publish(roomListingTopic(room.code), JSON.stringify(listingFor(room)), { qos: 1, retain: true });
    };
    publish();
    const heartbeat = setInterval(publish, 5000);
    // При закрытии вкладки сразу убираем комнату из каталога, не дожидаясь will брокера.
    const onPageHide = () => { const broker = brokerRef.current; if (broker?.connected) broker.publish(roomListingTopic(room.code), "", { qos: 1, retain: true }); };
    window.addEventListener("pagehide", onPageHide);
    return () => { clearInterval(heartbeat); window.removeEventListener("pagehide", onPageHide); };
  }, [clientId, room]);

  const destroyConnection = () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
    const broker = brokerRef.current;
    if (broker?.connected && room && room.hostClientId === clientId) broker.publish(roomListingTopic(room.code), "", { qos: 1, retain: true });
    brokerRef.current?.end(true);
    brokerRef.current = null;
  };

  const armConnectionTimeout = (message: string) => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      setConnectionStatus("error");
      setConnectionError(message);
      brokerRef.current?.end(true);
      brokerRef.current = null;
    }, 15000);
  };

  const clearConnectionTimeout = () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
  };

  const openHostBroker = (code: string, initialRoom: SharedRoom) => {
    void loadMqtt().then((mqtt) => {
    const broker = mqtt.connect(brokerUrl, {
      clientId: mqttId(), clean: true, reconnectPeriod: 2000, connectTimeout: 10000, protocolVersion: 4,
      will: { topic: roomListingTopic(code), payload: "", qos: 1, retain: true },
    });
    brokerRef.current = broker;
    broker.on("connect", () => {
      broker.subscribe(roomTopic(code, "command"), { qos: 1 }, (error) => {
        if (error) {
          setConnectionStatus("error");
          setConnectionError("Не удалось открыть канал комнаты. Попробуйте создать новую.");
          return;
        }
        clearConnectionTimeout();
        setConnectionError("");
        setConnectionStatus("connected");
        setRoom((current) => current || initialRoom);
      });
    });
    broker.on("message", (topic, payload) => {
      if (topic !== roomTopic(code, "command")) return;
      try {
        const message = JSON.parse(payload.toString()) as { id?: string; sourceClientId?: string; command?: RoomCommand };
        if (message.sourceClientId && message.command?.type) applyHostCommand(message.command, message.sourceClientId, message.id);
      } catch { /* A public test broker can contain unrelated traffic. */ }
    });
    broker.on("reconnect", () => setConnectionStatus("connecting"));
    broker.on("offline", () => {
      setConnectionStatus("error");
      setConnectionError("Связь с сервером комнат потеряна. Переподключаемся…");
    });
    broker.on("error", () => {
      setConnectionStatus("error");
      setConnectionError("Сервер комнат временно недоступен. Игра попробует подключиться снова.");
    });
    }).catch(() => { setConnectionStatus("error"); setConnectionError("Не удалось загрузить модуль связи. Обновите страницу."); });
  };

  const createRoom = () => {
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    armConnectionTimeout("Сервер комнат не ответил. Проверьте интернет и попробуйте создать комнату ещё раз.");
    const code = makeCode();
    const host = newLobbyMember(clientId, profile.name || "Создатель партии", profile.roleId, profile.start);
    openHostBroker(code, { code, hostClientId: clientId, status: "lobby", members: [host], playerByClient: {}, save: null, timerEnabled: true, planningSeconds: 60, processedCommandIds: [] });
  };

  const restoreHostRoom = () => {
    if (!restorableRoom) return;
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    armConnectionTimeout("Не удалось восстановить комнату. Попробуйте создать новую.");
    const restored = normalizeRoom(restorableRoom);
    const previousHostId = restored.hostClientId;
    const hostPlayerId = restored.playerByClient[previousHostId];
    const playerByClient = { ...restored.playerByClient };
    delete playerByClient[previousHostId];
    if (hostPlayerId) playerByClient[clientId] = hostPlayerId;
    openHostBroker(restored.code, {
      ...restored,
      hostClientId: clientId,
      playerByClient,
      members: restored.members.map((member) => member.clientId === previousHostId ? { ...member, clientId, connected: true } : { ...member, connected: false }),
    });
  };

  const connectGuest = (rawCode: string, memberProfile: SetupPlayer) => {
    const code = rawCode.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
    if (code.length !== 6) {
      setConnectionError("Введите шестизначный код комнаты.");
      return;
    }
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    armConnectionTimeout("Не удалось связаться с компьютером создателя. Оставьте комнату открытой у создателя и попробуйте снова.");
    void loadMqtt().then((mqtt) => {
    const broker = mqtt.connect(brokerUrl, {
      clientId: mqttId(), clean: true, reconnectPeriod: 2000, connectTimeout: 10000, protocolVersion: 4,
      will: { topic: roomTopic(code, "command"), payload: JSON.stringify({ sourceClientId: clientId, command: { type: "disconnect" } }), qos: 1, retain: false },
    });
    brokerRef.current = broker;
    let joined = false;
    const publishJoin = () => {
      broker.publish(roomTopic(code, "command"), JSON.stringify({ sourceClientId: clientId, command: { type: "join", member: newLobbyMember(clientId, memberProfile.name || "Путник", memberProfile.roleId, memberProfile.start) } }), { qos: 1 });
      joined = true;
    };
    broker.on("connect", () => {
      broker.subscribe(roomTopic(code, "state"), { qos: 1 }, (error) => {
        if (error) {
          setConnectionStatus("error");
          setConnectionError("Не удалось открыть канал комнаты.");
          return;
        }
        if (!joined) publishJoin();
      });
    });
    broker.on("message", (topic, payload) => {
      if (topic !== roomTopic(code, "state")) return;
      try {
        const message = JSON.parse(payload.toString()) as { type?: string; room?: SharedRoom };
        if (message.type !== "state" || !message.room || message.room.code !== code) return;
        clearConnectionTimeout();
        sessionStorage.setItem(guestStorageKey, JSON.stringify({ code, profile: memberProfile }));
        lastStateAtRef.current = Date.now();
        setRoom(normalizeRoom(message.room));
        setConnectionStatus("connected");
        setConnectionError("");
      } catch { /* Ignore unrelated traffic on the public relay. */ }
    });
    broker.on("reconnect", () => { joined = false; setConnectionStatus("connecting"); });
    broker.on("offline", () => {
      setConnectionStatus("error");
      setConnectionError("Связь с сервером комнат потеряна. Переподключаемся…");
    });
    broker.on("error", () => {
      setConnectionStatus("error");
      setConnectionError("Не удалось подключиться к серверу комнат.");
    });
    }).catch(() => { setConnectionStatus("error"); setConnectionError("Не удалось загрузить модуль связи. Обновите страницу."); });
  };

  const joinRoom = () => connectGuest(joinCode, profile);
  const reconnectRoom = () => {
    if (!room) return;
    const member = room.members.find((entry) => entry.clientId === clientId);
    connectGuest(room.code, member || profile);
  };

  const isHost = room?.hostClientId === clientId;
  const sendCommand = (command: RoomCommand) => {
    const id = uid("command");
    if (isHost) applyHostCommand(command, clientId, id);
    else if (room && brokerRef.current?.connected) brokerRef.current.publish(roomTopic(room.code, "command"), JSON.stringify({ id, sourceClientId: clientId, command }), { qos: 1 });
  };
  const updateProfile = (patch: Partial<SetupPlayer>) => {
    setProfile((current) => ({ ...current, ...patch }));
    if (room?.status === "lobby") sendCommand({ type: "profile", patch });
  };

  useEffect(() => {
    if (!room || !isHost || room.status !== "playing" || room.save?.phase !== "planning" || !room.save.timerEnabled || !room.save.planningEndsAt) return;
    const timer = window.setInterval(() => {
      setRoom((current) => {
        if (!current?.save || current.save.phase !== "planning" || !current.save.planningEndsAt || Date.now() < current.save.planningEndsAt) return current;
        let next = normalizedSave(current.save);
        next.humanIds.filter((id) => !next.botControlledIds.includes(id) && !isOut(next, next.session.players[id - 1]) && !next.plans?.[id]).forEach((id) => { next = submitPlan(next, id, { kind: "stay" }); });
        return { ...current, save: next };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, room?.code, room?.save?.phase, room?.save?.planningEndsAt, room?.save?.timerEnabled, room?.status]);

  useEffect(() => {
    if (!room || isHost) return;
    const failover = window.setInterval(() => {
      if (Date.now() - lastStateAtRef.current < 14000) return;
      const successor = room.members.filter((member) => member.connected && member.clientId !== room.hostClientId).sort((a, b) => a.joinedAt - b.joinedAt || a.clientId.localeCompare(b.clientId))[0];
      if (successor?.clientId !== clientId) return;
      const promoted = normalizeRoom({ ...room, hostClientId: clientId, members: room.members.map((member) => member.clientId === room.hostClientId ? { ...member, connected: false } : member) });
      destroyConnection();
      setConnectionStatus("connecting");
      openHostBroker(room.code, promoted);
      lastStateAtRef.current = Date.now();
    }, 3000);
    return () => clearInterval(failover);
  }, [clientId, isHost, room]);

  if (!room) {
    const roomList = Object.values(rooms).sort((a, b) => (a.status === b.status ? b.updatedAt - a.updatedAt : a.status === "lobby" ? -1 : 1));
    return <main className="expedition-entry">
      <a href="./" className="solo-back">← Три режима</a>
      <section className="expedition-entry-hero">
        <p className="pixel-kicker">Режим 02 · сетевая партия</p>
        <h1>Спускайтесь<br/><span>с разных компьютеров</span></h1>
        <p>Один человек создаёт комнату, и она появляется в списке у всех. Остальные входят в неё одним нажатием. Когда в лобби соберутся хотя бы двое, создатель запускает экспедицию — свободные роли займут боты.</p>
        <div className="expedition-network-note"><i/>Сервер комнат · без регистрации</div>
      </section>
      <section className="expedition-entry-panel pixel-panel">
        {entryMode === "choice" && <>
          <p className="pixel-kicker">Как войти?</p>
          <h2>Собрать компанию</h2>
          <button className="pixel-primary" onClick={() => setEntryMode("create")}><span>Создать новую партию</span><b>→</b></button>
          <div className="expedition-rooms">
            <div className="expedition-rooms-head"><span>Открытые комнаты</span><i className={roomsStatus}/><b>{roomsStatus === "online" ? roomList.length : roomsStatus === "connecting" ? "ищем…" : "нет связи"}</b></div>
            {roomList.length === 0 && <p className="expedition-rooms-empty">{roomsStatus === "online" ? "Пока никто не открыл комнату. Создайте свою — друзья увидят её здесь." : roomsStatus === "connecting" ? "Подключаемся к серверу комнат…" : "Сервер комнат недоступен. Проверьте интернет или введите код вручную."}</p>}
            {roomList.map((entry) => <button key={entry.code} type="button" className={`expedition-room ${entry.status}`} disabled={entry.status !== "lobby"} onClick={() => { setSelectedRoom(entry); setJoinCode(entry.code); setEntryMode("join"); setConnectionError(""); }}>
              <b>{entry.hostName}</b>
              <span>{entry.members} {memberWord(entry.members)}</span>
              <small>{entry.status === "lobby" ? "Идёт набор" : "Уже в пути"}</small>
              <em>{entry.code}</em>
            </button>)}
            <button type="button" className="expedition-code-link" onClick={() => { setSelectedRoom(null); setJoinCode(""); setEntryMode("join"); setConnectionError(""); }}>Ввести код вручную</button>
          </div>
          {restorableRoom && <button className="expedition-restore" onClick={restoreHostRoom}><span>Восстановить комнату {restorableRoom.code}</span><b>↻</b></button>}
          {!restorableRoom && guestResume && <button className="expedition-restore" onClick={() => connectGuest(guestResume.code, guestResume.profile)}><span>Вернуться в комнату {guestResume.code}</span><b>↻</b></button>}
        </>}
        {entryMode !== "choice" && <>
          <button className="expedition-entry-back" onClick={() => { setEntryMode("choice"); setSelectedRoom(null); setConnectionError(""); }}>← Назад</button>
          <p className="pixel-kicker">{entryMode === "create" ? "Новая комната" : selectedRoom ? "Комната из списка" : "Приглашение"}</p>
          <h2>{entryMode === "create" ? "Представьтесь" : selectedRoom ? `Комната · ${selectedRoom.hostName}` : "Войти к друзьям"}</h2>
          {entryMode === "join" && selectedRoom && <div className="expedition-room-pick"><b>{selectedRoom.hostName}</b><span>{selectedRoom.members} {memberWord(selectedRoom.members)} · идёт набор</span><em>{selectedRoom.code}</em></div>}
          <label>Имя<input value={profile.name} maxLength={24} placeholder="Как вас называть?" onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}/></label>
          {entryMode === "join" && !selectedRoom && <label>Код комнаты<input className="expedition-code-input" value={joinCode} maxLength={6} placeholder="A7K2MP" onChange={(event) => setJoinCode(event.target.value.toUpperCase())}/></label>}
          <button className="pixel-primary" disabled={connectionStatus === "connecting"} onClick={entryMode === "create" ? createRoom : joinRoom}>
            <span>{connectionStatus === "connecting" ? "Соединяем…" : entryMode === "create" ? "Создать комнату" : "Войти в комнату"}</span><b>→</b>
          </button>
        </>}
        {connectionError && <p className="expedition-error">{connectionError}</p>}
      </section>
    </main>;
  }

  const myMember = room.members.find((member) => member.clientId === clientId);
  const usedRoles = new Set(room.members.filter((member) => member.clientId !== clientId).map((member) => member.roleId));
  if (room.status === "lobby") {
    const connectedMembers = room.members.filter((member) => member.connected);
    const everyoneReady = connectedMembers.length >= 2 && connectedMembers.every((member) => member.ready);
    const selectedAbility = competitiveRoles[myMember?.roleId || profile.roleId];
    return <main className="expedition-lobby">
      <a href="./" className="solo-back">← Выйти</a>
      <header>
        <div><p className="pixel-kicker">Комната открыта</p><h1>Код <span>{room.code}</span></h1><p>Передайте друзьям этот код. Они выбирают режим «Люди и боты» → «Войти по коду».</p></div>
        <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?room=${room.code}#expedition`)}>Скопировать ссылку-приглашение</button>
      </header>
      <div className="expedition-lobby-layout">
        <section className="expedition-members pixel-panel">
          <div><p className="pixel-kicker">Участники</p><b>{connectedMembers.length}/12</b></div>
          {room.members.map((member, index) => <article key={member.clientId} className={!member.connected ? "offline" : ""}>
            <RolePortrait roleId={member.roleId}/><div><strong>{member.name}</strong><span>{roleCards.find((role) => role.id === member.roleId)?.name}</span></div><i>{!member.connected ? "нет связи" : member.ready ? "готов" : member.clientId === room.hostClientId ? "создатель" : `игрок ${index + 1}`}</i>
            {isHost && member.clientId !== room.hostClientId && <button className="expedition-kick" onClick={() => sendCommand({ type: "remove-member", clientId: member.clientId })}>Убрать</button>}
          </article>)}
          {Array.from({ length: Math.max(0, 2 - room.members.length) }).map((_, index) => <div className="expedition-empty-member" key={index}>Ожидаем ещё одного путника…</div>)}
        </section>
        <section className="expedition-profile pixel-panel">
          <p className="pixel-kicker">Ваш выбор</p>
          <RolePortrait roleId={myMember?.roleId || profile.roleId}/>
          <label>Имя<input value={myMember?.name || profile.name} onChange={(event) => updateProfile({ name: event.target.value })}/></label>
          <label>Персонаж<select value={myMember?.roleId || profile.roleId} onChange={(event) => updateProfile({ roleId: event.target.value })}>{roleCards.map((role) => <option key={role.id} value={role.id} disabled={usedRoles.has(role.id)}>{role.name}</option>)}</select></label>
          <label>Стартовая станция<select value={myMember?.start || profile.start} onChange={(event) => updateProfile({ start: event.target.value })}>{starts.map((id) => <option key={id} value={id}>{nodeById.get(id)?.name} · {nodeById.get(id)?.lineName}</option>)}</select></label>
          <div className="expedition-ability-preview"><b>{selectedAbility.title}</b><span>{selectedAbility.description}</span><small>{selectedAbility.cooldown} · {selectedAbility.range}<br/>Ответ: {selectedAbility.counter}</small></div>
          {isHost && <label className="expedition-timer"><input type="checkbox" checked={room.timerEnabled ?? true} onChange={(event) => sendCommand({ type: "set-timer", enabled: event.target.checked })}/><span>Планирование 60 секунд</span></label>}
          <button className={myMember?.ready ? "expedition-ready active" : "expedition-ready"} onClick={() => sendCommand({ type: "ready", ready: !myMember?.ready })}>{myMember?.ready ? "✓ Готов — изменить выбор" : "Подтвердить готовность"}</button>
          {isHost ? <button className="pixel-primary expedition-start-room" disabled={!everyoneReady} onClick={() => sendCommand({ type: "start" })}><span>{connectedMembers.length < 2 ? "Нужно минимум двое" : !everyoneReady ? "Ждём готовность игроков" : "Начать экспедицию"}</span><b>→</b></button> : <div className="expedition-wait-host"><i/><span>{myMember?.ready ? "Готовность принята. Создатель запустит игру." : "Подтвердите выбор, когда будете готовы."}</span></div>}
        </section>
      </div>
    </main>;
  }

  const storedSave = room.save;
  if (!storedSave) return null;
  const save = normalizedSave(storedSave);
  const myPlayerId = room.playerByClient[clientId];
  const myPlayer = myPlayerId ? save.session.players[myPlayerId - 1] : null;
  const current = myPlayer || save.session.players[0];
  const canAct = Boolean(myPlayer && save.phase === "planning" && !save.botControlledIds.includes(myPlayer.id) && !isOut(save, myPlayer));
  const myEncounter = myPlayer ? save.encounters?.[myPlayer.id] : undefined;
  const currentChallenge = challengeCards.find((card) => card.id === myEncounter?.challengeId);
  const options: ChallengeOption[] = currentChallenge ? (challengeSolutions[currentChallenge.id] || []).filter((option) => !option.roleIds?.length) : [];
  const role = roleCards.find((entry) => entry.id === current.roleId);
  const myRole = roleCards.find((entry) => entry.id === myPlayer?.roleId);
  const neighbors = myPlayer ? competitivePassages(save, myPlayer) : [];
  const myFinish = save.finishers.find((entry) => entry.playerId === myPlayer?.id);
  const inventoryGroups = myPlayer ? Object.entries(myPlayer.inventory.reduce<Record<string, number>>((result, item) => ({ ...result, [item]: (result[item] || 0) + 1 }), {})) : [];
  const coLocated = myPlayer ? save.session.players.filter((player) => player.id !== myPlayer.id && player.position === myPlayer.position && !isOut(save, player)) : [];
  const availableNpcs = myPlayer ? npcCards.filter((npc) => save.session.world.npcPositions[npc.id] === myPlayer.position && save.session.world.npcOwners[npc.id] == null) : [];
  const ownedNpcs = myPlayer ? npcCards.filter((npc) => save.session.world.npcOwners[npc.id] === myPlayer.id) : [];
  const roleEdges = myPlayer ? edges.filter((edge) => edge.source === myPlayer.position || edge.target === myPlayer.position) : [];
  const myPlan = myPlayer ? save.plans?.[myPlayer.id] : undefined;
  const pendingTrades = myPlayer ? (save.tradeOffers || []).filter((offer) => offer.toId === myPlayer.id && offer.status === "pending") : [];
  const pendingAlliances = myPlayer ? (save.allianceOffers || []).filter((offer) => offer.toId === myPlayer.id && offer.status === "pending") : [];
  const myCards = myPlayer ? save.interventionHands?.[myPlayer.id] || [] : [];
  const leaderDistance = Math.min(...save.session.players.filter((player) => !isOut(save, player)).map((player) => distance(player.position, save.session)));
  const myDistance = myPlayer ? distance(myPlayer.position, save.session) : 999;
  const provisionalPlace = myFinish?.rank || 1 + save.session.players.filter((player) => !isOut(save, player) && distance(player.position, save.session) < myDistance).length;
  const takeoverOriginal = save.takeoverOriginals?.[clientId];
  const ability = myPlayer ? competitiveRoles[myPlayer.roleId] : null;

  const deathKey = `${room.code}:${myPlayer?.id ?? 0}`;
  return <main className="solo-shell expedition-shell">
    {damageFlash > 0 && <div key={damageFlash} className="damage-flash" aria-hidden="true"/>}
    {myPlayer && myPlayer.lostLimbs.length >= 4 && deathSeen !== deathKey && <DeathModal name={myPlayer.name} roleName={myRole?.name || "Путник"} roleId={myPlayer.roleId} station={nodeById.get(myPlayer.position)?.name || "неизвестно"} stats={[{ label: "раундов", value: save.session.round }, { label: "патронов", value: myPlayer.bullets }, { label: "предметов", value: myPlayer.inventory.length }, { label: "живых людей", value: save.humanIds.filter((id) => !isOut(save, save.session.players[id - 1])).length }]} lines={save.report} primary={{ label: "Вернуться к режимам", onClick: () => { window.location.href = "./"; } }} onDismiss={() => setDeathSeen(deathKey)}/>}
    <header className="solo-header"><div><span>Раунд {save.session.round}</span><b>{save.session.time}</b><i>{save.phase === "planning" ? `Планы ${Object.keys(save.plans || {}).length}/${save.humanIds.filter((id) => !save.botControlledIds.includes(id) && !isOut(save, save.session.players[id - 1])).length}` : save.phase === "encounters" ? "Испытания одновременно" : save.phase === "summary" ? "Шаг мира завершён" : "Финиш"}</i></div><strong>Комната {room.code}</strong><a href="./">Режимы</a></header>
    {connectionStatus === "error" && !isHost && <div className="expedition-connection-alert"><span>{connectionError || "Связь с создателем потеряна."}</span><button onClick={reconnectRoom}>Переподключиться</button></div>}
    <div className="solo-layout">
      <section className="solo-map"><MetroNetworkMap state={save.session} focusIds={save.session.players.map((player) => player.position)} compact={false}/>{canAct && <section className="solo-action pixel-panel"><p className="pixel-kicker">{myPlan ? "План принят — его можно изменить" : "Ваш план на раунд"}</p><button className={myPlan?.kind === "stay" ? "pressed" : undefined} onClick={() => sendCommand({ type: "plan", action: { kind: "stay" } })}><b>Остаться</b><span>Получить ресурс станции</span></button>{neighbors.map(({ edge, target, status, tunnelId }) => { const node = nodeById.get(target); const selected = myPlan?.kind === "move" && myPlan.edgeId === edge.id && myPlan.target === target && (edge.type === "transfer" || status === "caravan" || myPlan.tunnelId === tunnelId); const key=`${edge.id}-${target}-${tunnelId||status}`; const tunnelLabel=tunnelId==="backward"?"B":tunnelId==="forward"?"A":""; return <button key={key} className={selected ? "pressed" : undefined} onClick={() => sendCommand({ type: "plan", action: { kind: "move", target, edgeId: edge.id, tunnelId } })}><b>{tunnelLabel&&`Тоннель ${tunnelLabel} · `}Идти ↔ <i className="route-station-chip" style={{ borderColor: node?.color }}>{node?.name}</i></b><span>{status === "caravan" ? "🐫 Караван: безопасный проход" : edge.type === "transfer" ? `Кордон · ${getCordonProfile(edge.id).price} ◉${getCordonProfile(edge.id).inspection ? " · шмон" : ""}` : `${node?.lineName} · ${status === "unknown" ? "непонятный" : status === "safe" ? "безопасный" : "открытый"} · двусторонний`}</span></button>; })}</section>}</section>
      <aside className="solo-command">
        <section className="solo-human pixel-panel"><RolePortrait roleId={current.roleId} health={healthRatio(current)}/><div><small>Ваш путник</small><h1>{current.name}</h1><p>{role?.name} · {nodeById.get(current.position)?.name}</p><span>{current.bullets} ◉ · {Math.max(0, 4 - current.lostLimbs.length)}/4 конечности</span></div></section>
        <section className="expedition-race pixel-panel"><p className="pixel-kicker">Гонка к Полису</p><strong>{myFinish ? `Финиш: место ${myFinish.rank}` : `Сейчас ${provisionalPlace}-е из 12`}</strong><span>До Полиса: ≈ {myDistance >= 999 ? "путь закрыт" : `${myDistance} станций`} · лидер: {leaderDistance} станций</span>{save.finaleEndsAfterRound != null && <b>До закрытия Полиса: {Math.max(0, save.finaleEndsAfterRound - save.session.round)} раунд(а)</b>}</section>
        {save.phase === "planning" && myPlan && <section className="expedition-turn-wait pixel-panel"><i/><p><b>Ваш план принят</b><span>Ожидаем остальных игроков. До раскрытия вы можете заменить решение.</span></p></section>}
        {save.phase === "encounters" && (!myEncounter || myEncounter.resolved) && <section className="expedition-turn-wait pixel-panel"><i/><p><b>Ваш шаг завершён</b><span>Другие игроки одновременно разбираются со своими тоннелями.</span></p></section>}
        {save.phase === "encounters" && myEncounter && !myEncounter.resolved && myEncounter.alternatives && <section className="solo-challenge pixel-panel"><span>Способность подростка</span><h2>Два сна</h2><p>Выберите, какое из двух испытаний стало реальностью этого тоннеля.</p><div className="solo-solutions">{myEncounter.alternatives.map((id) => { const card = challengeCards.find((entry) => entry.id === id); return <button key={id} onClick={() => sendCommand({ type: "resolve-encounter", optionId: `event:${id}` })}><b>{card?.title}</b><span>{card?.scene}</span></button>; })}</div></section>}
        {save.phase === "encounters" && myEncounter && !myEncounter.resolved && !myEncounter.alternatives && currentChallenge && <section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div className="solo-solutions">{options.map((option) => { const usable = !option.itemIds?.length || option.itemIds.some((id) => current.inventory.includes(id)); const risk = option.outcome === "risk" ? "Высокий риск · 48% провала" : option.itemIds?.length ? "Низкий риск · 18% провала" : option.bulletCost ? "Очень низкий риск · 12% провала" : option.outcome === "retreat" ? "Без риска · переход отменён" : "Средний риск · 30% провала"; return <button key={option.id} disabled={!usable || Boolean(option.bulletCost && current.bullets < option.bulletCost)} onClick={() => sendCommand({ type: "resolve-encounter", optionId: option.id })}><b>{option.label}</b><span>{option.detail}</span><small>{option.bulletCost ? `${option.bulletCost} ◉ · ` : ""}{risk}</small></button>; })}</div></section>}
        {save.phase === "summary" && <section className="solo-report pixel-panel"><p className="pixel-kicker">Итоги раунда {save.session.round}</p>{save.report.map((line, index) => <p key={index}>{line}</p>)}{isHost ? <button className="pixel-primary" onClick={() => sendCommand({ type: "next-round" })}>Следующий раунд →</button> : <div className="expedition-wait-host"><i/><span>Создатель откроет следующий раунд</span></div>}</section>}
        {takeoverOriginal && <section className="expedition-spectator pixel-panel"><b>Вы продолжаете за ботом вне зачёта</b><span>Исходный персонаж погиб; новый путь не заменит поражение, но вы остаетесь в партии.</span></section>}
        {myPlayer && myPlayer.lostLimbs.length >= 4 && !takeoverOriginal && <section className="expedition-spectator pixel-panel"><p className="pixel-kicker">Персонаж погиб</p><b>Можно продолжить за свободного бота</b><span>Результат бота не заменит поражение исходного персонажа.</span><div>{save.session.players.filter((player) => !save.humanIds.includes(player.id) && !isOut(save, player)).slice(0, 4).map((bot) => <button key={bot.id} onClick={() => sendCommand({ type: "claim-bot", playerId: bot.id })}>{bot.name} · {botProfiles[(bot.id - 1) % 3]}</button>)}</div></section>}
        {save.phase === "finished" && <section className="expedition-results pixel-panel"><p className="pixel-kicker">Финал экспедиции</p><h2>{save.finishers[0] ? `Победитель — ${save.session.players[save.finishers[0].playerId - 1].name}` : "До Полиса никто не дошёл"}</h2><ol>{[...save.session.players].sort((a, b) => (save.finishers.find((entry) => entry.playerId === a.id)?.rank || 99) - (save.finishers.find((entry) => entry.playerId === b.id)?.rank || 99) || distance(a.position, save.session) - distance(b.position, save.session)).map((player) => { const finish = save.finishers.find((entry) => entry.playerId === player.id); const stat = save.stats[player.id]; return <li key={player.id}><b>{finish ? `№${finish.rank}` : "—"} {player.name}</b><span>{finish ? `Полис · раунд ${finish.round}` : player.lostLimbs.length >= 4 ? "погиб" : `не дошёл · осталось ${distance(player.position, save.session)}`}</span><small>{stat.tunnels} переходов · {stat.abilities} способностей · {stat.interventions} вмешательств · {stat.npcs} NPC</small></li>; })}</ol><div className="expedition-awards"><span>Самый длинный путь: <b>{save.session.players.toSorted((a, b) => save.stats[b.id].route.length - save.stats[a.id].route.length)[0]?.name}</b></span><span>Самый богатый: <b>{save.session.players.toSorted((a, b) => b.bullets - a.bullets)[0]?.name}</b></span><span>Камбэк: <b>{save.session.players.filter((player) => save.finishers.some((entry) => entry.playerId === player.id)).toSorted((a, b) => b.lostLimbs.length - a.lostLimbs.length)[0]?.name || "—"}</b></span></div>{isHost && <button className="pixel-primary" onClick={() => sendCommand({ type: "rematch" })}>Реванш: перемешать роли и карту</button>}</section>}
        {myPlayer && save.phase !== "finished" && ability && <section className="expedition-role-panel pixel-panel"><p className="pixel-kicker">Соревновательная способность</p><h3>{myRole?.name} · {ability.title}</h3><p>{ability.description}</p><strong>{ability.cooldown} · {ability.range}</strong><small>Контригра: {ability.counter}</small>{(save.privateNotes?.[myPlayer.id] || []).map((note, index) => <em key={index}>{note}</em>)}{canAct && ["mag", "scientist", "trackman"].includes(myPlayer.roleId) && roleEdges.map((edge) => <button key={edge.id} onClick={() => sendCommand({ type: "competitive-ability", edgeId: edge.id })}>{ability.title}: {nodeById.get(edge.source === myPlayer.position ? edge.target : edge.source)?.name}</button>)}{canAct && ["mother", "medic"].includes(myPlayer.roleId) && [myPlayer, ...coLocated].map((target) => <button key={target.id} onClick={() => sendCommand({ type: "competitive-ability", targetPlayerId: target.id })}>{ability.title}: {target.name}</button>)}{canAct && ["skeptic", "teen", "signalman", "smuggler"].includes(myPlayer.roleId) && <button onClick={() => sendCommand({ type: "competitive-ability" })}>Применить: {ability.title}</button>}</section>}
        {myPlayer && save.phase === "planning" && myCards.length > 0 && <section className="expedition-interventions pixel-panel"><p className="pixel-kicker">Карты вмешательства</p>{myCards.map((cardId) => <article key={cardId}><b>{interventionCards[cardId].name}</b><span>{interventionCards[cardId].text}</span><small>Ответ: {interventionCards[cardId].defense}</small><div>{save.session.players.filter((target) => !isOut(save, target) && (cardId === "caravan-intercept" ? target.id === myPlayer.id : target.id !== myPlayer.id)).slice(0, 6).map((target) => <button key={target.id} onClick={() => sendCommand({ type: "play-intervention", cardId, targetPlayerId: target.id, edgeId: competitivePassages(save, target)[0]?.edge.id })}>{target.name}</button>)}</div></article>)}</section>}
        {pendingTrades.length > 0 && <section className="expedition-offers pixel-panel"><p className="pixel-kicker">Предложения сделок</p>{pendingTrades.map((offer) => <article key={offer.id}><span>{save.session.players[offer.fromId - 1].name} предлагает {offer.itemId ? itemNames[offer.itemId] || offer.itemId : `${offer.bullets} ◉`}</span><button onClick={() => sendCommand({ type: "answer-trade", offerId: offer.id, accept: true })}>Принять</button><button onClick={() => sendCommand({ type: "answer-trade", offerId: offer.id, accept: false })}>Отказать</button></article>)}</section>}
        {pendingAlliances.length > 0 && <section className="expedition-offers pixel-panel"><p className="pixel-kicker">Союз на переход</p>{pendingAlliances.map((offer) => <article key={offer.id}><span>{save.session.players[offer.fromId - 1].name} зовёт вместе к {nodeById.get(offer.target)?.name}</span><button onClick={() => sendCommand({ type: "answer-alliance", offerId: offer.id, accept: true })}>Идём вместе</button><button onClick={() => sendCommand({ type: "answer-alliance", offerId: offer.id, accept: false })}>Отказать</button></article>)}</section>}
        {myPlayer && save.phase !== "finished" && <section className="expedition-inventory pixel-panel"><p className="pixel-kicker">Ваш инвентарь и сделки</p>{inventoryGroups.length === 0 && <span>Рюкзак пуст.</span>}{inventoryGroups.map(([item, count]) => <article key={item}><div><b>{item.startsWith("knowledge:") ? `Знание: ${nodeById.get(item.slice(10))?.name}` : itemNames[item] || item}</b><span>{count > 1 ? `×${count}` : suspiciousLabel(item)}</span></div><em>{item === "medkit" && <button disabled={myPlayer.lostLimbs.length === 0} onClick={() => sendCommand({ type: "use-item", itemId: item })}>Лечиться</button>}{save.session.players.filter((target) => target.id !== myPlayer.id && !isOut(save, target) && (target.position === myPlayer.position || myPlayer.roleId === "shuttle")).slice(0, 6).map((target) => <button key={target.id} onClick={() => sendCommand({ type: "offer-trade", itemId: item, targetPlayerId: target.id })}>Предложить → {target.name}</button>)}<button onClick={() => sendCommand({ type: "discard-item", itemId: item })}>Выбросить</button></em></article>)}</section>}
        {myPlayer && save.phase === "planning" && coLocated.length > 0 && neighbors.length > 0 && <section className="expedition-alliances pixel-panel"><p className="pixel-kicker">Временный союз</p><span>Согласуйте один общий безопасный переход. Предмет при испытании расходуется у того, кто его разыграл.</span>{coLocated.flatMap((target) => neighbors.slice(0, 3).map((option) => <button key={`${target.id}-${option.edge.id}-${option.target}`} onClick={() => sendCommand({ type: "offer-alliance", targetPlayerId: target.id, edgeId: option.edge.id, target: option.target })}>{target.name} → {nodeById.get(option.target)?.name}</button>))}</section>}
        {myPlayer && (availableNpcs.length > 0 || ownedNpcs.length > 0) && <section className="expedition-npcs pixel-panel"><p className="pixel-kicker">NPC рядом и с вами</p>{availableNpcs.map((npc) => <article key={npc.id}><b>{npc.name} · {npc.price} ◉</b><span>{npc.service}</span><button disabled={myPlayer.bullets < npc.price} onClick={() => sendCommand({ type: "recruit-npc", npcId: npc.id })}>{myPlayer.bullets < npc.price ? `Не хватает ${npc.price - myPlayer.bullets} ◉` : "Взять с собой"}</button></article>)}{ownedNpcs.map((npc) => <article key={npc.id} className={save.session.world.npcServiceUsed[npc.id] ? "used" : ""}><b>{npc.name} · идёт с вами</b><span>{save.session.world.npcServiceUsed[npc.id] ? "Услуга уже использована — NPC остаётся с вами" : npc.service}</span><button disabled={save.session.world.npcServiceUsed[npc.id]} onClick={() => sendCommand({ type: "use-npc", npcId: npc.id })}>Применить услугу</button>{coLocated.map((target) => <button key={target.id} onClick={() => sendCommand({ type: "transfer-npc", npcId: npc.id, targetPlayerId: target.id })}>Передать → {target.name}</button>)}</article>)}</section>}
        <section className="expedition-roster pixel-panel"><p className="pixel-kicker">Кто в пути</p>{save.session.players.map((player) => { const finish = save.finishers.find((entry) => entry.playerId === player.id); const human = save.humanIds.includes(player.id) && !save.botControlledIds.includes(player.id); return <div key={player.id}><b>{player.name}</b><span>{finish ? `Полис · №${finish.rank}` : player.lostLimbs.length >= 4 ? "погиб" : human ? "человек" : "бот"}</span><i>{nodeById.get(player.position)?.name} · {Math.max(0, 4 - player.lostLimbs.length)}/4</i>{isHost && save.humanIds.includes(player.id) && <em>{save.botControlledIds.includes(player.id) ? <button onClick={() => sendCommand({ type: "restore-human", playerId: player.id })}>Вернуть игроку</button> : <button onClick={() => sendCommand({ type: "bot-takeover", playerId: player.id })}>Передать боту</button>}</em>}</div>; })}</section>
      </aside>
    </div>
  </main>;
}
