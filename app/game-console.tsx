"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { metroData } from "./metro-data";

type Tab = "map" | "wheel" | "death" | "log";
type Mode = "inspect" | "npc" | "safe" | "unknown" | "closed";
type EdgeMark = "normal" | "safe" | "unknown" | "closed";
type TimeOfDay = "Утро" | "День" | "Вечер" | "Ночь";
type Direction = "forward" | "backward";
type Transform = { x: number; y: number; k: number };
type GameState = {
  round: number;
  time: TimeOfDay;
  npcPositions: Record<string, string>;
  npcMoveRounds: { gm: number; role: number };
  edges: Record<string, EdgeMark>;
  notes: Record<string, string>;
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
const initialEdges = Object.fromEntries(tunnelEdges.flatMap((e) => e.closedByReality ? [[trackKey(e.id, "forward"), "closed"], [trackKey(e.id, "backward"), "closed"]] : [])) as Record<string, EdgeMark>;
const npcRoster = [
  ["npc-01", "Тихон Путеец"], ["npc-02", "Майя Радио"], ["npc-03", "Сыч"], ["npc-04", "Доктор Ким"],
  ["npc-05", "Лада"], ["npc-06", "Фома Крысолов"], ["npc-07", "Вера Гидролог"], ["npc-08", "Блик"],
  ["npc-09", "Марта Таможня"], ["npc-10", "Егор Печник"], ["npc-11", "Сестра Лея"], ["npc-12", "Шрам"],
  ["npc-13", "Аркадий Архив"], ["npc-14", "Нина Челнок"], ["npc-15", "Соня Проводник"], ["npc-16", "Дед Север"],
  ["npc-17", "Юра Часовщик"], ["npc-18", "Комиссар Рута"], ["npc-19", "Господин Чай"], ["npc-20", "Аглая"],
  ["npc-21", "Механик Дрон"], ["npc-22", "Рахим"], ["npc-23", "Моль"], ["npc-24", "Инга Нулевая"], ["npc-25", "Отец Пепел"],
] as const;
const initialNpcPositions: Record<string, string> = {};
const branchNodeIds = new Set(nodes.filter((node) => tunnelEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length > 2).map((node) => node.id));
const startNodeIds = new Set([
  "1::бульвар рокоссовского", "1::румянцево", "2::речной вокзал", "2::царицыно",
  "3::щелковская", "3::волоколамская", "6::новые черемушки", "7::тушинская",
  "7::рязанский проспект", "8::новокосино", "9::бибирево", "9::пражская",
  "10::верхние лихоборы", "10::люблино", "8A::говорово", "15::стахановская",
]);
const startBriefs: Record<string, { distance: number; history: string; branch: string }> = {
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
    history: "Община обжигает керамические фильтры и хранит батареи в сухих кабельных колодцах. По ночам на стенах появляется белая пыль, похожая на россыпь риса, хотя склады заперты.",
    branch: "Жёлтая ветка знаменита рынками Китай-города, белыми патронами-«рисом» и короткими, богатыми маршрутами к центру.",
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
const initialState: GameState = { round: 1, time: "Утро", npcPositions: initialNpcPositions, npcMoveRounds: { gm: 0, role: -1 }, edges: initialEdges, notes: {}, log: ["Партия создана. Утро. Голоса зовут к Полису."] };

const challenges = [
  { kind: "Угроза", text: "Стая идёт по следу. Оставьте 2 риса или получите рану." },
  { kind: "Выбор", text: "Обход безопасен, но займёт ещё один ход. Короткий путь требует ставки риска." },
  { kind: "Голос", text: "Голос называет имя одного NPC. Проводник знает больше, чем говорит." },
  { kind: "Ресурс", text: "Затопленный склад: возьмите 3 риса, но один предмет намокает." },
  { kind: "Контакт", text: "Патруль требует пошлину: 1 рис за каждые четыре фигурки в отряде." },
  { kind: "Тишина", text: "Ничего не происходит. Именно это пугает сильнее всего." },
  { kind: "Разлом", text: "Проход выдержит только половину отряда. Решите, кто идёт первым." },
  { kind: "След", text: "На стене свежая отметка. Откройте статус соседнего тоннеля." },
  { kind: "Аномалия", text: "Время расходится: следующий ход каравана случится немедленно." },
  { kind: "Испытание", text: "Погасите свет на 45 секунд. Разговаривать можно только шёпотом." },
  { kind: "Находка", text: "Фонарь ещё работает. Получите предмет, но отметьте своё присутствие." },
  { kind: "Долг", text: "Незнакомец помогает пройти, если вы пообещаете услугу в Полисе." },
];

const lightForms = [
  ["Эхо-проводник", "Ходит один по любым тоннелям; раз за игру открывает неизвестный перегон."],
  ["Хранитель памяти", "Сохраняет одну тайну роли и может передать её живому на общей станции."],
  ["Белый связной", "Каждый второй раунд проходит два тоннеля, но обязан закончить ход у живых."],
  ["Смотритель огней", "Снимает одну рану или ступень давления Голоса у встреченного отряда."],
];
const darkForms = [
  ["Голодный шёпот", "Ходит один по любым тоннелям; за 1 рис переманивает NPC у одинокого живого."],
  ["Тёмный разведчик", "Каждый второй раунд проходит два тоннеля и может скрыть статус перегонa."],
  ["Собиратель", "Собирает мёртвых и NPC; на станции требует у живых предмет или тайну."],
  ["Ложный проводник", "Один раз меняет направление каравана или закрывает безопасный тоннель."],
];

function loadState(): GameState {
  if (typeof window === "undefined") return initialState;
  try {
    const parsed = JSON.parse(localStorage.getItem("metro-game-console-v3") || "null");
    return parsed ? { ...initialState, ...parsed, npcPositions: { ...initialNpcPositions, ...(parsed.npcPositions || {}) }, npcMoveRounds: { ...initialState.npcMoveRounds, ...(parsed.npcMoveRounds || {}) }, edges: { ...initialEdges, ...(parsed.edges || {}) } } : initialState;
  } catch { return initialState; }
}

export function GameConsole() {
  const [tab, setTab] = useState<Tab>("map");
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setGame(loadState()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("metro-game-console-v3", JSON.stringify(game)); }, [game, hydrated]);

  const addLog = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setGame((g) => ({ ...g, log: [`${stamp} · ${message}`, ...g.log].slice(0, 80) }));
  }, []);

  const nextRound = () => {
    setGame((g) => ({ ...g, round: g.round + 1, log: [`Раунд ${g.round + 1} начался. Караваны делают ${g.round % 2 ? "ход" : "остановку"}.`, ...g.log] }));
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
          <span>Раунд</span><strong>{String(game.round).padStart(2, "0")}</strong>
          <button className="primary" onClick={nextRound}>Следующий раунд <span>→</span></button>
        </div>
      </header>

      <nav className="tabs" aria-label="Разделы пульта">
        <TabButton active={tab === "map"} onClick={() => setTab("map")} icon="⌘">Карта</TabButton>
        <TabButton active={tab === "wheel"} onClick={() => setTab("wheel")} icon="◉">Колесо испытаний</TabButton>
        <TabButton active={tab === "death"} onClick={() => setTab("death")} icon="◇">После смерти</TabButton>
        <TabButton active={tab === "log"} onClick={() => setTab("log")} icon="≡">Журнал <b>{game.log.length}</b></TabButton>
        <div className="status"><span className="pulse" /> партия сохранена на устройстве</div>
      </nav>

      {tab === "map" && <MapPanel game={game} setGame={setGame} addLog={addLog} onCloseSafe={closeRandomSafe} />}
      {tab === "wheel" && <WheelPanel addLog={addLog} time={game.time} />}
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
  const selectedTrack = selected ? parseTrack(selected) : undefined;
  const selectedEdge = selectedTrack ? tunnelEdges.find((e) => e.id === selectedTrack.edgeId) : undefined;
  const npcHere = selectedNode ? npcRoster.filter(([id]) => game.npcPositions[id] === selectedNode.id) : [];
  const reserveNpcs = npcRoster.filter(([id]) => !game.npcPositions[id]);
  const adjacentStations = movingNpcId && selectedNode ? tunnelEdges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id).map((edge) => byId.get(edge.source === selectedNode.id ? edge.target : edge.source)!).filter((node, index, all) => all.findIndex((other) => other.id === node.id) === index) : [];
  const uniqueNames = useMemo(() => [...new Set(nodes.map((n) => n.name))].sort((a, b) => a.localeCompare(b, "ru")), []);

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
    setTransform({ k: 2.7, x: WIDTH / 2 - node.x * 2.7, y: HEIGHT / 2 - node.y * 2.7 });
  };
  const handleSearch = () => {
    const q = search.toLowerCase().replaceAll("ё", "е").trim();
    const found = nodes.find((n) => n.name.toLowerCase().replaceAll("ё", "е").includes(q));
    if (found) { setSelected(found.id); centerNode(found.id); }
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
    if (!selectedNode || !reserveNpcId || game.npcPositions[reserveNpcId]) return;
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
  const exportState = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `metro-party-round-${game.round}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const importState = (file?: File) => {
    if (!file) return;
    file.text().then((text) => { try { setGame({ ...initialState, ...JSON.parse(text) }); addLog("Сохранение загружено."); } catch { addLog("Файл сохранения не распознан."); } });
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
          <div className="compact-actions"><button onClick={fit}>Показать всё</button><button onClick={() => selectedNode && centerNode(selectedNode.id)}>К выбранной</button></div>
        </section>
        <section className="side-section grow">
          <p className="side-label">Выбрано</p>
          {!selectedNode && !selectedEdge && <div className="empty-selection"><span>⌁</span><p>Ничего не выбрано</p></div>}
          {selectedNode && <div className="selection-card"><span className="line-chip" style={{ background: selectedNode.color }}>{selectedNode.lineId}</span>{branchNodeIds.has(selectedNode.id) && <span className="branch-chip">развилка</span>}{startNodeIds.has(selectedNode.id) && <span className="start-chip">старт</span>}<h3>{selectedNode.name}</h3><p>{selectedNode.lineName}</p><dl><div><dt>NPC</dt><dd>{npcHere.length}</dd></div><div><dt>Ходовых тоннелей</dt><dd>{tunnelEdges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length * 2}</dd></div></dl>{selectedStart && <section className="start-brief"><div className="start-distance"><span>До Полиса</span><strong>{selectedStart.distance}</strong><small>{selectedStart.distance < 5 ? "хода" : "ходов"}</small></div><div><h4>История станции</h4><p>{selectedStart.history}</p><h4>Чем знаменита ветка</h4><p>{selectedStart.branch}</p><small>Кратчайший путь по базовому графу. Перекрытия и события увеличивают расстояние.</small></div></section>}{npcHere.length > 0 && <div className="npc-list"><span>NPC остаются на станции</span>{npcHere.map(([id, name]) => <div key={id} className="npc-actions"><button className={movingNpcId === id ? "npc-row active" : "npc-row"} onClick={() => { setMode("npc"); setMovingNpcId(id); }}>{name}<b>↗</b></button><button className="reserve-return" onClick={() => returnNpcToReserve(id)} title="Вернуть в резерв">×</button></div>)}</div>}{reserveNpcs.length > 0 && <div className="npc-place"><span>Разместить из резерва</span><select value={reserveNpcId} onChange={(e) => setReserveNpcId(e.target.value)}>{reserveNpcs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><button onClick={placeNpc}>Поставить на станцию</button></div>}{movingNpcId && <div className="npc-move"><div className="move-source"><button className={moveSource === "gm" ? "active" : ""} onClick={() => setMoveSource("gm")}>ГМ · 1/раунд</button><button className={moveSource === "role" ? "active" : ""} onClick={() => setMoveSource("role")}>Роль · раз/2 хода</button></div><p>Куда переместить на один перегон:</p>{adjacentStations.map((station) => <button key={station.id} onClick={() => moveNpc(station.id)}>{station.name}</button>)}</div>}<textarea placeholder="Заметка ведущего…" value={game.notes[selectedNode.id] || ""} onChange={(e) => setGame((g) => ({ ...g, notes: { ...g.notes, [selectedNode.id]: e.target.value } }))} /></div>}
          {selectedEdge && selectedTrack && <div className="selection-card"><span className={`edge-chip ${game.edges[trackKey(selectedEdge.id, selectedTrack.direction)] || "normal"}`}>{markLabel(game.edges[trackKey(selectedEdge.id, selectedTrack.direction)])}</span><h3>{trackName(selectedEdge, selectedTrack.direction)}</h3><p>{selectedEdge.lineName} · отдельный ходовой тоннель</p>{game.edges[trackKey(selectedEdge.id, selectedTrack.direction)] === "unknown" && <button className="primary full" onClick={reveal}>Разведать публично</button>}</div>}
        </section>
        <section className="side-section">
          <div className="stat-line"><span>Станций</span><strong>{nodes.length}</strong></div><div className="stat-line"><span>Ходовых тоннелей</span><strong>{tunnelEdges.length * 2}</strong></div><div className="stat-line"><span>Стартовых точек</span><strong>{startNodeIds.size}</strong></div><div className="stat-line"><span>NPC на карте / в резерве</span><strong>{npcRoster.length - reserveNpcs.length} / {reserveNpcs.length}</strong></div>
          <button className="danger-line" onClick={onCloseSafe}>Закрыть случайный безопасный</button>
        </section>
      </aside>

      <div className="map-stage">
        <div className="map-caption"><div><span className="live-dot" /> Оперативная схема</div><div className="legend"><span><i className="start" /> старт</span><span><i className="safe" /> безопасен</span><span><i className="unknown" /> непонятный</span><span><i className="closed" /> закрыт</span></div></div>
        <div className="map-zoom" aria-label="Управление масштабом карты">
          <button type="button" onClick={() => zoomBy(1.3)} aria-label="Увеличить карту" title="Увеличить карту">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Уменьшить карту" title="Уменьшить карту">−</button>
          <button type="button" className="map-zoom-fit" onClick={fit} aria-label="Показать карту целиком" title="Показать карту целиком">Всё</button>
        </div>
        <svg className="metro-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onWheel={(event) => { event.preventDefault(); zoomBy(Math.exp(-event.deltaY * .0012)); }} onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (!drag.current) return; const rect = e.currentTarget.getBoundingClientRect(); setTransform((t) => ({ ...t, x: drag.current!.tx + (e.clientX - drag.current!.x) * WIDTH / rect.width, y: drag.current!.ty + (e.clientY - drag.current!.y) * HEIGHT / rect.height })); }} onPointerUp={() => { drag.current = null; }}>
          <defs><filter id="glow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter><marker id="track-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#172019" /></marker></defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {edges.filter((edge) => edge.type === "transfer").map((edge) => { const a = byId.get(edge.source)!; const b = byId.get(edge.target)!; return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="edge transfer" />; })}
            {tunnelEdges.flatMap((edge) => (["forward", "backward"] as Direction[]).map((direction) => { const geometry = trackGeometry(edge, direction); const key = trackKey(edge.id, direction); const mark = game.edges[key] || "normal"; return <line key={key} x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} stroke={edge.color} markerEnd="url(#track-arrow)" className={`edge track ${mark} ${selected === key ? "selected" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectTrack(edge, direction)} />; }))}
            {nodes.map((node) => { const count = npcRoster.filter(([id]) => game.npcPositions[id] === node.id).length; const isPolis = /библиотека им/i.test(node.name); const isStart = startNodeIds.has(node.id); return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className={`station ${selected === node.id ? "selected" : ""} ${isPolis ? "polis" : ""} ${branchNodeIds.has(node.id) ? "branch" : ""} ${isStart ? "start" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectNode(node.id)}>{branchNodeIds.has(node.id) && <rect className="branch-ring" x="-8" y="-8" width="16" height="16" transform="rotate(45)" />}{isStart && <circle className="start-ring" r="9" />}<circle r={isPolis ? 7 : 4.5} fill={node.color} />{count > 0 && <><circle className="npc-badge" cx="7" cy="-7" r="6" /><text className="npc-count" x="7" y="-7">{count}</text></>} {(transform.k > 2.25 || selected === node.id || isPolis || isStart) && <text className="station-name" x="8" y="-7">{isPolis ? `ПОЛИС · ${node.name}` : isStart ? `СТАРТ · ${node.name}` : node.name}</text>}</g>; })}
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

function WheelPanel({ addLog, time }: { addLog: (s: string) => void; time: TimeOfDay }) {
  const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [result, setResult] = useState<(typeof challenges)[number] | null>(null);
  const spin = () => { if (spinning) return; const index = Math.floor(Math.random() * challenges.length); const next = rotation + 1440 + (360 - index * 30) + 15; setSpinning(true); setRotation(next); setTimeout(() => { setResult(challenges[index]); setSpinning(false); addLog(`Колесо: ${challenges[index].kind} — ${challenges[index].text}`); }, 1650); };
  return <section className="tool-page"><div className="tool-intro"><p className="eyebrow">Тоннельный модуль · общее время: {time}</p><h2>Колесо испытаний</h2><p>Крутите один раз при входе в опасный или неизвестный перегон. Результат задаёт сцену, но последнее решение остаётся за ведущим.</p>{time === "Ночь" && <div className="night-warning">Ночь: при тяжёлом последствии добавьте один жетон риска. Станции становятся безопасной тактической паузой.</div>}</div><div className="wheel-grid"><div className="wheel-wrap"><div className="pointer">▼</div><div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>{challenges.map((item, i) => <span key={i} style={{ transform: `rotate(${i * 30 + 15}deg) translateY(-138px)` }}>{i + 1}</span>)}</div><button className="wheel-button" onClick={spin} disabled={spinning}>{spinning ? "…" : "КРУТИТЬ"}</button></div><div className="result-panel"><p className="side-label">Результат</p>{result ? <><span className="result-kind">{result.kind}</span><h3>{result.text}</h3><div className="result-actions"><button onClick={() => setResult(null)}>Сбросить</button><button className="primary" onClick={spin}>Ещё раз</button></div></> : <div className="result-empty"><strong>Колесо ждёт</strong><p>На нём 12 коротких событий: угроза, ресурс, контакт, аномалия и моральный выбор.</p></div>}<div className="rule-note"><span>Правило риска</span><p>Ставка 0–3 «рисинки». Чистый успех возвращает ставку; тяжёлое последствие забирает её в банк.</p></div></div></div></section>;
}

function DeathPanel({ addLog }: { addLog: (s: string) => void }) {
  const [yes, setYes] = useState(0); const [no, setNo] = useState(0); const [cards, setCards] = useState<string[][]>([]);
  const choice = yes > no;
  const draw = () => { const light = lightForms[Math.floor(Math.random() * lightForms.length)]; const dark = darkForms[Math.floor(Math.random() * darkForms.length)]; const next = choice ? [light, dark] : [[...(yes === no ? dark : (no > yes ? dark : light))]]; setCards(next); addLog(choice ? "Умершему дан выбор между Светлой и Тёмной формой." : "Форма после смерти назначена без выбора."); };
  return <section className="tool-page death-page"><div className="tool-intro"><p className="eyebrow">Протокол возвращения</p><h2>Что остаётся после смерти</h2><p>Голосуют все живые, кроме умершего. Простое большинство даёт право увидеть две формы и выбрать одну. Ничья означает назначение по обстоятельствам смерти.</p></div><div className="death-grid"><section className="vote-card"><p className="side-label">Голосование живых</p><div className="vote-row"><button className="vote light" onClick={() => setYes(Math.max(0, yes - 1))}>−</button><strong>{yes}</strong><button className="vote light" onClick={() => setYes(yes + 1)}>+</button><span>дать выбор</span></div><div className="vote-row"><button className="vote dark" onClick={() => setNo(Math.max(0, no - 1))}>−</button><strong>{no}</strong><button className="vote dark" onClick={() => setNo(no + 1)}>+</button><span>назначить форму</span></div><div className={`verdict ${choice ? "choice" : "assigned"}`}><span>{choice ? "Выбор предоставлен" : yes === no ? "Ничья — без выбора" : "Форма назначается"}</span><p>{choice ? "Откройте одну светлую и одну тёмную карту." : "Откройте одну карту, связанную со смертью и поступками."}</p></div><button className="primary full" onClick={draw}>{choice ? "Открыть две формы" : "Назначить одну форму"}</button></section><section className="afterlife-cards">{cards.length ? cards.map((card, i) => <article key={`${card[0]}-${i}`} className={i === 0 && cards.length > 1 ? "after-card light" : "after-card dark"}><p>{i === 0 && cards.length > 1 ? "Светлая форма" : "Тёмная форма"}</p><h3>{card[0]}</h3><span>{card[1]}</span></article>) : <div className="card-placeholder"><span>◇</span><p>Здесь появятся карты новой формы</p></div>}</section></div><div className="death-rules"><article><strong>Максимум три</strong><span>В партии только три места для сверхъестественных форм.</span></article><article><strong>Один в тоннеле</strong><span>Мёртвый может идти один по любому перегону, но не переносит живых.</span></article><article><strong>Свидетель</strong><span>Напарник рядом получает жетон: одиночный переход или скидка 2 риса на NPC.</span></article></div></section>;
}

function LogPanel({ game, setGame }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>> }) {
  return <section className="tool-page log-page"><div className="tool-intro"><p className="eyebrow">Хроника партии</p><h2>Журнал ведущего</h2><p>Сюда автоматически попадают раунды, разведанные тоннели, испытания и решения после смерти.</p></div><div className="log-card"><div className="log-head"><span>{game.log.length} записей</span><button onClick={() => setGame((g) => ({ ...g, log: [] }))}>Очистить журнал</button></div>{game.log.length ? game.log.map((entry, index) => <div className="log-entry" key={`${entry}-${index}`}><b>{String(game.log.length - index).padStart(2, "0")}</b><p>{entry}</p></div>) : <div className="result-empty"><strong>Журнал пуст</strong><p>Новые события появятся здесь автоматически.</p></div>}</div></section>;
}
