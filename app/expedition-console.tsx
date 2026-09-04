"use client";

import Peer, { type DataConnection } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { activeCaravansForRound } from "./caravan-data";
import { challengeCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { getCordonProfile, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type MetroEdge = { id: string; source: string; target: string; type: string; color: string };
type SetupPlayer = { name: string; roleId: string; start: string };
type ExpeditionPhase = "planning" | "challenge" | "summary";
type ExpeditionSave = {
  session: NetworkSession;
  humanIds: number[];
  activeHuman: number;
  phase: ExpeditionPhase;
  pendingTarget: string | null;
  pendingEdge: string | null;
  report: string[];
  traversals: { source: string; target: string; playerId: number }[];
};
type Outcome = { move: boolean; injury?: boolean; note: string; reward?: string };
type LobbyMember = SetupPlayer & { clientId: string; connected: boolean; joinedAt: number };
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
  | { type: "disconnect" }
  | { type: "start" }
  | { type: "choose"; target: string | null; edgeId?: string }
  | { type: "resolve"; optionId: string }
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
const itemNames: Record<string, string> = { chalk: "Мел", cloth: "Плотная ткань", wire: "Моток проволоки", lighter: "Зажигалка", tourniquet: "Жгут", medkit: "Аптечка" };
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
    world: { ...session.world, edges: { ...session.world.edges } },
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
  return {
    playerByClient: Object.fromEntries(members.map((member, index) => [member.clientId, index + 1])),
    save: {
      session,
      humanIds,
      activeHuman: 0,
      phase: "planning",
      pendingTarget: null,
      pendingEdge: null,
      report: ["Экспедиция началась. Ход передаётся людям по очереди, затем идут боты."],
      traversals: [],
    },
  };
}

function finishTurn(base: ExpeditionSave, outcome: Outcome): ExpeditionSave {
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  const source = player.position;
  const report = [outcome.note];
  const traversals = [...base.traversals];
  if (outcome.move && base.pendingTarget) {
    player.position = base.pendingTarget;
    traversals.push({ source, target: base.pendingTarget, playerId: player.id });
  }
  if (outcome.injury) {
    const limb = limbCycle.find((entry) => !player.lostLimbs.includes(entry));
    if (limb) player.lostLimbs.push(limb);
    report.push(`${player.name} потерял конечность.`);
  }
  if (outcome.reward) {
    player.inventory.push(outcome.reward);
    report.push(`Караван передал: ${itemNames[outcome.reward] || outcome.reward}.`);
  }
  if (base.activeHuman < base.humanIds.length - 1) {
    return { ...base, session, traversals, activeHuman: base.activeHuman + 1, phase: "planning", pendingTarget: null, pendingEdge: null, report };
  }
  session.players.filter((candidate) => !base.humanIds.includes(candidate.id)).forEach((bot) => {
    if (polisIds.has(bot.position)) return;
    const shouldStay = Math.random() < 0.46 || (bot.lostLimbs.length > 0 && Math.random() < 0.62);
    if (shouldStay) {
      addResource(bot, session, report);
      return;
    }
    const target = botStep(bot, session);
    if (!target) return;
    if (Math.random() < 0.1) {
      const limb = limbCycle.find((entry) => !bot.lostLimbs.includes(entry));
      if (limb) bot.lostLimbs.push(limb);
      report.push(`${bot.name} задержан тоннелем и ранен.`);
    } else {
      bot.position = target;
    }
  });
  session.round += 1;
  session.time = timeCycle[(timeCycle.indexOf(session.time) + 1) % 4];
  session.activeChallenge = null;
  return { ...base, session, activeHuman: 0, phase: "summary", pendingTarget: null, pendingEdge: null, report: report.slice(0, 10), traversals: [] };
}

function choosePath(base: ExpeditionSave, target: string | null, edgeId?: string): ExpeditionSave {
  if (base.phase !== "planning") return base;
  const session = cloneSession(base.session);
  const player = session.players[base.humanIds[base.activeHuman] - 1];
  if (!target) {
    const report: string[] = [];
    addResource(player, session, report);
    return finishTurn({ ...base, session }, { move: false, note: report.join(" ") || `${player.name} остался на станции.` });
  }
  const passage = passages(player.position, session).find((entry) => entry.target === target && entry.edge.id === edgeId);
  if (!passage) return base;
  const pending = { ...base, session, pendingTarget: target, pendingEdge: passage.edge.id };
  if (passage.edge.type === "transfer") {
    const toll = getCordonProfile(passage.edge.id).price;
    if (player.bullets < toll) return finishTurn(pending, { move: false, note: `На кордон нужно ${toll} ◉. Патронов не хватило.` });
    player.bullets -= toll;
    return finishTurn(pending, { move: true, note: `${player.name} заплатил ${toll} ◉ и прошёл кордон.` });
  }
  const caravan = activeCaravansForRound(session.round).find((entry) => !entry.resting && entry.stationId === player.position && entry.nextStationId === target);
  if (caravan) {
    const reward = Math.random() < 0.5 ? rewards[Math.floor(Math.random() * rewards.length)] : undefined;
    return finishTurn(pending, { move: true, reward, note: `${player.name} прошёл с караваном «${caravan.name}». Испытания не было.` });
  }
  const companion = base.traversals.find((entry) => entry.source === player.position && entry.target === target);
  if (companion) return finishTurn(pending, { move: true, note: `${player.name} присоединился к попутчику и безопасно прошёл тоннель.` });
  const quietChance = passage.status === "safe" ? 0.45 : 0.1;
  if (Math.random() < quietChance) return finishTurn(pending, { move: true, note: "Тоннель оказался тихим. Переход прошёл без испытания." });
  const pool = challengeCards.filter((card) => card.id !== "people-01");
  const card = pool[Math.floor(Math.random() * pool.length)];
  session.activeChallenge = card.id;
  return { ...pending, session, phase: "challenge", report: ["Открыта карта тоннеля."] };
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
  return finishTurn({ ...base, session }, { move: success, injury: !success, note: success ? `${option.label}: получилось.` : `${option.label}: тоннель оказался сильнее.` });
}

function sanitizeProfile(room: SharedRoom, sourceClientId: string, patch: Partial<SetupPlayer>) {
  const current = room.members.find((member) => member.clientId === sourceClientId);
  if (!current) return room;
  const roleTaken = patch.roleId && room.members.some((member) => member.clientId !== sourceClientId && member.roleId === patch.roleId);
  const roleId = roleTaken ? current.roleId : patch.roleId || current.roleId;
  const start = patch.start && starts.includes(patch.start) ? patch.start : current.start;
  const name = typeof patch.name === "string" ? patch.name.trim().slice(0, 24) || current.name : current.name;
  return { ...room, members: room.members.map((member) => member.clientId === sourceClientId ? { ...member, name, roleId, start } : member) };
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
  if (command.type === "start" && sourceClientId === room.hostClientId && room.status === "lobby" && room.members.filter((member) => member.connected).length >= 2) {
    const activeMembers = room.members.filter((member) => member.connected);
    return { ...room, status: "playing", ...createExpedition(room.code, activeMembers) };
  }
  if (!room.save || room.status !== "playing") return room;
  const activePlayerId = room.save.humanIds[room.save.activeHuman];
  if (room.playerByClient[sourceClientId] !== activePlayerId) {
    if (command.type === "next-round" && sourceClientId === room.hostClientId && room.save.phase === "summary") {
      return { ...room, save: { ...room.save, phase: "planning", report: ["Люди снова выбирают путь."] } };
    }
    return room;
  }
  if (command.type === "choose") return { ...room, save: choosePath(room.save, command.target, command.edgeId) };
  if (command.type === "resolve") return { ...room, save: resolveChallenge(room.save, command.optionId) };
  return room;
}

function newLobbyMember(clientId: string, name: string, roleId: string, start: string): LobbyMember {
  return { clientId, name: name.trim() || "Путник", roleId, start, connected: true, joinedAt: Date.now() };
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

  const createRoom = () => {
    destroyConnection();
    setConnectionStatus("connecting");
    setConnectionError("");
    const code = makeCode();
    const peer = new Peer(roomPeerId(code), { debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => {
      const host = newLobbyMember(clientId, profile.name || "Создатель партии", profile.roleId, profile.start);
      setRoom({ code, hostClientId: clientId, status: "lobby", members: [host], playerByClient: {}, save: null });
      setConnectionStatus("connected");
    });
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
    peer.on("error", (error) => {
      setConnectionStatus("error");
      setConnectionError(error.type === "unavailable-id" ? "Такой код уже занят. Нажмите «Создать» ещё раз." : "Не удалось открыть комнату. Проверьте интернет и попробуйте снова.");
    });
  };

  const joinRoom = () => {
    const code = joinCode.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6);
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
        connection.send({ type: "join", member: newLobbyMember(clientId, profile.name || "Путник", profile.roleId, profile.start) } satisfies RoomCommand);
        setConnectionStatus("connected");
      });
      connection.on("data", (data) => {
        const message = data as { type?: string; room?: SharedRoom };
        if (message.type === "state" && message.room) setRoom(message.room);
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
    return <main className="expedition-lobby">
      <a href="./" className="solo-back">← Выйти</a>
      <header>
        <div><p className="pixel-kicker">Комната открыта</p><h1>Код <span>{room.code}</span></h1><p>Передайте друзьям этот код. Они выбирают режим «Люди и боты» → «Войти по коду».</p></div>
        <button onClick={() => navigator.clipboard?.writeText(room.code)}>Скопировать код</button>
      </header>
      <div className="expedition-lobby-layout">
        <section className="expedition-members pixel-panel">
          <div><p className="pixel-kicker">Участники</p><b>{room.members.filter((member) => member.connected).length}/12</b></div>
          {room.members.map((member, index) => <article key={member.clientId} className={!member.connected ? "offline" : ""}>
            <RolePortrait roleId={member.roleId}/><div><strong>{member.name}</strong><span>{roleCards.find((role) => role.id === member.roleId)?.name}</span></div><i>{member.clientId === room.hostClientId ? "создатель" : `игрок ${index + 1}`}</i>
          </article>)}
          {Array.from({ length: Math.max(0, 2 - room.members.length) }).map((_, index) => <div className="expedition-empty-member" key={index}>Ожидаем ещё одного путника…</div>)}
        </section>
        <section className="expedition-profile pixel-panel">
          <p className="pixel-kicker">Ваш выбор</p>
          <RolePortrait roleId={myMember?.roleId || profile.roleId}/>
          <label>Имя<input value={myMember?.name || profile.name} onChange={(event) => updateProfile({ name: event.target.value })}/></label>
          <label>Персонаж<select value={myMember?.roleId || profile.roleId} onChange={(event) => updateProfile({ roleId: event.target.value })}>{roleCards.map((role) => <option key={role.id} value={role.id} disabled={usedRoles.has(role.id)}>{role.name}</option>)}</select></label>
          <label>Стартовая станция<select value={myMember?.start || profile.start} onChange={(event) => updateProfile({ start: event.target.value })}>{starts.map((id) => <option key={id} value={id}>{nodeById.get(id)?.name} · {nodeById.get(id)?.lineName}</option>)}</select></label>
          {isHost ? <button className="pixel-primary expedition-start-room" disabled={room.members.filter((member) => member.connected).length < 2} onClick={() => sendCommand({ type: "start" })}><span>{room.members.filter((member) => member.connected).length < 2 ? "Нужно минимум двое" : "Начать экспедицию"}</span><b>→</b></button> : <div className="expedition-wait-host"><i/><span>Создатель запустит игру, когда все будут готовы</span></div>}
        </section>
      </div>
    </main>;
  }

  const save = room.save;
  if (!save) return null;
  const current = save.session.players[save.humanIds[save.activeHuman] - 1];
  const myPlayerId = room.playerByClient[clientId];
  const canAct = current.id === myPlayerId;
  const currentChallenge = challengeCards.find((card) => card.id === save.session.activeChallenge);
  const options: ChallengeOption[] = currentChallenge ? (challengeSolutions[currentChallenge.id] || []).filter((option) => !option.roleIds?.length) : [];
  const role = roleCards.find((entry) => entry.id === current.roleId);
  const neighbors = passages(current.position, save.session);
  const activeClientId = Object.entries(room.playerByClient).find(([, playerId]) => playerId === current.id)?.[0];
  const activeMember = room.members.find((member) => member.clientId === activeClientId);
  const myPlayer = save.session.players[myPlayerId - 1];

  return <main className="solo-shell expedition-shell">
    <header className="solo-header"><div><span>Раунд {save.session.round}</span><b>{save.session.time}</b><i>{save.activeHuman + 1}/{save.humanIds.length} ход человека</i></div><strong>Комната {room.code}</strong><a href="./">Режимы</a></header>
    <div className="solo-layout">
      <MetroNetworkMap state={save.session} focusIds={save.session.players.map((player) => player.position)} compact={false}/>
      <aside className="solo-command">
        <section className="solo-human pixel-panel"><RolePortrait roleId={current.roleId}/><div><small>{canAct ? "Ваш ход" : "Сейчас ходит"}</small><h1>{current.name}</h1><p>{role?.name} · {nodeById.get(current.position)?.name}</p><span>{current.bullets} ◉ · {4 - current.lostLimbs.length}/4 конечности</span></div></section>
        {!canAct && save.phase !== "summary" && <section className="expedition-turn-wait pixel-panel"><i/><p><b>Ждём решение игрока</b><span>{activeMember?.connected === false ? "Игрок потерял соединение. Попросите его войти по тому же коду снова." : "Карта обновится автоматически после его хода."}</span></p></section>}
        {canAct && save.phase === "planning" && <section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={() => sendCommand({ type: "choose", target: null })}><b>Остаться</b><span>Получить ресурс станции</span></button>{neighbors.map(({ edge, target, status }) => { const node = nodeById.get(target); return <button key={`${edge.id}-${target}`} onClick={() => sendCommand({ type: "choose", target, edgeId: edge.id })}><b>Идти → <i className="route-station-chip" style={{ borderColor: node?.color }}>{node?.name}</i></b><span>{status === "caravan" ? "🐫 Караван: испытания не будет" : edge.type === "transfer" ? `Кордон · ${getCordonProfile(edge.id).price} ◉` : node?.lineName}</span></button>; })}</section>}
        {canAct && save.phase === "challenge" && currentChallenge && <section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div className="solo-solutions">{options.map((option) => { const usable = !option.itemIds?.length || option.itemIds.some((id) => current.inventory.includes(id)); return <button key={option.id} disabled={!usable || Boolean(option.bulletCost && current.bullets < option.bulletCost)} onClick={() => sendCommand({ type: "resolve", optionId: option.id })}><b>{option.label}</b><span>{option.detail}</span>{option.bulletCost && <small>{option.bulletCost} ◉</small>}</button>; })}</div></section>}
        {save.phase === "summary" && <section className="solo-report pixel-panel"><p className="pixel-kicker">Раунд завершён</p>{save.report.map((line, index) => <p key={index}>{line}</p>)}{isHost ? <button className="pixel-primary" onClick={() => sendCommand({ type: "next-round" })}>Следующий раунд →</button> : <div className="expedition-wait-host"><i/><span>Создатель откроет следующий раунд</span></div>}</section>}
        {myPlayer && myPlayer.id !== current.id && <section className="expedition-my-status pixel-panel"><p className="pixel-kicker">Ваш путник</p><b>{myPlayer.name}</b><span>{nodeById.get(myPlayer.position)?.name}</span><i>{myPlayer.bullets} ◉ · {4 - myPlayer.lostLimbs.length}/4 конечности</i></section>}
        <section className="expedition-roster pixel-panel"><p className="pixel-kicker">Кто в пути</p>{save.session.players.map((player) => <div key={player.id}><b>{player.name}</b><span>{save.humanIds.includes(player.id) ? "человек" : "бот"}</span><i>{nodeById.get(player.position)?.name}</i></div>)}</section>
      </aside>
    </div>
  </main>;
}
