"use client";

import Peer, { type DataConnection } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { activeCaravansForRound } from "./caravan-data";
import { challengeCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { cordonRules, getCordonProfile, itemInspectionRisk, npcCards, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type MetroEdge = { id: string; source: string; target: string; type: string; color: string };
type SetupPlayer = { name: string; roleId: string; start: string };
type ExpeditionPhase = "planning" | "challenge" | "cordon" | "summary" | "finished";
type FinishRecord = { playerId: number; rank: number; round: number };
type PlayerStats = { tunnels: number; visited: string[]; healed: number; knowledge: string[] };
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
  | { type: "next-round" };
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
const emptyStats = (): PlayerStats => ({ tunnels: 0, visited: [], healed: 0, knowledge: [] });
const hostStorageKey = "golosa-expedition-host-room-v2";
const guestStorageKey = "golosa-expedition-guest-room-v1";
const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomPeerId = (code: string) => `golosa-pod-moskvoy-${code.toLowerCase()}`;
const makeCode = () => Array.from({ length: 6 }, () => roomAlphabet[Math.floor(Math.random() * roomAlphabet.length)]).join("");
const makeClientId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function edgeStatus(session: NetworkSession, edge: MetroEdge, position: string) {
  if (edge.type === "transfer") return "cordon";
  const direction = edge.source === position ? "forward" : "backward";
  return session.world.edges[`${edge.id}::${direction}`] || (scenarioEdgeMarks as Record<string, string>)[`${edge.id}::${direction}`] || "normal";
}

function passages(position: string, session: NetworkSession) {
  const ordinary = edges.flatMap((edge) => {
    if (edge.source !== position && edge.target !== position) return [];
    const target = edge.source === position ? edge.target : edge.source;
    const status = edgeStatus(session, edge, position);
    return status === "closed" ? [] : [{ edge, target, status }];
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
  const humanIds = members.map((_, index) => index + 1);
  const stats = Object.fromEntries(session.players.map((player) => [player.id, { ...emptyStats(), visited: [player.position] }]));
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
    },
  };
}

function normalizedSave(save: ExpeditionSave): ExpeditionSave {
  return {
    ...save,
    finishers: save.finishers || [],
    botControlledIds: save.botControlledIds || [],
    stats: save.stats || Object.fromEntries(save.session.players.map((player) => [player.id, { ...emptyStats(), visited: [player.position] }])),
    roleUses: save.roleUses || {},
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
    report.push(`Караван передал: ${itemNames[outcome.reward] || outcome.reward}.`);
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
  const quietChance = passage.status === "safe" ? 0.45 : 0.1;
  if (Math.random() < quietChance) return finishTurn(pending, { move: true, note: "Тоннель оказался тихим. Переход прошёл без испытания." });
  const pool = challengeCards.filter((card) => card.id !== "people-01");
  const card = pool[Math.floor(Math.random() * pool.length)];
  session.activeChallenge = card.id;
  return { ...pending, session, phase: "challenge", report: [...base.report, "Открыта карта тоннеля."] };
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
  if (command.type === "recruit-npc") {
    if (session.world.npcOwners[npc.id] != null || session.world.npcPositions[npc.id] !== player.position || player.bullets < npc.price) return base;
    player.bullets -= npc.price;
    session.world.npcOwners[npc.id] = player.id;
    report.push(`${player.name} нанял NPC «${npc.name}» за ${npc.price} ◉.`);
    return { ...base, session, report };
  }
  if (session.world.npcOwners[npc.id] !== player.id || session.world.npcServiceUsed[npc.id]) return base;
  session.world.npcServiceUsed[npc.id] = true;
  if (/возвращает одну руку|возвращает одну.*ногу|восстанавливает/i.test(npc.service) && player.lostLimbs.length) {
    player.lostLimbs.pop();
    report.push(`${npc.name} восстановил конечность игроку ${player.name}.`);
  } else if (/аптечк/i.test(npc.service)) {
    player.inventory.push("medkit");
    report.push(`${npc.name} выдал аптечку.`);
  } else if (/патрон/i.test(npc.service)) {
    player.bullets += 3;
    report.push(`${npc.name} принёс 3 ◉.`);
  } else {
    player.inventory.push("npc_pass");
    report.push(`${npc.name} подготовил безопасный проход через следующий тоннель.`);
  }
  return { ...base, session, report };
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
    if (existing) return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, connected: true } : member) };
    if (room.status !== "lobby" || room.members.length >= 12) return room;
    const usedRoles = new Set(room.members.map((member) => member.roleId));
    const roleId = usedRoles.has(command.member.roleId) ? roleCards.find((role) => !usedRoles.has(role.id))?.id || command.member.roleId : command.member.roleId;
    return { ...room, members: [...room.members, { ...command.member, clientId: sourceClientId, roleId, connected: true }] };
  }
  if (command.type === "disconnect") return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, connected: false } : member) };
  if (command.type === "profile" && room.status === "lobby") return sanitizeProfile(room, sourceClientId, command.patch);
  if (command.type === "ready" && room.status === "lobby") return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, ready: command.ready } : member) };
  if (command.type === "start" && sourceClientId === room.hostClientId && room.status === "lobby" && room.members.filter((member) => member.connected).length >= 2 && room.members.filter((member) => member.connected).every((member) => member.ready)) {
    const activeMembers = room.members.filter((member) => member.connected);
    return { ...room, status: "playing", ...createExpedition(room.code, activeMembers) };
  }
  if (!room.save || room.status !== "playing") return room;
  const save = normalizedSave(room.save);
  const sourcePlayerId = room.playerByClient[sourceClientId];
  const activePlayerId = save.humanIds[save.activeHuman];
  const isHost = sourceClientId === room.hostClientId;
  if (command.type === "next-round" && isHost && save.phase === "summary") return { ...room, save: nextRound(save) };
  if (command.type === "bot-takeover" && isHost) return { ...room, save: botTakeover(save, command.playerId) };
  if (command.type === "restore-human" && isHost) return { ...room, save: { ...save, botControlledIds: save.botControlledIds.filter((id) => id !== command.playerId), report: [...save.report, `${save.session.players[command.playerId - 1]?.name} снова управляется человеком.`] } };
  if (command.type === "skip-disconnected" && isHost) {
    const activeClientId = Object.entries(room.playerByClient).find(([, id]) => id === activePlayerId)?.[0];
    const member = room.members.find((entry) => entry.clientId === activeClientId);
    if (member?.connected !== false) return room;
    return { ...room, save: finishTurn(save, { move: false, note: `Ход игрока ${save.session.players[activePlayerId - 1]?.name} пропущен после потери соединения.` }) };
  }
  if (!sourcePlayerId) return room;
  if (command.type === "use-item" || command.type === "discard-item" || command.type === "give-item") return { ...room, save: updatePlayerInventory(save, sourcePlayerId, command) };
  if (command.type === "recruit-npc" || command.type === "use-npc") return { ...room, save: updateNpc(save, sourcePlayerId, command) };
  if (command.type === "role-action") return { ...room, save: applyRoleAction(save, sourcePlayerId, command.edgeId) };
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
    members: room.members.map((member) => ({ ...member, ready: member.ready ?? room.status === "playing" })),
    save: room.save ? normalizedSave(room.save) : null,
  };
}

