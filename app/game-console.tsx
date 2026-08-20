"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { metroData } from "./metro-data";
import { scenarioEdgeMarks, scenarioNpcPositions, scenarioStartBriefs, scenarioStartNodeIds, stationResources } from "./scenario-data";
import { stationLore } from "./station-lore";
import { challengeCards, itemCards, type ChallengeCard } from "./card-data";
import { cordonChoices, cordonRules, crisisCards, getCordonProfile, npcCards, roleCards, startCordonBalance, timeRules } from "./game-data";

type Tab = "map" | "players" | "npc" | "wheel" | "crisis" | "death" | "log";
type Mode = "inspect" | "npc" | "safe" | "unknown" | "closed";
type EdgeMark = "normal" | "safe" | "unknown" | "closed";
type TimeOfDay = "Утро" | "День" | "Вечер" | "Ночь";
type Direction = "forward" | "backward";
type Transform = { x: number; y: number; k: number };
type Limb = "leftArm" | "rightArm" | "leftLeg" | "rightLeg";
type PlayerState = { name: string; health: number; lostLimbs: Limb[]; roleId: string; bullets: number; position: string };
type GameState = {
  round: number;
  activePair: number;
  time: TimeOfDay;
  players: PlayerState[];
  activePlayerCount: 4 | 12;
  npcPositions: Record<string, string>;
  npcOwners: Record<string, number | null>;
  npcServiceUsed: Record<string, boolean>;
  npcMoveRounds: { gm: number; role: number };
  edges: Record<string, EdgeMark>;
  notes: Record<string, string>;
  swallowedStations: string[];
  blackThread: { active: boolean; everyRounds: number; lastRound: number };
  log: string[];
};

const rawNodes = metroData.nodes as readonly { id: string; name: string; lineId: string; lineName: string; color: string; lat: number; lng: number }[];
const rawEdges = metroData.edges as readonly { id: string; source: string; target: string; type: string; lineId: string; lineName: string; color: string; closedByReality?: boolean }[];
const WIDTH = 1200;
const HEIGHT = 900;
const nodes = rawNodes.map((n) => ({ ...n, x: WIDTH / 2 + (n.lng - 37.62) * 3200, y: HEIGHT / 2 + (55.75 - n.lat) * 5200 }));
const edges = rawEdges;
const byId = new Map(nodes.map((n) => [n.id, n]));
const bounds = {
  x0: Math.min(...nodes.map((n) => n.x)), x1: Math.max(...nodes.map((n) => n.x)),
  y0: Math.min(...nodes.map((n) => n.y)), y1: Math.max(...nodes.map((n) => n.y)),
};
const fitScale = Math.min(WIDTH / (bounds.x1 - bounds.x0 + 140), HEIGHT / (bounds.y1 - bounds.y0 + 140), 1.2);
const FIT: Transform = { k: fitScale, x: WIDTH / 2 - fitScale * (bounds.x0 + bounds.x1) / 2, y: HEIGHT / 2 - fitScale * (bounds.y0 + bounds.y1) / 2 };
const tunnelEdges = edges.filter((e) => e.type !== "transfer");
const trackKey = (edgeId: string, direction: Direction) => `${edgeId}::${direction}`;
const initialEdges = { ...scenarioEdgeMarks } as Record<string, EdgeMark>;
const npcRoster = npcCards.map((npc) => [npc.id, npc.name] as const);
const initialNpcPositions: Record<string, string> = { ...scenarioNpcPositions, "npc-26": "2::новокузнецкая", "npc-27": "6::китай-город" };
const branchNodeIds = new Set(nodes.filter((node) => tunnelEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length > 2).map((node) => node.id));
const legacyStartNodeIds = new Set([
  "1::бульвар рокоссовского", "1::румянцево", "2::речной вокзал", "2::царицыно",
  "3::щелковская", "3::волоколамская", "6::новые черемушки", "7::тушинская",
  "7::рязанский проспект", "8::новокосино", "9::бибирево", "9::пражская",
  "10::верхние лихоборы", "10::люблино", "8A::говорово", "15::стахановская",
]);
const legacyStartBriefs: Record<string, { distance: number; history: string; branch: string }> = {
  "1::бульвар рокоссовского": {
    distance: 8,
    history: "После Удара здесь выжили путейцы старого депо и семьи из ближайших домов. Они меняют медную проволоку на еду и первыми слышат всё, что спускается с поверхности по вентиляции.",
    branch: "Красная ветка — старая прямая магистраль с крепкими общинами и самым понятным путём к центру.",
  },
  "1::румянцево": {
    distance: 10,
    history: "Складские подвалы у станции стали зерновым резервом юго-запада. Недавно из закрытого вентиляционного короба начали отвечать голоса, которых никто не передавал по радио.",
    branch: "Красная ветка знаменита непрерывной дорогой к Полису, но южный участок длинный и требует много припасов.",
  },
  "2::речной вокзал": {
    distance: 9,
    history: "Жители научились читать уровень воды по запаху и скрипу обшивки. Местные лодочники проводят отряды через подтопленные служебные ходы, но никогда не выходят в тоннель ночью.",
    branch: "Зелёная ветка — речной торговый путь: здесь лучшие проводники по воде, а затопления меняют маршруты без предупреждения.",
  },
  "2::царицыно": {
    distance: 9,
    history: "В тёплых технических помещениях выращивают лекарственные травы и кормовые водоросли. За право пользоваться теплицами спорят две семьи, поэтому чужаков встречают вежливо, но с оружием.",
    branch: "Зелёная ветка знаменита продовольственными караванами, сыростью и дорогими переправами через южные тоннели.",
  },
  "3::щелковская": {
    distance: 9,
    history: "Из деталей старых автобусов здесь собирают тележки, броню и печи. Восточный караул пропускает путников только после короткого допроса о том, что они слышали во сне.",
    branch: "Синяя ветка — глубокая оборонная линия с мастерскими, оружейниками и суровыми пропускными постами.",
  },
  "3::волоколамская": {
    distance: 10,
    history: "Широкий пустой зал превратили в дозорную станцию, где любой звук разносится слишком далеко. Дежурные уверяют, что иногда по закрытому пути проходит поезд без света и машиниста.",
    branch: "Синяя ветка знаменита глубиной и военными запасами; она надёжна, но её западные перегоны длинны и безлюдны.",
  },
  "6::новые черемушки": {
    distance: 8,
    history: "Здесь поселились инженеры водоочистки и врачи из окрестных клиник. Станция выдаёт чистую воду по карточкам, а за украденный фильтр навсегда закрывает ворота.",
    branch: "Оранжевая ветка — научный коридор метро: фильтры, лаборатории и точные карты ценятся здесь выше оружия.",
  },
  "7::тушинская": {
    distance: 9,
    history: "Механики с бывшего аэродрома шьют защитные костюмы из прорезиненной ткани и чинят всё, что имеет двигатель. Их главная тайна — запас топлива, которого официально не существует.",
    branch: "Фиолетовая ветка знаменита скоростью караванов, запчастями и постоянными спорами между далёкими окраинами.",
  },
  "7::рязанский проспект": {
    distance: 8,
    history: "Восточные челноки сделали станцию шумным перевалочным рынком. Здесь можно купить почти всё, но каждая сделка проходит через посредника, который запоминает лица и долги.",
    branch: "Фиолетовая ветка — длинная торговая артерия; на ней легко найти попутчиков и так же легко оказаться частью чужой политики.",
  },
  "8::новокосино": {
    distance: 8,
    history: "Община обжигает керамические фильтры и хранит батареи в сухих кабельных колодцах. По ночам на стенах появляется белая пыль, похожая на порох, хотя склады заперты.",
    branch: "Жёлтая ветка знаменита рынками Китай-города, патронными дворами и короткими, богатыми маршрутами к центру.",
  },
  "9::бибирево": {
    distance: 10,
    history: "Северяне ведут строгий учёт еды, воздуха и времени, сохранив архив старых рационов. Опоздавшему каравану не открывают гермоворота, даже если снаружи остались свои.",
    branch: "Серая ветка — территория дисциплины, колодцев и картографов; безопасные сведения здесь всегда имеют цену.",
  },
  "9::пражская": {
    distance: 10,
    history: "Южный зал превратился в пёстрый рынок, где старые вывески служат гербами торговых домов. Местные собирают рассказы путников и рисуют самую подробную карту исчезающих тоннелей.",
    branch: "Серая ветка знаменита разведчиками и точными маршрутами, но путь с её окраин долгий и требует терпения.",
  },
  "10::верхние лихоборы": {
    distance: 9,
    history: "Холодный воздух из глубоких шахт питает коптильни и предупреждает о перемене погоды наверху. Смотрители вентиляции слышат Голос раньше остальных и считают это профессиональной болезнью.",
    branch: "Салатовая ветка — линия вентиляции и подземных ферм, известная тайными обходами и нестабильным воздухом.",
  },
  "10::люблино": {
    distance: 9,
    history: "Складские тоннели заняли грибники и ремонтные бригады из депо. Община сыта, но каждый путник обязан отработать смену или оставить часть припасов.",
    branch: "Салатовая ветка знаменита грибными фермами, дешёвым ремонтом и сетью служебных ходов неизвестной надёжности.",
  },
  "8A::говорово": {
    distance: 9,
    history: "Новая станция пережила катастрофу почти нетронутой и до сих пор включает свет по старому расписанию. За закрытыми дверями автоматика продолжает выполнять приказ, которого никто не может прочесть.",
    branch: "Солнцевская ветка — молодая технологичная линия с автономными системами, гермозонами и множеством запертых помещений.",
  },
  "15::стахановская": {
    distance: 6,
    history: "Строительные бригады укрепили недостроенные служебные камеры и превратили их в крепость. Они знают короткий путь к центру, но каждый месяц часть старых распорок приходится менять.",
    branch: "Розовая ветка знаменита строителями и короткими восточными обходами; путь быстр, зато обвалы случаются чаще.",
  },
};
const startNodeIds = new Set<string>(scenarioStartNodeIds);
const startBriefs = scenarioStartBriefs;
void legacyStartNodeIds;
void legacyStartBriefs;