export function ExpeditionConsole() {
  const [clientId] = useState(() => sessionStorage.getItem("golosa-client-id") || makeClientId());
  const peerRef = useRef<Peer | null>(null);
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const guestConnectionsRef = useRef(new Map<string, DataConnection>());
  const [room, setRoom] = useState<SharedRoom | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");
  const [entryMode, setEntryMode] = useState<"choice" | "create" | "join">("choice");
  const [joinCode, setJoinCode] = useState("");
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
    const guestConnections = guestConnectionsRef.current;
    sessionStorage.setItem("golosa-client-id", clientId);
    return () => {
      hostConnectionRef.current?.close();
      peerRef.current?.destroy();
      guestConnections.clear();
    };
  }, [clientId]);

  const applyHostCommand = useCallback((command: RoomCommand, sourceClientId: string) => {
    setRoom((current) => current ? reduceRoom(current, command, sourceClientId) : current);
  }, []);

  useEffect(() => {
    if (!room || room.hostClientId !== clientId) return;
    localStorage.setItem(hostStorageKey, JSON.stringify(room));
    guestConnectionsRef.current.forEach((connection) => {
      if (connection.open) connection.send({ type: "state", room });
    });
  }, [clientId, room]);

  const destroyConnection = () => {
    hostConnectionRef.current?.close();
    hostConnectionRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
    guestConnectionsRef.current.clear();
  };

  const bindHostPeer = (peer: Peer) => {
    peer.on("connection", (connection) => {
      const sourceClientId = String(connection.metadata?.clientId || connection.peer);
      guestConnectionsRef.current.set(connection.connectionId, connection);
      connection.on("open", () => {
        setRoom((current) => {
          if (current) connection.send({ type: "state", room: current });
          return current;
        });
      });
      connection.on("data", (data) => {
        const command = data as RoomCommand;
        if (command?.type) applyHostCommand(command, sourceClientId);
      });
      connection.on("error", () => {
        guestConnectionsRef.current.delete(connection.connectionId);
        applyHostCommand({ type: "disconnect" }, sourceClientId);
      });
      connection.on("close", () => {
        guestConnectionsRef.current.delete(connection.connectionId);
        applyHostCommand({ type: "disconnect" }, sourceClientId);
      });
    });
  };

  const createRoom = () => {
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    const code = makeCode();
    const peer = new Peer(roomPeerId(code), { debug: 1 });
    peerRef.current = peer;
    bindHostPeer(peer);
    peer.on("open", () => {
      const host = newLobbyMember(clientId, profile.name || "Создатель партии", profile.roleId, profile.start);
      setRoom({ code, hostClientId: clientId, status: "lobby", members: [host], playerByClient: {}, save: null });
      setConnectionStatus("connected");
    });
    peer.on("error", (error) => {
      setConnectionStatus("error");
      setConnectionError(error.type === "unavailable-id" ? "Такой код уже занят. Нажмите «Создать» ещё раз." : "Не удалось открыть комнату. Проверьте интернет и попробуйте снова.");
    });
  };

  const restoreHostRoom = () => {
    if (!restorableRoom) return;
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    const peer = new Peer(roomPeerId(restorableRoom.code), { debug: 1 });
    peerRef.current = peer;
    bindHostPeer(peer);
    peer.on("open", () => {
      const restored = normalizeRoom(restorableRoom);
      const previousHostId = restored.hostClientId;
      const hostPlayerId = restored.playerByClient[previousHostId];
      const playerByClient = { ...restored.playerByClient };
      delete playerByClient[previousHostId];
      if (hostPlayerId) playerByClient[clientId] = hostPlayerId;
      setRoom({
        ...restored,
        hostClientId: clientId,
        playerByClient,
        members: restored.members.map((member) => member.clientId === previousHostId ? { ...member, clientId, connected: true } : { ...member, connected: false }),
      });
      setConnectionStatus("connected");
    });
    peer.on("error", () => {
      setConnectionStatus("error");
      setConnectionError("Старая комната ещё занята. Подождите несколько секунд и повторите восстановление.");
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
    const peer = new Peer({ debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => {
      // A started expedition is much larger than PeerJS' 16 KB JSON-message
      // limit. Binary serialization automatically chunks the shared room, so
      // the game state continues to reach every computer after the lobby.
      const connection = peer.connect(roomPeerId(code), { reliable: true, serialization: "binary", metadata: { clientId } });
      hostConnectionRef.current = connection;
      connection.on("open", () => {
        sessionStorage.setItem(guestStorageKey, JSON.stringify({ code, profile: memberProfile }));
        connection.send({ type: "join", member: newLobbyMember(clientId, memberProfile.name || "Путник", memberProfile.roleId, memberProfile.start) } satisfies RoomCommand);
        setConnectionStatus("connected");
      });
      connection.on("data", (data) => {
        const message = data as { type?: string; room?: SharedRoom };
        if (message.type === "state" && message.room) setRoom(normalizeRoom(message.room));
      });
      connection.on("close", () => {
        setConnectionStatus("error");
        setConnectionError("Связь с создателем партии потеряна.");
      });
      connection.on("error", () => {
        setConnectionStatus("error");
        setConnectionError("Не удалось войти в эту комнату.");
      });
    });
    peer.on("error", (error) => {
      setConnectionStatus("error");
      setConnectionError(error.type === "peer-unavailable" ? "Комната с таким кодом не найдена." : "Не удалось подключиться. Проверьте код и интернет.");
    });
  };

  const joinRoom = () => connectGuest(joinCode, profile);
  const reconnectRoom = () => {
    if (!room) return;
    const member = room.members.find((entry) => entry.clientId === clientId);
    connectGuest(room.code, member || profile);
  };

  const isHost = room?.hostClientId === clientId;
  const sendCommand = (command: RoomCommand) => {
    if (isHost) applyHostCommand(command, clientId);
    else if (hostConnectionRef.current?.open) hostConnectionRef.current.send(command);
  };
  const updateProfile = (patch: Partial<SetupPlayer>) => {
    setProfile((current) => ({ ...current, ...patch }));
    if (room?.status === "lobby") sendCommand({ type: "profile", patch });
  };

  if (!room) {
    return <main className="expedition-entry">
      <a href="./" className="solo-back">← Три режима</a>
      <section className="expedition-entry-hero">
        <p className="pixel-kicker">Режим 02 · сетевая партия</p>
        <h1>Спускайтесь<br/><span>с разных компьютеров</span></h1>
        <p>Один человек создаёт комнату и получает код. Остальные входят по этому коду. Когда в лобби соберутся хотя бы двое, создатель запускает экспедицию — свободные роли займут боты.</p>
        <div className="expedition-network-note"><i/>Прямое соединение между участниками · без регистрации</div>
      </section>
      <section className="expedition-entry-panel pixel-panel">
        {entryMode === "choice" && <>
          <p className="pixel-kicker">Как войти?</p>
          <h2>Собрать компанию</h2>
          <button className="pixel-primary" onClick={() => setEntryMode("create")}><span>Создать новую партию</span><b>→</b></button>
          <button onClick={() => setEntryMode("join")}><span>Войти по коду</span><b>⌁</b></button>
          {restorableRoom && <button className="expedition-restore" onClick={restoreHostRoom}><span>Восстановить комнату {restorableRoom.code}</span><b>↻</b></button>}
          {!restorableRoom && guestResume && <button className="expedition-restore" onClick={() => connectGuest(guestResume.code, guestResume.profile)}><span>Вернуться в комнату {guestResume.code}</span><b>↻</b></button>}
        </>}
        {entryMode !== "choice" && <>
          <button className="expedition-entry-back" onClick={() => { setEntryMode("choice"); setConnectionError(""); }}>← Назад</button>
          <p className="pixel-kicker">{entryMode === "create" ? "Новая комната" : "Приглашение"}</p>
          <h2>{entryMode === "create" ? "Представьтесь" : "Войти к друзьям"}</h2>
          <label>Имя<input value={profile.name} maxLength={24} placeholder="Как вас называть?" onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}/></label>
          {entryMode === "join" && <label>Код комнаты<input className="expedition-code-input" value={joinCode} maxLength={6} placeholder="A7K2MP" onChange={(event) => setJoinCode(event.target.value.toUpperCase())}/></label>}
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
    return <main className="expedition-lobby">
      <a href="./" className="solo-back">← Выйти</a>
      <header>
        <div><p className="pixel-kicker">Комната открыта</p><h1>Код <span>{room.code}</span></h1><p>Передайте друзьям этот код. Они выбирают режим «Люди и боты» → «Войти по коду».</p></div>
        <button onClick={() => navigator.clipboard?.writeText(room.code)}>Скопировать код</button>
      </header>
      <div className="expedition-lobby-layout">
        <section className="expedition-members pixel-panel">
          <div><p className="pixel-kicker">Участники</p><b>{connectedMembers.length}/12</b></div>
          {room.members.map((member, index) => <article key={member.clientId} className={!member.connected ? "offline" : ""}>
            <RolePortrait roleId={member.roleId}/><div><strong>{member.name}</strong><span>{roleCards.find((role) => role.id === member.roleId)?.name}</span></div><i>{!member.connected ? "нет связи" : member.ready ? "готов" : member.clientId === room.hostClientId ? "создатель" : `игрок ${index + 1}`}</i>
          </article>)}
          {Array.from({ length: Math.max(0, 2 - room.members.length) }).map((_, index) => <div className="expedition-empty-member" key={index}>Ожидаем ещё одного путника…</div>)}
        </section>
        <section className="expedition-profile pixel-panel">
          <p className="pixel-kicker">Ваш выбор</p>
          <RolePortrait roleId={myMember?.roleId || profile.roleId}/>
          <label>Имя<input value={myMember?.name || profile.name} onChange={(event) => updateProfile({ name: event.target.value })}/></label>
          <label>Персонаж<select value={myMember?.roleId || profile.roleId} onChange={(event) => updateProfile({ roleId: event.target.value })}>{roleCards.map((role) => <option key={role.id} value={role.id} disabled={usedRoles.has(role.id)}>{role.name}</option>)}</select></label>
          <label>Стартовая станция<select value={myMember?.start || profile.start} onChange={(event) => updateProfile({ start: event.target.value })}>{starts.map((id) => <option key={id} value={id}>{nodeById.get(id)?.name} · {nodeById.get(id)?.lineName}</option>)}</select></label>
          <button className={myMember?.ready ? "expedition-ready active" : "expedition-ready"} onClick={() => sendCommand({ type: "ready", ready: !myMember?.ready })}>{myMember?.ready ? "✓ Готов — изменить выбор" : "Подтвердить готовность"}</button>
          {isHost ? <button className="pixel-primary expedition-start-room" disabled={!everyoneReady} onClick={() => sendCommand({ type: "start" })}><span>{connectedMembers.length < 2 ? "Нужно минимум двое" : !everyoneReady ? "Ждём готовность игроков" : "Начать экспедицию"}</span><b>→</b></button> : <div className="expedition-wait-host"><i/><span>{myMember?.ready ? "Готовность принята. Создатель запустит игру." : "Подтвердите выбор, когда будете готовы."}</span></div>}
        </section>
      </div>
    </main>;
  }

  const storedSave = room.save;
  if (!storedSave) return null;
  const save = normalizedSave(storedSave);
  const current = save.session.players[save.humanIds[save.activeHuman] - 1] || save.session.players[0];
  const myPlayerId = room.playerByClient[clientId];
  const myPlayer = myPlayerId ? save.session.players[myPlayerId - 1] : null;
  const canAct = Boolean(myPlayer && current.id === myPlayer.id && !save.botControlledIds.includes(myPlayer.id) && !isOut(save, myPlayer));
  const currentChallenge = challengeCards.find((card) => card.id === save.session.activeChallenge);
  const options: ChallengeOption[] = currentChallenge ? (challengeSolutions[currentChallenge.id] || []).filter((option) => !option.roleIds?.length) : [];
  const role = roleCards.find((entry) => entry.id === current.roleId);
  const myRole = roleCards.find((entry) => entry.id === myPlayer?.roleId);
  const neighbors = passages(current.position, save.session);
  const activeClientId = Object.entries(room.playerByClient).find(([, playerId]) => playerId === current.id)?.[0];
  const activeMember = room.members.find((member) => member.clientId === activeClientId);
  const myFinish = save.finishers.find((entry) => entry.playerId === myPlayer?.id);
  const myStats = myPlayer ? save.stats[myPlayer.id] || emptyStats() : emptyStats();
  const inventoryGroups = myPlayer ? Object.entries(myPlayer.inventory.reduce<Record<string, number>>((result, item) => ({ ...result, [item]: (result[item] || 0) + 1 }), {})) : [];
  const coLocated = myPlayer ? save.session.players.filter((player) => player.id !== myPlayer.id && player.position === myPlayer.position && !isOut(save, player)) : [];
  const availableNpcs = myPlayer ? npcCards.filter((npc) => save.session.world.npcPositions[npc.id] === myPlayer.position && save.session.world.npcOwners[npc.id] == null) : [];
  const ownedNpcs = myPlayer ? npcCards.filter((npc) => save.session.world.npcOwners[npc.id] === myPlayer.id) : [];
  const cordonProfile = save.pendingEdge ? getCordonProfile(save.pendingEdge) : null;
  const cordonToll = cordonProfile ? cordonRules.calculate(1, save.session.time, cordonProfile.price) : 0;
  const inspectionItem = current.inventory.map((item) => ({ item, risk: itemInspectionRisk[item] || 0 })).sort((a, b) => b.risk - a.risk)[0];
  const roleEdges = myPlayer ? edges.filter((edge) => edge.source === myPlayer.position || edge.target === myPlayer.position).filter((edge) => {
    const status = edgeStatus(save.session, edge, myPlayer.position);
    return myPlayer.roleId === "mag" ? status === "unknown" : myPlayer.roleId === "trackman" ? status === "closed" || status === "unknown" : false;
  }) : [];
  const goalProgress = myPlayer?.roleId === "mag" ? `${myStats.tunnels}/15 тоннелей` : myPlayer?.roleId === "scientist" ? `${myStats.knowledge.length}/3 знания` : myPlayer?.roleId === "medic" ? `${myStats.healed}/2 лечений` : "выполняется решениями игрока";

  return <main className="solo-shell expedition-shell">
    <header className="solo-header"><div><span>Раунд {save.session.round}</span><b>{save.session.time}</b><i>{save.activeHuman + 1}/{save.humanIds.length} ход человека</i></div><strong>Комната {room.code}</strong><a href="./">Режимы</a></header>
    {connectionStatus === "error" && !isHost && <div className="expedition-connection-alert"><span>{connectionError || "Связь с создателем потеряна."}</span><button onClick={reconnectRoom}>Переподключиться</button></div>}
    <div className="solo-layout">
      <MetroNetworkMap state={save.session} focusIds={save.session.players.map((player) => player.position)} compact={false}/>
      <aside className="solo-command">
        <section className="solo-human pixel-panel"><RolePortrait roleId={current.roleId}/><div><small>{canAct ? "Ваш ход" : "Сейчас ходит"}</small><h1>{current.name}</h1><p>{role?.name} · {nodeById.get(current.position)?.name}</p><span>{current.bullets} ◉ · {Math.max(0, 4 - current.lostLimbs.length)}/4 конечности</span></div></section>
        {!canAct && save.phase !== "summary" && save.phase !== "finished" && <section className="expedition-turn-wait pixel-panel"><i/><p><b>Ждём решение игрока</b><span>{activeMember?.connected === false ? "Игрок потерял соединение. Создатель может пропустить ход или передать персонажа боту." : "Карта обновится автоматически после его хода."}</span>{isHost && activeMember?.connected === false && <em><button onClick={() => sendCommand({ type: "skip-disconnected" })}>Пропустить ход</button><button onClick={() => sendCommand({ type: "bot-takeover", playerId: current.id })}>Передать боту</button></em>}</p></section>}
        {canAct && save.phase === "planning" && <section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={() => sendCommand({ type: "choose", target: null })}><b>Остаться</b><span>Получить ресурс станции</span></button>{neighbors.map(({ edge, target, status }) => { const node = nodeById.get(target); return <button key={`${edge.id}-${target}`} onClick={() => sendCommand({ type: "choose", target, edgeId: edge.id })}><b>Идти → <i className="route-station-chip" style={{ borderColor: node?.color }}>{node?.name}</i></b><span>{status === "caravan" ? "🐫 Караван: испытания не будет" : edge.type === "transfer" ? `Кордон · выбор оплаты или шмона` : node?.lineName}</span></button>; })}</section>}
        {canAct && save.phase === "cordon" && cordonProfile && <section className="solo-cordon pixel-panel"><span>Межлинейный переход</span><h2>{cordonProfile.title}</h2><p>{cordonProfile.guardText}</p><strong>{cordonProfile.inspection ? "Этот пост проводит шмон вместо обычной пошлины. Подозрительный предмет потребует доплаты." : "Этот пост берёт фиксированную пошлину и не проводит досмотр."}</strong>{cordonProfile.inspection ? <button disabled={current.bullets < (inspectionItem?.risk || 0)} onClick={() => sendCommand({ type: "resolve-cordon", mode: "inspection" })}>Пройти шмон · возможная доплата {inspectionItem?.risk || 0} ◉</button> : <button disabled={current.bullets < cordonToll} onClick={() => sendCommand({ type: "resolve-cordon", mode: "pay" })}>Заплатить {cordonToll} ◉ · без досмотра</button>}<button disabled={!current.inventory.includes("pass")} onClick={() => sendCommand({ type: "resolve-cordon", mode: "pass" })}>Предъявить разовый пропуск</button><button onClick={() => sendCommand({ type: "resolve-cordon", mode: "retreat" })}>Отступить на станцию</button></section>}
        {canAct && save.phase === "challenge" && currentChallenge && <section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div className="solo-solutions">{options.map((option) => { const usable = !option.itemIds?.length || option.itemIds.some((id) => current.inventory.includes(id)); const risk = option.outcome === "risk" ? "Высокий риск · 48% провала" : option.itemIds?.length ? "Низкий риск · 18% провала" : option.bulletCost ? "Очень низкий риск · 12% провала" : option.outcome === "retreat" ? "Без риска · ход потерян" : "Средний риск · 30% провала"; return <button key={option.id} disabled={!usable || Boolean(option.bulletCost && current.bullets < option.bulletCost)} onClick={() => sendCommand({ type: "resolve", optionId: option.id })}><b>{option.label}</b><span>{option.detail}</span><small>{option.bulletCost ? `${option.bulletCost} ◉ · ` : ""}{risk}</small></button>; })}</div></section>}
        {save.phase === "summary" && <section className="solo-report pixel-panel"><p className="pixel-kicker">Итоги раунда {save.session.round}</p>{save.report.map((line, index) => <p key={index}>{line}</p>)}{isHost ? <button className="pixel-primary" onClick={() => sendCommand({ type: "next-round" })}>Следующий раунд →</button> : <div className="expedition-wait-host"><i/><span>Создатель откроет следующий раунд</span></div>}</section>}
        {(save.phase === "finished" || myFinish || (myPlayer?.lostLimbs.length || 0) >= 4) && <section className={`solo-report pixel-panel ${myFinish ? "won" : "dead"}`}><p className="pixel-kicker">Путь завершён</p><h2>{myFinish?.rank === 1 ? "Суперпобеда" : myFinish && myFinish.rank <= 6 ? "Победа" : myFinish ? "Вы добрались" : "Персонаж погиб"}</h2>{myFinish && <div className="solo-ending"><strong>Место {myFinish.rank} из 12</strong><p>{myFinish.rank === 1 ? "Вы первым вошли в Полис. Сделайте скрин и пришлите Тане ✦" : myFinish.rank <= 6 ? "Вы вошли в первую шестёрку." : "Полис достигнут, но первая шестёрка уже собралась."}</p></div>}{save.phase === "finished" && !myFinish && (myPlayer?.lostLimbs.length || 0) < 4 && <p>Все люди завершили путь; ваш персонаж был передан боту.</p>}</section>}
        {myPlayer && <section className="expedition-role-panel pixel-panel"><p className="pixel-kicker">Ваша роль</p><h3>{myRole?.name}</h3><p>{myRole?.ability}</p><strong>Цель: {myRole?.goal}</strong><small>Прогресс: {goalProgress}</small>{canAct && save.phase === "planning" && roleEdges.map((edge) => <button key={edge.id} onClick={() => sendCommand({ type: "role-action", edgeId: edge.id })}>{myPlayer.roleId === "trackman" ? "Восстановить" : "Осмотреть"}: {nodeById.get(edge.source === myPlayer.position ? edge.target : edge.source)?.name}</button>)}</section>}
        {myPlayer && <section className="expedition-inventory pixel-panel"><p className="pixel-kicker">Ваш инвентарь</p>{inventoryGroups.length === 0 && <span>Рюкзак пуст.</span>}{inventoryGroups.map(([item, count]) => <article key={item}><div><b>{item.startsWith("knowledge:") ? `Знание: ${nodeById.get(item.slice(10))?.name}` : itemNames[item] || item}</b><span>{count > 1 ? `×${count}` : suspiciousLabel(item)}</span></div><em>{item === "medkit" && <button disabled={myPlayer.lostLimbs.length === 0} onClick={() => sendCommand({ type: "use-item", itemId: item })}>Лечиться</button>}{coLocated.map((target) => <button key={target.id} onClick={() => sendCommand({ type: "give-item", itemId: item, targetPlayerId: target.id })}>{myPlayer.roleId === "medic" && item === "medkit" && target.lostLimbs.length > 0 ? "Лечить" : "Передать"} → {target.name}</button>)}<button onClick={() => sendCommand({ type: "discard-item", itemId: item })}>Выбросить</button></em></article>)}</section>}
        {myPlayer && (availableNpcs.length > 0 || ownedNpcs.length > 0) && <section className="expedition-npcs pixel-panel"><p className="pixel-kicker">NPC рядом и с вами</p>{availableNpcs.map((npc) => <article key={npc.id}><b>{npc.name} · {npc.price} ◉</b><span>{npc.service}</span><button disabled={myPlayer.bullets < npc.price} onClick={() => sendCommand({ type: "recruit-npc", npcId: npc.id })}>Нанять</button></article>)}{ownedNpcs.map((npc) => <article key={npc.id} className={save.session.world.npcServiceUsed[npc.id] ? "used" : ""}><b>{npc.name}</b><span>{save.session.world.npcServiceUsed[npc.id] ? "Услуга уже использована" : npc.service}</span><button disabled={save.session.world.npcServiceUsed[npc.id]} onClick={() => sendCommand({ type: "use-npc", npcId: npc.id })}>Применить услугу</button></article>)}</section>}
        {myPlayer && myPlayer.id !== current.id && <section className="expedition-my-status pixel-panel"><p className="pixel-kicker">Ваш путник</p><b>{myPlayer.name}</b><span>{nodeById.get(myPlayer.position)?.name}</span><i>{myPlayer.bullets} ◉ · {Math.max(0, 4 - myPlayer.lostLimbs.length)}/4 конечности</i></section>}
        <section className="expedition-roster pixel-panel"><p className="pixel-kicker">Кто в пути</p>{save.session.players.map((player) => { const finish = save.finishers.find((entry) => entry.playerId === player.id); const human = save.humanIds.includes(player.id) && !save.botControlledIds.includes(player.id); return <div key={player.id}><b>{player.name}</b><span>{finish ? `Полис · №${finish.rank}` : player.lostLimbs.length >= 4 ? "погиб" : human ? "человек" : "бот"}</span><i>{nodeById.get(player.position)?.name} · {Math.max(0, 4 - player.lostLimbs.length)}/4</i>{isHost && save.humanIds.includes(player.id) && <em>{save.botControlledIds.includes(player.id) ? <button onClick={() => sendCommand({ type: "restore-human", playerId: player.id })}>Вернуть игроку</button> : <button onClick={() => sendCommand({ type: "bot-takeover", playerId: player.id })}>Передать боту</button>}</em>}</div>; })}</section>
      </aside>
    </div>
  </main>;
}