const limbOptions: { id: Limb; label: string; short: string }[] = [
  { id: "leftArm", label: "Левая рука", short: "Л · рука" },
  { id: "rightArm", label: "Правая рука", short: "П · рука" },
  { id: "leftLeg", label: "Левая нога", short: "Л · нога" },
  { id: "rightLeg", label: "Правая нога", short: "П · нога" },
];
const initialPlayers: PlayerState[] = Array.from({ length: 12 }, (_, index) => { const role = roleCards[index]; const position=scenarioStartNodeIds[Math.floor(index / 2) % scenarioStartNodeIds.length]; return { name: `Игрок ${String(index + 1).padStart(2, "0")}`, health: 10, lostLimbs: [], roleId: role.id, bullets: role.bullets+(startCordonBalance[position]?.bonusBullets||0), position }; });
const initialState: GameState = { round: 1, activePair: 0, time: "Утро", players: initialPlayers, activePlayerCount: 4, npcPositions: initialNpcPositions, npcOwners: {}, npcServiceUsed: {}, npcMoveRounds: { gm: 0, role: -1 }, edges: initialEdges, notes: {}, swallowedStations: [], blackThread: { active: false, everyRounds: 2, lastRound: 0 }, log: ["Тестовая партия создана: 2 пары, 4 личных экрана. Утро."] };

function swallowOneEdgeState(current: GameState): GameState {
  const swallowed = new Set(current.swallowedStations);
  const candidates = nodes.filter((node) => !swallowed.has(node.id) && !/библиотека им/i.test(node.name)).map((node) => {
    const activeEdges = tunnelEdges.filter((edge) => {
      if (edge.source !== node.id && edge.target !== node.id) return false;
      const other = edge.source === node.id ? edge.target : edge.source;
      return !swallowed.has(other) && (current.edges[trackKey(edge.id, "forward")] !== "closed" || current.edges[trackKey(edge.id, "backward")] !== "closed");
    });
    return { node, activeEdges };
  }).filter(({ activeEdges }) => activeEdges.length === 1);
  if (!candidates.length) return { ...current, log:["Чёрное Нечто не нашло доступного края ветки.", ...current.log] };
  const chosen = candidates[Math.floor(Math.random() * candidates.length)].node;
  const nextEdges = { ...current.edges };
  tunnelEdges.filter((edge) => edge.source === chosen.id || edge.target === chosen.id).forEach((edge) => { nextEdges[trackKey(edge.id, "forward")] = "closed"; nextEdges[trackKey(edge.id, "backward")] = "closed"; });
  const npcPositions = { ...current.npcPositions };
  const eaten = npcCards.filter((npc) => current.npcOwners[npc.id] == null && npcPositions[npc.id] === chosen.id);
  eaten.forEach((npc) => { npcPositions[npc.id] = "__devoured__"; });
  const victims = current.players.map((player, index) => index < current.activePlayerCount && player.lostLimbs.length < 4 && player.position === chosen.id ? index : -1).filter((index) => index >= 0);
  const players = current.players.map((player, index) => victims.includes(index) ? { ...player, lostLimbs:["leftArm","rightArm","leftLeg","rightLeg"] as Limb[] } : player);
  return { ...current, players, edges:nextEdges, npcPositions, swallowedStations:[...current.swallowedStations, chosen.id], log:[`Чёрное Нечто поглотило станцию ${chosen.name}.${eaten.length ? ` NPC: ${eaten.map((npc) => npc.name).join(", ")}.` : ""}${victims.length ? ` Погибли игроков: ${victims.length}.` : ""}`, ...current.log] };
}

const lightForms = [
  ["Эхо-проводник", "Ходит один по любым тоннелям; раз за игру открывает неизвестный перегон."],
  ["Хранитель памяти", "Сохраняет одну тайну роли и может передать её живому на общей станции."],
  ["Белый связной", "Каждый второй раунд проходит два тоннеля, но обязан закончить ход у живых."],
  ["Смотритель огней", "Возвращает одну потерянную конечность встреченному живому, после чего теряет эту способность."],
];
const darkForms = [
  ["Голодный шёпот", "Ходит один по любым тоннелям; за 1 патрон переманивает NPC у одинокого живого."],
  ["Тёмный разведчик", "Каждый второй раунд проходит два тоннеля и может скрыть статус перегонa."],
  ["Собиратель", "Собирает мёртвых и NPC; на станции требует у живых предмет или тайну."],
  ["Ложный проводник", "Один раз меняет направление каравана или закрывает безопасный тоннель."],
];

function loadState(): GameState {
  if (typeof window === "undefined") return initialState;
  try {
    const parsed = JSON.parse(localStorage.getItem("metro-game-console-v5") || "null");
    return parsed ? { ...initialState, ...parsed, players: initialPlayers.map((player, index) => { const stored = parsed.players?.[index]; return { ...player, ...(stored || {}), lostLimbs: Array.isArray(stored?.lostLimbs) ? stored.lostLimbs : [] }; }), npcPositions: { ...initialNpcPositions, ...(parsed.npcPositions || {}) }, npcOwners: parsed.npcOwners || {}, npcServiceUsed: parsed.npcServiceUsed || {}, npcMoveRounds: { ...initialState.npcMoveRounds, ...(parsed.npcMoveRounds || {}) }, edges: { ...initialEdges, ...(parsed.edges || {}) }, swallowedStations: Array.isArray(parsed.swallowedStations) ? parsed.swallowedStations : [], blackThread: { ...initialState.blackThread, ...(parsed.blackThread || {}) } } : initialState;
  } catch { return initialState; }
}

export function GameConsole() {
  const [tab, setTab] = useState<Tab>("map");
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setGame(loadState()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("metro-game-console-v5", JSON.stringify(game)); }, [game, hydrated]);

  const addLog = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setGame((g) => ({ ...g, log: [`${stamp} · ${message}`, ...g.log].slice(0, 80) }));
  }, []);

  const nextTurn = () => {
    setGame((g) => {
      const pairCount = g.activePlayerCount / 2;
      if (g.activePair < pairCount - 1) {
        const activePair = g.activePair + 1;
        return { ...g, activePair, log: [`Ход передан отряду ${activePair + 1}.`, ...g.log] };
      }
      const round = g.round + 1;
      const autoBlack = g.blackThread.active && round - g.blackThread.lastRound >= g.blackThread.everyRounds;
      const base = { ...g, round, activePair: 0, blackThread: autoBlack ? { ...g.blackThread, lastRound: round } : g.blackThread, log: [`Мировая фаза завершена. Раунд ${round}: первым действует отряд 1. Караваны делают ${g.round % 2 ? "ход" : "остановку"}.`, ...g.log] };
      return autoBlack ? swallowOneEdgeState(base) : base;
    });
  };

  const advanceTime = () => {
    const cycle: TimeOfDay[] = ["Утро", "День", "Вечер", "Ночь"];
    setGame((g) => { const time = cycle[(cycle.indexOf(g.time) + 1) % cycle.length]; return { ...g, time, log: [`Общее время: ${time}.${time === "Ночь" ? " Риск смертельного исхода повышен." : ""}`, ...g.log] }; });
  };

  const closeRandomSafe = () => {
    const candidates = tunnelEdges.flatMap((edge) => (["forward", "backward"] as Direction[]).map((direction) => ({ edge, direction, key: trackKey(edge.id, direction) }))).filter((track) => game.edges[track.key] === "safe");
    if (!candidates.length) { addLog("Нет безопасных тоннелей, которые можно закрыть."); return; }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setGame((g) => ({ ...g, edges: { ...g.edges, [chosen.key]: "closed" }, log: [`Безопасный ходовой тоннель закрыт: ${trackName(chosen.edge, chosen.direction)}.`, ...g.log] }));
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><p className="eyebrow">Пульт ведущего · Москва, 2030</p><h1>Голоса под Москвой</h1></div>
        </div>
        <div className="round-control">
          <button className={`time-button ${game.time === "Ночь" ? "night" : ""}`} onClick={advanceTime}><span>Общее время</span><b>{game.time}</b></button>
          <div className="turn-readout"><span>Раунд {String(game.round).padStart(2, "0")} · ход отряда</span><strong>{String(game.activePair + 1).padStart(2, "0")}<small>/{String(game.activePlayerCount / 2).padStart(2, "0")}</small></strong><em>{game.players[game.activePair * 2]?.name} · {game.players[game.activePair * 2 + 1]?.name}</em></div>
          <button className="primary" onClick={nextTurn}>Следующий отряд <span>→</span></button>
        </div>
      </header>

      <nav className="tabs" aria-label="Разделы пульта">
        <TabButton active={tab === "map"} onClick={() => setTab("map")} icon="⌘">Карта</TabButton>
        <TabButton active={tab === "players"} onClick={() => setTab("players")} icon="♥">Игроки</TabButton>
        <TabButton active={tab === "npc"} onClick={() => setTab("npc")} icon="♙">NPC</TabButton>
        <TabButton active={tab === "wheel"} onClick={() => setTab("wheel")} icon="▤">Карточки</TabButton>
        <TabButton active={tab === "crisis"} onClick={() => setTab("crisis")} icon="⚠">Кризисы</TabButton>
        <TabButton active={tab === "death"} onClick={() => setTab("death")} icon="◇">После смерти</TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")} icon="≡">Журнал <b>{game.log.length}</b></TabButton>
        <div className="status"><span className="pulse" /> партия сохранена на устройстве</div>
      </nav>

      <div className={`time-rule-strip ${game.time === "Ночь" ? "night" : ""}`}><b>{game.time}</b><span>{timeRules[game.time].boon}</span><i>{timeRules[game.time].pressure}</i></div>

      {tab === "map" && <MapPanel game={game} setGame={setGame} addLog={addLog} onCloseSafe={closeRandomSafe} />}
      {tab === "players" && <PlayersPanel game={game} setGame={setGame} addLog={addLog} />}
      {tab === "npc" && <NpcPanel game={game} setGame={setGame} addLog={addLog} />}
      {tab === "wheel" && <ChallengeDeckPanel addLog={addLog} time={game.time} />}
      {tab === "crisis" && <CrisisPanel addLog={addLog} />}
      {tab === "death" && <DeathPanel addLog={addLog} />}
      {tab === "log" && <LogPanel game={game} setGame={setGame} />}
    </main>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return <button className={active ? "tab active" : "tab"} onClick={onClick}><span aria-hidden="true">{icon}</span>{children}</button>;
}

function MapPanel({ game, setGame, addLog, onCloseSafe }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>>; addLog: (s: string) => void; onCloseSafe: () => void }) {
  const [mode, setMode] = useState<Mode>("inspect");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [movingNpcId, setMovingNpcId] = useState<string | null>(null);
  const [reserveNpcId, setReserveNpcId] = useState<string>(npcRoster[0][0]);
  const [moveSource, setMoveSource] = useState<"gm" | "role">("gm");
  const [transform, setTransform] = useState<Transform>(FIT);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const selectedNode = selected ? byId.get(selected) : undefined;
  const selectedStart = selectedNode ? startBriefs[selectedNode.id] : undefined;
  const selectedResource = selectedNode ? stationResources[selectedNode.id] : undefined;
  const selectedLore = selectedNode ? stationLore[selectedNode.id] : undefined;
  const selectedTrack = selected ? parseTrack(selected) : undefined;
  const selectedEdge = selectedTrack ? tunnelEdges.find((e) => e.id === selectedTrack.edgeId) : undefined;
  const selectedTransfer = selected?.startsWith("cordon::") ? edges.find((edge) => edge.type === "transfer" && edge.id === selected.slice(8)) : undefined;
  const selectedCordon = selectedTransfer ? getCordonProfile(selectedTransfer.id) : undefined;
  const npcHere = selectedNode ? npcRoster.filter(([id]) => game.npcOwners[id] == null && game.npcPositions[id] === selectedNode.id) : [];
  const reserveNpcs = npcRoster.filter(([id]) => game.npcOwners[id] == null && !game.npcPositions[id]);
  const adjacentStations = movingNpcId && selectedNode ? tunnelEdges.filter((edge) => (edge.source === selectedNode.id || edge.target === selectedNode.id) && (game.edges[trackKey(edge.id, "forward")] !== "closed" || game.edges[trackKey(edge.id, "backward")] !== "closed")).map((edge) => byId.get(edge.source === selectedNode.id ? edge.target : edge.source)!).filter((node) => !game.swallowedStations.includes(node.id)).filter((node, index, all) => all.findIndex((other) => other.id === node.id) === index) : [];
  const uniqueNames = useMemo(() => [...new Set(nodes.map((n) => n.name))].sort((a, b) => a.localeCompare(b, "ru")), []);
  const liveTrackCounts = tunnelEdges.flatMap((edge) => (["forward", "backward"] as Direction[]).map((direction) => game.edges[trackKey(edge.id, direction)] || "normal")).reduce((counts, mark) => ({ ...counts, [mark]: counts[mark] + 1 }), { normal: 0, safe: 0, unknown: 0, closed: 0 } as Record<EdgeMark, number>);
  const liveResourceCounts = nodes.filter((node) => !game.swallowedStations.includes(node.id)).reduce((counts, node) => ({ ...counts, [stationResources[node.id].kind]: counts[stationResources[node.id].kind] + 1 }), { rice: 0, medkit: 0, wire: 0, curiosity: 0 });
  const lostNpcCount = npcRoster.filter(([id]) => game.npcPositions[id] === "__devoured__").length;
  const activeNpcCount = npcRoster.filter(([id]) => game.npcOwners[id] == null && Boolean(game.npcPositions[id]) && game.npcPositions[id] !== "__devoured__").length;

  const fit = () => setTransform(FIT);
  const zoomBy = (factor: number) => {
    setTransform((current) => {
      const k = Math.max(.28, Math.min(7, current.k * factor));
      const ratio = k / current.k;
      return {
        k,
        x: WIDTH / 2 - (WIDTH / 2 - current.x) * ratio,
        y: HEIGHT / 2 - (HEIGHT / 2 - current.y) * ratio,
      };
    });
  };
  const centerNode = (id: string) => {
    const node = byId.get(id); if (!node) return;
    setTransform({ k: 3.4, x: WIDTH / 2 - node.x * 3.4, y: HEIGHT / 2 - node.y * 3.4 });
  };
  const startMapDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, tx: transform.x, ty: transform.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveMapDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const activeDrag = drag.current;
    if (!activeDrag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = activeDrag.tx + (event.clientX - activeDrag.x) * WIDTH / rect.width;
    const nextY = activeDrag.ty + (event.clientY - activeDrag.y) * HEIGHT / rect.height;
    setTransform((current) => ({ ...current, x: nextX, y: nextY }));
  };
  const stopMapDrag = () => { drag.current = null; };
  const findSearchNode = () => {
    const q = search.toLowerCase().replaceAll("ё", "е").trim();
    if (!q) return undefined;
    return nodes.find((n) => n.name.toLowerCase().replaceAll("ё", "е") === q) || nodes.find((n) => n.name.toLowerCase().replaceAll("ё", "е").includes(q));
  };
  const handleSearch = () => {
    const found = findSearchNode();
    if (found) { setSelected(found.id); centerNode(found.id); }
  };
  const focusSelectedOrSearch = () => {
    const found = findSearchNode();
    if (found) { setSelected(found.id); centerNode(found.id); return; }
    if (selectedNode) centerNode(selectedNode.id);
  };
  const selectNode = (id: string) => { setSelected(id); if (mode !== "npc") setMovingNpcId(null); };
  const selectTrack = (edge: typeof tunnelEdges[number], direction: Direction) => {
    const id = trackKey(edge.id, direction);
    setSelected(id);
    if (mode === "inspect" || mode === "npc") return;
    const mark: EdgeMark = mode;
    setGame((g) => ({ ...g, edges: { ...g.edges, [id]: g.edges[id] === mark ? "normal" : mark } }));
  };
  const reveal = () => {
    if (!selectedEdge || !selectedTrack) return;
    const key = trackKey(selectedEdge.id, selectedTrack.direction);
    setGame((g) => ({ ...g, edges: { ...g.edges, [key]: "normal" }, log: [`Разведан тоннель: ${trackName(selectedEdge, selectedTrack.direction)}. Информация теперь общая.`, ...g.log] }));
  };
  const moveNpc = (targetStationId: string) => {
    if (!movingNpcId || !selectedNode) return;
    const npc = npcRoster.find(([id]) => id === movingNpcId); if (!npc) return;
    const gmUsed = game.npcMoveRounds.gm === game.round;
    const roleUsed = game.round - game.npcMoveRounds.role < 2;
    if ((moveSource === "gm" && gmUsed) || (moveSource === "role" && roleUsed)) { addLog(moveSource === "gm" ? "ГМ уже двигал NPC в этом раунде." : "Способность перемещения NPC ещё не восстановилась."); return; }
    const target = byId.get(targetStationId)!;
    setGame((g) => ({ ...g, npcPositions: { ...g.npcPositions, [movingNpcId]: targetStationId }, npcMoveRounds: { ...g.npcMoveRounds, [moveSource]: g.round }, log: [`${moveSource === "gm" ? "ГМ" : "Способность роли"}: ${npc[1]} перемещён ${selectedNode.name} → ${target.name}.`, ...g.log] }));
    setSelected(targetStationId); setMovingNpcId(null);
  };
  const placeNpc = () => {
    if (!selectedNode || game.swallowedStations.includes(selectedNode.id) || !reserveNpcId || game.npcPositions[reserveNpcId]) return;
    const npc = npcRoster.find(([id]) => id === reserveNpcId); if (!npc) return;
    setGame((g) => ({ ...g, npcPositions: { ...g.npcPositions, [reserveNpcId]: selectedNode.id }, log: [`Подготовка: ${npc[1]} размещён на станции ${selectedNode.name}.`, ...g.log] }));
    const next = reserveNpcs.find(([id]) => id !== reserveNpcId);
    setReserveNpcId(next?.[0] || "");
  };
  const returnNpcToReserve = (npcId: string) => {
    const npc = npcRoster.find(([id]) => id === npcId); if (!npc) return;
    setGame((g) => { const npcPositions = { ...g.npcPositions }; delete npcPositions[npcId]; return { ...g, npcPositions, log: [`Подготовка: ${npc[1]} возвращён в резерв.`, ...g.log] }; });
    setMovingNpcId(null); setReserveNpcId(npcId);
  };
  const swallowOuterStation = () => setGame((current) => swallowOneEdgeState(current));
  const exportState = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `metro-party-round-${game.round}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importState = (file?: File) => {
    if (!file) return;
    file.text().then((text) => { try { const parsed = JSON.parse(text); setGame({ ...initialState, ...parsed, players: initialPlayers.map((player, index) => { const stored = parsed.players?.[index]; return { ...player, ...(stored || {}), lostLimbs: Array.isArray(stored?.lostLimbs) ? stored.lostLimbs : [] }; }), npcPositions: { ...initialNpcPositions, ...(parsed.npcPositions || {}) }, npcMoveRounds: { ...initialState.npcMoveRounds, ...(parsed.npcMoveRounds || {}) }, edges: { ...initialEdges, ...(parsed.edges || {}) }, swallowedStations: Array.isArray(parsed.swallowedStations) ? parsed.swallowedStations : [] }); addLog("Сохранение загружено."); } catch { addLog("Файл сохранения не распознан."); } });
  };

  return (
    <section className="map-layout">
      <aside className="sidebar">
        <section className="side-section">
          <p className="side-label">Режим разметки</p>
          <div className="mode-grid">
            <ModeButton mode="inspect" current={mode} set={setMode} icon="⌖" label="Осмотр" />
            <ModeButton mode="npc" current={mode} set={setMode} icon="♙" label="NPC" />
            <ModeButton mode="safe" current={mode} set={setMode} icon="✓" label="Безопасен" />
            <ModeButton mode="unknown" current={mode} set={setMode} icon="?" label="Непонятный" />
            <ModeButton mode="closed" current={mode} set={setMode} icon="×" label="Закрыт" />
          </div>
          <p className="hint">{mode === "npc" ? "Выберите станцию и конкретного NPC. Самостоятельно NPC не перемещаются." : mode === "inspect" ? "Выберите станцию или один из двух направленных тоннелей." : "Метка ставится на один ходовой тоннель, а не на весь перегон."}</p>
        </section>
        <section className="side-section">
          <label className="side-label" htmlFor="station-search">Найти станцию</label>
          <div className="search-row"><input id="station-search" list="station-list" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Например, Библиотека…" /><button onClick={handleSearch}>⌕</button></div>
          <datalist id="station-list">{uniqueNames.map((name) => <option key={name} value={name} />)}</datalist>
          <div className="compact-actions"><button onClick={fit}>Показать всё</button><button onClick={focusSelectedOrSearch}>К выбранной</button></div>
        </section>
        <section className="side-section grow">
          <p className="side-label">Выбрано</p>
          {!selectedNode && !selectedEdge && !selectedTransfer && <div className="empty-selection"><span>⌁</span><p>Ничего не выбрано</p></div>}
          {selectedNode && <div className="selection-card"><span className="line-chip" style={{ background: selectedNode.color }}>{selectedNode.lineId}</span>{branchNodeIds.has(selectedNode.id) && <span className="branch-chip">развилка</span>}{startNodeIds.has(selectedNode.id) && <span className="start-chip">старт</span>}<h3>{selectedNode.name}</h3><p>{selectedNode.lineName}</p><dl><div><dt>NPC</dt><dd>{npcHere.length}</dd></div><div><dt>Ходовых тоннелей</dt><dd>{tunnelEdges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length * 2}</dd></div></dl>{selectedStart && <section className="start-brief"><div className="start-distance"><span>До Полиса</span><strong>{selectedStart.distance}</strong><small>{selectedStart.distance < 5 ? "хода" : "ходов"}</small></div><div><h4>История станции</h4><p>{selectedStart.history}</p><h4>Чем знаменита ветка</h4><p>{selectedStart.branch}</p><small>Кратчайший путь по базовому графу. Перекрытия и события увеличивают расстояние.</small></div></section>}{npcHere.length > 0 && <div className="npc-list"><span>NPC остаются на станции</span>{npcHere.map(([id, name]) => <div key={id} className="npc-actions"><button className={movingNpcId === id ? "npc-row active" : "npc-row"} onClick={() => { setMode("npc"); setMovingNpcId(id); }}>{name}<b>↗</b></button><button className="reserve-return" onClick={() => returnNpcToReserve(id)} title="Вернуть в резерв">×</button></div>)}</div>}{reserveNpcs.length > 0 && <div className="npc-place"><span>Разместить из резерва</span><select value={reserveNpcId} onChange={(e) => setReserveNpcId(e.target.value)}>{reserveNpcs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button onClick={placeNpc}>Поставить на станцию</button></div>}{movingNpcId && <div className="npc-move"><div className="move-source"><button className={moveSource === "gm" ? "active" : ""} onClick={() => setMoveSource("gm")}>ГМ · 1/раунд</button><button className={moveSource === "role" ? "active" : ""} onClick={() => setMoveSource("role")}>Роль · раз/2 хода</button></div><p>Куда переместить на один перегон:</p>{adjacentStations.map((station) => <button key={station.id} onClick={() => moveNpc(station.id)}>{station.name}</button>)}</div>}<textarea placeholder="Заметка ведущего…" value={game.notes[selectedNode.id] || ""} onChange={(e) => setGame((g) => ({ ...g, notes: { ...g.notes, [selectedNode.id]: e.target.value } }))} /></div>}
          {selectedNode && selectedLore && <section className="station-lore"><article className="lore-fact"><span>До катастрофы · проверяемый факт</span><p>{selectedLore.fact}</p><a href={selectedLore.sourceUrl} target="_blank" rel="noreferrer">Источник: {selectedLore.sourceLabel} ↗</a></article><article className="lore-fiction"><span>После 2026 · лор игры</span><p>{selectedLore.after2026}</p></article></section>}
          {selectedNode && selectedResource && <div className={`station-resource ${selectedResource.kind} ${game.swallowedStations.includes(selectedNode.id) ? "swallowed" : ""}`}><b>{selectedResource.icon}</b><div><span>{game.swallowedStations.includes(selectedNode.id) ? "Поглощено" : "Добыча станции"}</span><strong>{game.swallowedStations.includes(selectedNode.id) ? "Чёрное нечто" : selectedResource.label}</strong><p>{game.swallowedStations.includes(selectedNode.id) ? "Станция, её добыча и оставшиеся NPC удалены из партии." : selectedResource.detail}</p></div></div>}
          {selectedNode && selectedStart && startCordonBalance[selectedNode.id] && <div className="start-cordon-balance"><span>Баланс старта</span><b>{startCordonBalance[selectedNode.id].cordons} кордона · {startCordonBalance[selectedNode.id].expectedToll} ◉</b>{startCordonBalance[selectedNode.id].bonusBullets>0?<strong>Дорожный запас: +{startCordonBalance[selectedNode.id].bonusBullets} ◉ каждому игроку пары</strong>:<small>Дополнительные патроны не нужны.</small>}</div>}
          {selectedEdge && selectedTrack && <div className="selection-card"><span className={`edge-chip ${game.edges[trackKey(selectedEdge.id, selectedTrack.direction)] || "normal"}`}>{markLabel(game.edges[trackKey(selectedEdge.id, selectedTrack.direction)])}</span><h3>{trackName(selectedEdge, selectedTrack.direction)}</h3><p>{selectedEdge.lineName} · отдельный ходовой тоннель</p>{byId.get(selectedEdge.source)?.lineId !== byId.get(selectedEdge.target)?.lineId && <div className="cordon-note"><b>КОРДОН</b><span>Межлинейный переход. Базовая пошлина: {cordonRules.baseToll} патрона с группы.</span></div>}{game.edges[trackKey(selectedEdge.id, selectedTrack.direction)] === "unknown" && <button className="primary full" onClick={reveal}>Разведать публично</button>}</div>}
          {selectedTransfer && selectedCordon && <div className="selection-card cordon-card"><span className={`cordon-price price-${selectedCordon.price}`}>{selectedCordon.price} ◉</span>{selectedCordon.inspection&&<span className="inspection-chip">возможен шмон</span>}<h3>{selectedCordon.title}</h3><p>{byId.get(selectedTransfer.source)?.name} ↔ {byId.get(selectedTransfer.target)?.name}</p><div className="cordon-note"><b>КОРДОН</b><span>{selectedCordon.guardText}</span></div><div className="cordon-choices"><span>Игрокам предложить словами</span>{cordonChoices.map((choice)=><p key={choice}>{choice}</p>)}</div><small>Скрыто от игроков: при шмоне выбирается один живой персонаж. Доплата равна сумме внутренних меток подозрительности его предметов, максимум +4 ◉.</small></div>}
        </section>
        <section className="side-section">
          <div className="stat-line"><span>Активных станций</span><strong>{nodes.length - game.swallowedStations.length}</strong></div><div className="stat-line"><span>Открыто / неизвестно / закрыто</span><strong>{liveTrackCounts.normal + liveTrackCounts.safe} / {liveTrackCounts.unknown} / {liveTrackCounts.closed}</strong></div><div className="stat-line"><span>Патроны / аптечки / проволока / разное</span><strong>{liveResourceCounts.rice} / {liveResourceCounts.medkit} / {liveResourceCounts.wire} / {liveResourceCounts.curiosity}</strong></div><div className="stat-line"><span>Стартовых точек</span><strong>{startNodeIds.size}</strong></div><div className="stat-line"><span>NPC на карте / в резерве / погибло</span><strong>{activeNpcCount} / {reserveNpcs.length} / {lostNpcCount}</strong></div>
          <button className="danger-line" onClick={onCloseSafe}>Закрыть случайный безопасный</button>
          <div className="black-thread-control"><label><input type="checkbox" checked={game.blackThread.active} onChange={(e) => setGame((g) => ({...g, blackThread:{...g.blackThread, active:e.target.checked, lastRound:g.round}}))} /> Чёрное Нечто активно</label><label>Поглощение каждые <select value={game.blackThread.everyRounds} onChange={(e) => setGame((g) => ({...g, blackThread:{...g.blackThread, everyRounds:Number(e.target.value)}}))}><option value="1">1 раунд</option><option value="2">2 раунда</option><option value="3">3 раунда</option><option value="4">4 раунда</option></select></label></div>
          <button className="void-line" onClick={swallowOuterStation}>Поглотить край сейчас</button>
        </section>
      </aside>

      <div className="map-stage">
        <div className="map-caption"><div><span className="live-dot" /> Оперативная схема</div><div className="legend"><span><i className="start" /> старт</span><span><i className="safe" /> безопасен</span><span><i className="unknown" /> непонятный</span><span><i className="closed" /> закрыт</span><span><i className="rice" /> патроны</span><span><i className="medkit" /> аптечка</span><span><i className="wire" /> проволока</span><span><i className="curiosity" /> разное</span></div></div>
        <div className="map-zoom" aria-label="Управление масштабом карты">
          <button type="button" onClick={() => zoomBy(1.3)} aria-label="Увеличить карту" title="Увеличить карту">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Уменьшить карту" title="Уменьшить карту">−</button>
          <button type="button" className="map-zoom-fit" onClick={fit} aria-label="Показать карту целиком" title="Показать карту целиком">Всё</button>
        </div>
        <svg className="metro-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onWheel={(event) => { event.preventDefault(); zoomBy(Math.exp(-event.deltaY * .0012)); }} onPointerDown={startMapDrag} onPointerMove={moveMapDrag} onPointerUp={stopMapDrag} onPointerCancel={stopMapDrag} onLostPointerCapture={stopMapDrag}>
          <defs><filter id="glow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter><marker id="track-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#172019" /></marker></defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {edges.filter((edge) => edge.type === "transfer").map((edge) => { const a = byId.get(edge.source)!; const b = byId.get(edge.target)!; const profile=getCordonProfile(edge.id); const key=`cordon::${edge.id}`; return <g key={edge.id} className={`cordon-marker ${profile.inspection?"inspection":""} ${selected===key?"selected":""}`} onPointerDown={(event)=>event.stopPropagation()} onClick={()=>setSelected(key)}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge transfer" /><circle className="cordon-dot" cx={(a.x+b.x)/2} cy={(a.y+b.y)/2} r="7"/><text className="cordon-map" x={(a.x+b.x)/2} y={(a.y+b.y)/2}>{profile.price}</text></g>; })}
            {tunnelEdges.flatMap((edge) => (["forward", "backward"] as Direction[]).map((direction) => { const geometry = trackGeometry(edge, direction); const key = trackKey(edge.id, direction); const mark = game.edges[key] || "normal"; return <line key={key} x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} stroke={edge.color} markerEnd={transform.k > 1.45 ? "url(#track-arrow)" : undefined} className={`edge track ${mark} ${selected === key ? "selected" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectTrack(edge, direction)} />; }))}
            {nodes.map((node) => {
              const count = npcRoster.filter(([id]) => game.npcOwners[id] == null && game.npcPositions[id] === node.id).length;
              const playersHere = game.players.map((player,index) => ({player,index})).filter(({player,index}) => index < game.activePlayerCount && player.position === node.id && player.lostLimbs.length < 4);
              const isPolis = /библиотека им/i.test(node.name);
              const isStart = startNodeIds.has(node.id);
              const resource = stationResources[node.id];
              const isSwallowed = game.swallowedStations.includes(node.id);
              return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className={`station resource-${resource.kind} ${selected === node.id ? "selected" : ""} ${isPolis ? "polis" : ""} ${branchNodeIds.has(node.id) ? "branch" : ""} ${isStart ? "start" : ""} ${isSwallowed ? "swallowed" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectNode(node.id)}>
                {selected === node.id && <circle className="selected-ping" r="15" />}
                <circle className="resource-ring" r={isStart ? 11.5 : 7.5} />
                {branchNodeIds.has(node.id) && <rect className="branch-ring" x="-8" y="-8" width="16" height="16" transform="rotate(45)" />}
                {isStart && <circle className="start-ring" r="9" />}
                <circle className="station-core" r={isPolis ? 7 : 4.5} fill={node.color} />
                {count > 0 && <><circle className="npc-badge" cx="7" cy="-7" r="6" /><text className="npc-count" x="7" y="-7">{count}</text></>}
                {playersHere.length > 0 && <><circle className="player-map-badge" cx="-8" cy="-8" r="7" /><text className="player-map-count" x="-8" y="-8">{playersHere.length}</text></>}
                {(transform.k > 2.25 || selected === node.id || isPolis || isStart) && <text className="station-name" x="8" y="-7">{isSwallowed ? `ПОГЛОЩЕНО · ${node.name}` : isPolis ? `ПОЛИС · ${node.name}` : isStart ? `СТАРТ · ${node.name}` : node.name}</text>}
              </g>;
            })}
          </g>
        </svg>
        <div className="map-footer"><span>Перетаскивайте карту · колесо мыши или +/− меняют масштаб</span><div><button onClick={exportState}>Экспорт</button><label className="file-button">Импорт<input type="file" accept="application/json" onChange={(e) => importState(e.target.files?.[0])} /></label></div></div>
      </div>
    </section>
  );
}

function ModeButton({ mode, current, set, icon, label }: { mode: Mode; current: Mode; set: (m: Mode) => void; icon: string; label: string }) { return <button className={current === mode ? "mode active" : "mode"} onClick={() => set(mode)}><span>{icon}</span>{label}</button>; }
function edgeName(edge: typeof edges[number]) { return `${byId.get(edge.source)?.name} — ${byId.get(edge.target)?.name}`; }
function trackName(edge: typeof tunnelEdges[number], direction: Direction) { const from = direction === "forward" ? byId.get(edge.source) : byId.get(edge.target); const to = direction === "forward" ? byId.get(edge.target) : byId.get(edge.source); return `${from?.name} → ${to?.name}`; }
function parseTrack(value: string) { if (value.endsWith("::forward")) return { edgeId: value.slice(0, -9), direction: "forward" as Direction }; if (value.endsWith("::backward")) return { edgeId: value.slice(0, -10), direction: "backward" as Direction }; return undefined; }
function trackGeometry(edge: typeof tunnelEdges[number], direction: Direction) { const a = byId.get(edge.source)!; const b = byId.get(edge.target)!; const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.max(1, Math.hypot(dx, dy)); const nx = -dy / length * 3.8; const ny = dx / length * 3.8; return direction === "forward" ? { x1: a.x + nx, y1: a.y + ny, x2: b.x + nx, y2: b.y + ny } : { x1: b.x - nx, y1: b.y - ny, x2: a.x - nx, y2: a.y - ny }; }
function markLabel(mark?: EdgeMark) { return mark === "safe" ? "Открыт · безопасен" : mark === "unknown" ? "Непонятный" : mark === "closed" ? "Закрыт" : "Открытый"; }

function PlayersPanel({ game, setGame, addLog }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>>; addLog: (s: string) => void }) {
  const updatePlayer = (index:number, patch:Partial<PlayerState>) => setGame((current) => ({...current, players:current.players.map((player,i) => i === index ? {...player,...patch} : player)}));
  const toggleLimb = (index:number, limb:Limb) => { const player=game.players[index]; const wasLost=player.lostLimbs.includes(limb); const lostLimbs=wasLost ? player.lostLimbs.filter((item)=>item!==limb) : [...player.lostLimbs,limb]; updatePlayer(index,{lostLimbs}); addLog(wasLost ? `${player.name}: конечность восстановлена.` : lostLimbs.length===4 ? `${player.name} погиб и исчез с публичной карты.` : `${player.name}: потеряна конечность ${lostLimbs.length}/4.`); };
  const activePlayers=game.players.slice(0,game.activePlayerCount);
  return <section className="tool-page players-page"><div className="tool-intro"><p className="eyebrow">Онлайн-пул ролей</p><h2>Персонажи и позиции</h2><p>Публично видны имя роли, открытый факт и точная станция. Инвентарь, личная цель и секрет остаются на телефоне. После четвёртой потерянной конечности фигурка автоматически исчезает с карты.</p></div><div className="players-toolbar session-mode"><span>Режим партии: <strong>{game.activePlayerCount===4 ? "тест · 2 пары" : "полный · 6 пар"}</strong></span><button className={game.activePlayerCount===4 ? "active" : ""} onClick={()=>setGame((g)=>({...g,activePlayerCount:4,activePair:Math.min(g.activePair,1)}))}>2 пары</button><button className={game.activePlayerCount===12 ? "active" : ""} onClick={()=>setGame((g)=>({...g,activePlayerCount:12}))}>6 пар</button><span>Живы: <strong>{activePlayers.filter((p)=>p.lostLimbs.length<4).length}</strong> / {activePlayers.length}</span></div><div className="players-grid role-grid">{activePlayers.map((player,index)=>{ const role=roleCards.find((entry)=>entry.id===player.roleId) || roleCards[index]; const lostCount=player.lostLimbs.length; const owned=npcCards.filter((npc)=>game.npcOwners[npc.id]===index); return <article className={`player-card role-card ${lostCount===4?"dead":lostCount===3?"critical":""}`} key={index}><div className="player-head"><span>{String(index+1).padStart(2,"0")}</span><input value={player.name} onChange={(e)=>updatePlayer(index,{name:e.target.value})}/><strong>{lostCount===4?"Погиб":`Пара ${role.pair}`}</strong></div><div className="role-title"><div><small>{role.pairName}</small><h3>{role.name}</h3></div><b>◉ {player.bullets}</b></div><p className="public-fact"><span>Публично</span>{role.publicFact}</p><p className="role-history">{role.history}</p><details><summary>Личная карта ведущей</summary><p><b>Способность.</b> {role.ability}</p>{role.upgrade&&<p><b>Усиление.</b> {role.upgrade}</p>}<p><b>Цель.</b> {role.goal}</p><p><b>Старт.</b> {role.items.join(" · ")}</p></details><label className="player-position">Текущая станция<select value={player.position} disabled={lostCount===4} onChange={(e)=>{updatePlayer(index,{position:e.target.value}); addLog(`${player.name} перемещён на ${byId.get(e.target.value)?.name}.`);}}>{nodes.slice().sort((a,b)=>a.name.localeCompare(b.name,"ru")).map((node)=><option key={node.id} value={node.id}>{node.name} · {node.lineId}</option>)}</select></label>{owned.length>0&&<div className="owned-npcs"><span>Личные NPC</span>{owned.map((npc)=><b key={npc.id}>{npc.kind==="animal"?"◈":"♙"} {npc.name}</b>)}</div>}<div className="limbs">{limbOptions.map((limb)=>{const lost=player.lostLimbs.includes(limb.id); return <button className={lost?"limb lost":"limb"} key={limb.id} onClick={()=>toggleLimb(index,limb.id)}><span>{limb.short}</span><b>{lost?"потеряна":"цела"}</b></button>;})}</div><div className="personal-health"><p><span>♥ Личная шкала ведущей</span><small>не правило</small></p><div className="hearts">{Array.from({length:10},(_,heart)=><button key={heart} className={heart<player.health?"heart active":"heart"} onClick={()=>updatePlayer(index,{health:heart+1})}>♥</button>)}</div></div></article>;})}</div></section>;
}

function NpcPanel({game,setGame,addLog}:{game:GameState;setGame:React.Dispatch<React.SetStateAction<GameState>>;addLog:(s:string)=>void}) {
  const [filter,setFilter]=useState<"all"|"station"|"hired"|"used"|"animal">("all");
  const activePlayers=game.players.slice(0,game.activePlayerCount);
  const cards=npcCards.filter((npc)=>filter==="all" || (filter==="station"&&game.npcOwners[npc.id]==null&&game.npcPositions[npc.id]!=="__devoured__") || (filter==="hired"&&game.npcOwners[npc.id]!=null) || (filter==="used"&&game.npcServiceUsed[npc.id]) || (filter==="animal"&&npc.kind==="animal"));
  const hire=(npcId:string,owner:number)=>{ const npc=npcCards.find((entry)=>entry.id===npcId)!; const player=game.players[owner]; if(player.bullets<npc.price){addLog(`${player.name}: не хватает патронов для найма ${npc.name}.`);return;} if(game.npcPositions[npcId]!==player.position){addLog(`${npc.name} и ${player.name} находятся на разных станциях.`);return;} setGame((g)=>({...g,players:g.players.map((p,i)=>i===owner?{...p,bullets:p.bullets-npc.price}:p),npcOwners:{...g.npcOwners,[npcId]:owner},log:[`${player.name} нанял ${npc.name} за ${npc.price} патронов.`,...g.log]}));};
  const transfer=(npcId:string,owner:number)=>setGame((g)=>({...g,npcOwners:{...g.npcOwners,[npcId]:owner},log:[`${npcCards.find((n)=>n.id===npcId)?.name} передан персонажу ${g.players[owner].name}.`,...g.log]}));
  const use=(npcId:string)=>setGame((g)=>({...g,npcServiceUsed:{...g.npcServiceUsed,[npcId]:true},log:[`Одноразовая услуга NPC «${npcCards.find((n)=>n.id===npcId)?.name}» применена.`,...g.log]}));
  const release=(npcId:string)=>setGame((g)=>{const owner=g.npcOwners[npcId];const npcOwners={...g.npcOwners};delete npcOwners[npcId];return{...g,npcOwners,npcPositions:{...g.npcPositions,[npcId]:owner==null?g.npcPositions[npcId]:g.players[owner].position},log:[`NPC ${npcCards.find((n)=>n.id===npcId)?.name} оставлен на станции.`,...g.log]};});
  return <section className="tool-page npc-page"><div className="tool-intro"><p className="eyebrow">Одноразовые спутники</p><h2>Карточки NPC</h2><p>NPC принадлежит конкретному персонажу, а не отряду. При разделении карточка остаётся в телефоне владельца. После применения услуги её текст исчезает, но NPC можно продолжать вести или принести в жертву.</p></div><div className="deck-switch">{([['all','Все'],['station','На станциях'],['hired','Наняты'],['used','Использованы'],['animal','Животные']] as const).map(([id,label])=><button key={id} className={filter===id?"active":""} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="npc-card-grid">{cards.map((npc)=>{const owner=game.npcOwners[npc.id];const used=game.npcServiceUsed[npc.id];const location=game.npcPositions[npc.id];const station=byId.get(location);const ownerPlayer=owner==null?undefined:game.players[owner];const eligible=activePlayers.map((player,index)=>({player,index})).filter(({player})=>player.lostLimbs.length<4&&(owner==null?player.position===location:player.position===ownerPlayer?.position));return <article className={`npc-card ${used?"used":""} ${location==="__devoured__"?"devoured":""}`} key={npc.id}><div className="npc-art" style={npc.kind==="human"?{backgroundImage:"url('/npc-atlas-v1.png')",backgroundPosition:`${(npc.portrait%5)*25}% ${Math.floor(npc.portrait/5)*25}%`}:undefined}>{npc.kind==="animal"&&<span>{npc.id==="npc-26"?"🐕":"🐈"}</span>}<b>{npc.price}<small>◉</small></b></div><div className="npc-card-copy"><small>{npc.kind==="animal"?"Животное":"Человек"} · {npc.id}</small><h3>{npc.name}</h3><p>{npc.history}</p><div className="npc-service"><span>Одноразовая услуга</span>{used?<strong>УСЛУГА ИСПОЛЬЗОВАНА</strong>:<p>{npc.service}</p>}</div><div className="npc-status">{location==="__devoured__"?<b>Поглощён</b>:ownerPlayer?<b>Владелец: {ownerPlayer.name}</b>:<b>Станция: {station?.name||"резерв"}</b>}</div>{location!=="__devoured__"&&<div className="npc-controls"><select defaultValue="" onChange={(e)=>{if(!e.target.value)return; const next=Number(e.target.value); owner==null?hire(npc.id,next):transfer(npc.id,next); e.currentTarget.value="";}}><option value="">{owner==null?"Нанять персонажем…":"Передать персонажу…"}</option>{eligible.map(({player,index})=><option value={index} key={index}>{player.name} · {byId.get(player.position)?.name}</option>)}</select>{owner!=null&&!used&&<button onClick={()=>use(npc.id)}>Применить услугу</button>}{owner!=null&&<button onClick={()=>release(npc.id)}>Оставить</button>}</div>}</div></article>;})}</div></section>;
}

function CrisisPanel({addLog}:{addLog:(s:string)=>void}) {
  const [selected,setSelected]=useState(crisisCards[0].id);
  const [resolved,setResolved]=useState<string[]>([]);
  const crisis=crisisCards.find((card)=>card.id===selected)!;
  return <section className="tool-page crisis-page"><div className="tool-intro"><p className="eyebrow">Общая локальная сцена</p><h2>Кризисы метро</h2><p>Кризис всегда заканчивается и возвращает игру к карте. Игроки коллективно выбирают цену; невыполненные условия меняют мир, а не блокируют партию.</p></div><div className="crisis-layout"><aside>{crisisCards.map((card)=><button key={card.id} className={selected===card.id?"active":""} onClick={()=>setSelected(card.id)}><span>{card.id.replace("crisis-","")}</span><b>{card.title}</b><small>{resolved.includes(card.id)?"разрешён":"готов"}</small></button>)}</aside><article className="crisis-card"><div><span>Условие запуска</span><p>{crisis.trigger}</p></div><h3>{crisis.title}</h3><p className="crisis-demand">{crisis.demand}</p><section><span>Варианты общей цены</span>{crisis.options.map((option,index)=><p key={option}><b>{index+1}</b>{option}</p>)}</section><div className="crisis-result"><span>Не стопорит игру</span><p>{crisis.result}</p></div><button className="primary full" onClick={()=>{setResolved((current)=>current.includes(crisis.id)?current:[...current,crisis.id]);addLog(`Кризис «${crisis.title}» разрешён.`);}}>Разрешить и записать</button></article></div></section>;
}

function ChallengeDeckPanel({ addLog, time }: { addLog: (s: string) => void; time: TimeOfDay }) {
  const [view, setView] = useState<"challenge" | "items">("challenge");
  const [card, setCard] = useState<ChallengeCard | null>(null);
  const [itemId, setItemId] = useState("");
  const [proposal, setProposal] = useState("");
  const [ruling, setRuling] = useState<"Одобрено" | "Одобрено с ценой" | "Последствие / отказ" | null>(null);
  const draw = () => {
    const next = challengeCards[Math.floor(Math.random() * challengeCards.length)];
    setCard(next); setItemId(""); setProposal(""); setRuling(null);
    addLog(`Открыто испытание «${next.title}» (${next.category}).`);
  };
  const decide = (decision: "Одобрено" | "Одобрено с ценой" | "Последствие / отказ") => {
    if (!card) return;
    setRuling(decision);
    const item = itemCards.find((entry) => entry.id === itemId)?.title;
    addLog(`Испытание «${card.title}»: ${decision.toLowerCase()}${item ? ` · предъявлен предмет «${item}»` : ""}${proposal.trim() ? ` · решение: ${proposal.trim()}` : ""}.`);
  };
  return <section className="tool-page card-deck-page"><div className="tool-intro"><p className="eyebrow">Ролевые испытания · общее время: {time}</p><h2>Карточки тоннелей</h2><p>Карточка задаёт ситуацию и открытый вопрос. Игроки предлагают предмет, способность или отыгранное решение; ведущая вручную принимает его, назначает цену либо последствие.</p>{time === "Ночь" && <div className="night-warning">Ночь: ведущая может усиливать последствия. Это ориентир для сцены, а не автоматическая проверка.</div>}</div><div className="deck-switch"><button className={view === "challenge" ? "active" : ""} onClick={() => setView("challenge")}>Испытания · {challengeCards.length}</button><button className={view === "items" ? "active" : ""} onClick={() => setView("items")}>Предметы · {itemCards.length}</button></div>{view === "challenge" ? <div className="challenge-layout"><section className="challenge-card">{card ? <><div className="challenge-card-head"><span>{card.category}</span><small>{card.id}</small></div><h3>{card.title}</h3><p className="challenge-scene">{card.scene}</p><div className="challenge-question"><span>Открытый вопрос</span><strong>{card.question}</strong></div><div className="counter-list"><span>Ориентиры, не ограничение</span>{card.counters.map((counter) => <b key={counter}>{counter}</b>)}</div><div className="challenge-stakes"><p><span>Если решения нет</span>{card.consequence}</p>{card.reward && <p className="reward"><span>Возможная награда</span>{card.reward}</p>}</div></> : <div className="result-empty"><strong>Колода готова</strong><p>Откройте случайную ситуацию, когда отряд входит в опасный или неизвестный тоннель. Никакого правильного ответа внутри сайта нет.</p></div>}<button className="primary full" onClick={draw}>{card ? "Следующая карточка" : "Открыть карточку"}</button></section><section className="ruling-panel"><p className="side-label">Решение отряда</p><label>Предъявленный предмет<select value={itemId} onChange={(event) => setItemId(event.target.value)}><option value="">Без карточки предмета</option>{itemCards.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.cost} патр.</option>)}</select></label><label>Предложение или отыгрыш<textarea value={proposal} onChange={(event) => setProposal(event.target.value)} placeholder="Например: натягиваем тент, отводим воду проволокой и сначала переводим раненого…" /></label><div className="ruling-buttons"><button disabled={!card} onClick={() => decide("Одобрено")}>Одобрить</button><button disabled={!card} onClick={() => decide("Одобрено с ценой")}>С ценой</button><button disabled={!card} onClick={() => decide("Последствие / отказ")}>Последствие</button></div>{ruling && <div className="ruling-result"><span>Решение ведущей</span><strong>{ruling}</strong><p>Записано в журнал. Предложенные контрмеры на карточке не являются белым списком.</p></div>}<div className="rule-note"><span>Ручное решение</span><p>Хороший отыгрыш может сработать без предмета. Предмет тоже не гарантирует успех, если способ применения не объяснён.</p></div></section></div> : <div className="item-library">{itemCards.map((item) => <article key={item.id}><div><span>{item.category}</span><b>{item.cost} патр.</b></div><h3>{item.title}</h3><p>{item.description}</p><div className="item-tags">{item.tags.map((tag) => <i key={tag}>{tag}</i>)}</div><ul>{item.examples.map((example) => <li key={example}>{example}</li>)}</ul></article>)}</div>}</section>;
}

function DeathPanel({ addLog }: { addLog: (s: string) => void }) {
  const [yes, setYes] = useState(0); const [no, setNo] = useState(0); const [cards, setCards] = useState<string[][]>([]);
  const choice = yes > no;
  const draw = () => { const light = lightForms[Math.floor(Math.random() * lightForms.length)]; const dark = darkForms[Math.floor(Math.random() * darkForms.length)]; const next = choice ? [light, dark] : [[...(yes === no ? dark : (no > yes ? dark : light))]]; setCards(next); addLog(choice ? "Умершему дан выбор между Светлой и Тёмной формой." : "Форма после смерти назначена без выбора."); };
  return <section className="tool-page death-page"><div className="tool-intro"><p className="eyebrow">Протокол возвращения</p><h2>Что остаётся после смерти</h2><p>Голосуют все живые, кроме умершего. Простое большинство даёт право увидеть две формы и выбрать одну. Ничья означает назначение по обстоятельствам смерти.</p></div><div className="death-grid"><section className="vote-card"><p className="side-label">Голосование живых</p><div className="vote-row"><button className="vote light" onClick={() => setYes(Math.max(0, yes - 1))}>−</button><strong>{yes}</strong><button className="vote light" onClick={() => setYes(yes + 1)}>+</button><span>дать выбор</span></div><div className="vote-row"><button className="vote dark" onClick={() => setNo(Math.max(0, no - 1))}>−</button><strong>{no}</strong><button className="vote dark" onClick={() => setNo(no + 1)}>+</button><span>назначить форму</span></div><div className={`verdict ${choice ? "choice" : "assigned"}`}><span>{choice ? "Выбор предоставлен" : yes === no ? "Ничья — без выбора" : "Форма назначается"}</span><p>{choice ? "Откройте одну светлую и одну тёмную карту." : "Откройте одну карту, связанную со смертью и поступками."}</p></div><button className="primary full" onClick={draw}>{choice ? "Открыть две формы" : "Назначить одну форму"}</button></section><section className="afterlife-cards">{cards.length ? cards.map((card, i) => <article key={`${card[0]}-${i}`} className={i === 0 && cards.length > 1 ? "after-card light" : "after-card dark"}><p>{i === 0 && cards.length > 1 ? "Светлая форма" : "Тёмная форма"}</p><h3>{card[0]}</h3><span>{card[1]}</span></article>) : <div className="card-placeholder"><span>◇</span><p>Здесь появятся карты новой формы</p></div>}</section></div><div className="death-rules"><article><strong>Максимум три</strong><span>В партии только три места для сверхъестественных форм.</span></article><article><strong>Один в тоннеле</strong><span>Мёртвый может идти один по любому перегону, но не переносит живых.</span></article><article><strong>Свидетель</strong><span>Напарник рядом получает жетон: одиночный переход или скидка 2 патрона на NPC.</span></article></div></section>;
}

function LogPanel({ game, setGame }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>> }) {
  return <section className="tool-page log-page"><div className="tool-intro"><p className="eyebrow">Хроника партии</p><h2>Журнал ведущего</h2><p>Сюда автоматически попадают раунды, разведанные тоннели, испытания и решения после смерти.</p></div><div className="log-card"><div className="log-head"><span>{game.log.length} записей</span><button onClick={() => setGame((g) => ({ ...g, log: [] }))}>Очистить журнал</button></div>{game.log.length ? game.log.map((entry, index) => <div className="log-entry" key={`${entry}-${index}`}><b>{String(game.log.length - index).padStart(2, "0")}</b><p>{entry}</p></div>) : <div className="result-empty"><strong>Журнал пуст</strong><p>Новые события появятся здесь автоматически.</p></div>}</div></section>;
}
