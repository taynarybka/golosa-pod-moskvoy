"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { metroData } from "./metro-data";

type Tab = "map" | "wheel" | "death" | "log";
type Mode = "inspect" | "npc" | "safe" | "unknown" | "closed";
type EdgeMark = "normal" | "safe" | "unknown" | "closed";
type Transform = { x: number; y: number; k: number };
type GameState = {
  round: number;
  npc: Record<string, number>;
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
const tunnelEdges = edges.filter((e) => e.type !== "transfer");
const initialEdges = Object.fromEntries(edges.filter((e) => e.closedByReality).map((e) => [e.id, "closed"])) as Record<string, EdgeMark>;
const initialState: GameState = { round: 1, npc: {}, edges: initialEdges, notes: {}, log: ["Партия создана. Голоса зовут к Полису."] };

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
    const parsed = JSON.parse(localStorage.getItem("metro-game-console-v1") || "null");
    return parsed ? { ...initialState, ...parsed, edges: { ...initialEdges, ...(parsed.edges || {}) } } : initialState;
  } catch { return initialState; }
}

export function GameConsole() {
  const [tab, setTab] = useState<Tab>("map");
  const [game, setGame] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setGame(loadState()); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("metro-game-console-v1", JSON.stringify(game)); }, [game, hydrated]);

  const addLog = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setGame((g) => ({ ...g, log: [`${stamp} · ${message}`, ...g.log].slice(0, 80) }));
  }, []);

  const nextRound = () => {
    setGame((g) => ({ ...g, round: g.round + 1, log: [`Раунд ${g.round + 1} начался. Караваны делают ${g.round % 2 ? "ход" : "остановку"}.`, ...g.log] }));
  };

  const closeRandomSafe = () => {
    const candidates = tunnelEdges.filter((e) => game.edges[e.id] === "safe");
    if (!candidates.length) { addLog("Нет безопасных тоннелей, которые можно закрыть."); return; }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    setGame((g) => ({ ...g, edges: { ...g.edges, [chosen.id]: "closed" }, log: [`Безопасный тоннель закрыт: ${edgeName(chosen)}.`, ...g.log] }));
  };

  const totalNpc = Object.values(game.npc).reduce((sum, value) => sum + value, 0);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div><p className="eyebrow">Пульт ведущего · Москва, 2030</p><h1>Голоса под Москвой</h1></div>
        </div>
        <div className="round-control">
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

      {tab === "map" && <MapPanel game={game} setGame={setGame} addLog={addLog} onCloseSafe={closeRandomSafe} totalNpc={totalNpc} />}
      {tab === "wheel" && <WheelPanel addLog={addLog} />}
      {tab === "death" && <DeathPanel addLog={addLog} />}
      {tab === "log" && <LogPanel game={game} setGame={setGame} />}
    </main>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return <button className={active ? "tab active" : "tab"} onClick={onClick}><span aria-hidden="true">{icon}</span>{children}</button>;
}

function MapPanel({ game, setGame, addLog, onCloseSafe, totalNpc }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>>; addLog: (s: string) => void; onCloseSafe: () => void; totalNpc: number }) {
  const [mode, setMode] = useState<Mode>("inspect");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [transform, setTransform] = useState<Transform>({ x: 132, y: 96, k: .76 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const selectedNode = selected ? byId.get(selected) : undefined;
  const selectedEdge = selected ? edges.find((e) => e.id === selected) : undefined;
  const uniqueNames = useMemo(() => [...new Set(nodes.map((n) => n.name))].sort((a, b) => a.localeCompare(b, "ru")), []);

  const fit = () => setTransform({ x: 132, y: 96, k: .76 });
  const centerNode = (id: string) => {
    const node = byId.get(id); if (!node) return;
    setTransform({ k: 2.7, x: WIDTH / 2 - node.x * 2.7, y: HEIGHT / 2 - node.y * 2.7 });
  };
  const handleSearch = () => {
    const q = search.toLowerCase().replaceAll("ё", "е").trim();
    const found = nodes.find((n) => n.name.toLowerCase().replaceAll("ё", "е").includes(q));
    if (found) { setSelected(found.id); centerNode(found.id); }
  };
  const selectNode = (id: string) => {
    setSelected(id);
    if (mode === "npc") {
      setGame((g) => ({ ...g, npc: { ...g.npc, [id]: ((g.npc[id] || 0) + 1) % 4 } }));
    }
  };
  const selectEdge = (id: string) => {
    setSelected(id);
    const edge = edges.find((e) => e.id === id); if (!edge || edge.type === "transfer" || mode === "inspect" || mode === "npc") return;
    const mark: EdgeMark = mode;
    setGame((g) => ({ ...g, edges: { ...g.edges, [id]: g.edges[id] === mark ? "normal" : mark } }));
  };
  const reveal = () => {
    if (!selectedEdge) return;
    setGame((g) => ({ ...g, edges: { ...g.edges, [selectedEdge.id]: "normal" }, log: [`Разведан тоннель: ${edgeName(selectedEdge)}. Информация теперь общая.`, ...g.log] }));
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
            <ModeButton mode="unknown" current={mode} set={setMode} icon="?" label="Неизвестен" />
            <ModeButton mode="closed" current={mode} set={setMode} icon="×" label="Закрыт" />
          </div>
          <p className="hint">{mode === "npc" ? "Нажимайте станцию: 0 → 1 → 2 → 3 NPC." : mode === "inspect" ? "Выберите станцию или тоннель, чтобы увидеть сведения." : "Нажимайте тоннели, чтобы поставить или снять метку."}</p>
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
          {selectedNode && <div className="selection-card"><span className="line-chip" style={{ background: selectedNode.color }}>{selectedNode.lineId}</span><h3>{selectedNode.name}</h3><p>{selectedNode.lineName}</p><dl><div><dt>NPC</dt><dd>{game.npc[selectedNode.id] || 0}</dd></div><div><dt>Связей</dt><dd>{edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}</dd></div></dl><textarea placeholder="Заметка ведущего…" value={game.notes[selectedNode.id] || ""} onChange={(e) => setGame((g) => ({ ...g, notes: { ...g.notes, [selectedNode.id]: e.target.value } }))} /></div>}
          {selectedEdge && <div className="selection-card"><span className={`edge-chip ${game.edges[selectedEdge.id] || "normal"}`}>{selectedEdge.type === "transfer" ? "Переход" : markLabel(game.edges[selectedEdge.id])}</span><h3>{edgeName(selectedEdge)}</h3><p>{selectedEdge.lineName}</p>{game.edges[selectedEdge.id] === "unknown" && <button className="primary full" onClick={reveal}>Разведать публично</button>}</div>}
        </section>
        <section className="side-section">
          <div className="stat-line"><span>Станций</span><strong>{nodes.length}</strong></div><div className="stat-line"><span>Тоннелей</span><strong>{tunnelEdges.length}</strong></div><div className="stat-line"><span>NPC на карте</span><strong>{totalNpc} / 25</strong></div>
          <button className="danger-line" onClick={onCloseSafe}>Закрыть случайный безопасный</button>
        </section>
      </aside>

      <div className="map-stage">
        <div className="map-caption"><div><span className="live-dot" /> Оперативная схема</div><div className="legend"><span><i className="safe" /> безопасен</span><span><i className="unknown" /> неизвестен</span><span><i className="closed" /> закрыт</span></div></div>
        <svg className="metro-map" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} onWheel={(event) => { event.preventDefault(); const factor = Math.exp(-event.deltaY * .0012); setTransform((t) => ({ ...t, k: Math.max(.28, Math.min(7, t.k * factor)) })); }} onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (!drag.current) return; const rect = e.currentTarget.getBoundingClientRect(); setTransform((t) => ({ ...t, x: drag.current!.tx + (e.clientX - drag.current!.x) * WIDTH / rect.width, y: drag.current!.ty + (e.clientY - drag.current!.y) * HEIGHT / rect.height })); }} onPointerUp={() => { drag.current = null; }}>
          <defs><filter id="glow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {edges.map((edge) => { const a = byId.get(edge.source)!; const b = byId.get(edge.target)!; const mark = game.edges[edge.id] || "normal"; return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edge.color} className={`edge ${edge.type} ${mark} ${selected === edge.id ? "selected" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectEdge(edge.id)} />; })}
            {nodes.map((node) => { const count = game.npc[node.id] || 0; const isPolis = /библиотека им/i.test(node.name); return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className={`station ${selected === node.id ? "selected" : ""} ${isPolis ? "polis" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => selectNode(node.id)}><circle r={isPolis ? 7 : 4.5} fill={node.color} />{count > 0 && <><circle className="npc-badge" cx="7" cy="-7" r="6" /><text className="npc-count" x="7" y="-7">{count}</text></>} {(transform.k > 2.25 || selected === node.id || isPolis) && <text className="station-name" x="8" y="-7">{isPolis ? `ПОЛИС · ${node.name}` : node.name}</text>}</g>; })}
          </g>
        </svg>
        <div className="map-footer"><span>Перетаскивайте карту · колесо мыши меняет масштаб</span><div><button onClick={exportState}>Экспорт</button><label className="file-button">Импорт<input type="file" accept="application/json" onChange={(e) => importState(e.target.files?.[0])} /></label></div></div>
      </div>
    </section>
  );
}

function ModeButton({ mode, current, set, icon, label }: { mode: Mode; current: Mode; set: (m: Mode) => void; icon: string; label: string }) { return <button className={current === mode ? "mode active" : "mode"} onClick={() => set(mode)}><span>{icon}</span>{label}</button>; }
function edgeName(edge: typeof edges[number]) { return `${byId.get(edge.source)?.name} — ${byId.get(edge.target)?.name}`; }
function markLabel(mark?: EdgeMark) { return mark === "safe" ? "Безопасен" : mark === "unknown" ? "Неизвестен" : mark === "closed" ? "Закрыт" : "Обычный"; }

function WheelPanel({ addLog }: { addLog: (s: string) => void }) {
  const [rotation, setRotation] = useState(0); const [spinning, setSpinning] = useState(false); const [result, setResult] = useState<(typeof challenges)[number] | null>(null);
  const spin = () => { if (spinning) return; const index = Math.floor(Math.random() * challenges.length); const next = rotation + 1440 + (360 - index * 30) + 15; setSpinning(true); setRotation(next); setTimeout(() => { setResult(challenges[index]); setSpinning(false); addLog(`Колесо: ${challenges[index].kind} — ${challenges[index].text}`); }, 1650); };
  return <section className="tool-page"><div className="tool-intro"><p className="eyebrow">Тоннельный модуль</p><h2>Колесо испытаний</h2><p>Крутите один раз при входе в опасный или неизвестный перегон. Результат задаёт сцену, но последнее решение остаётся за ведущим.</p></div><div className="wheel-grid"><div className="wheel-wrap"><div className="pointer">▼</div><div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>{challenges.map((item, i) => <span key={i} style={{ transform: `rotate(${i * 30 + 15}deg) translateY(-138px)` }}>{i + 1}</span>)}</div><button className="wheel-button" onClick={spin} disabled={spinning}>{spinning ? "…" : "КРУТИТЬ"}</button></div><div className="result-panel"><p className="side-label">Результат</p>{result ? <><span className="result-kind">{result.kind}</span><h3>{result.text}</h3><div className="result-actions"><button onClick={() => setResult(null)}>Сбросить</button><button className="primary" onClick={spin}>Ещё раз</button></div></> : <div className="result-empty"><strong>Колесо ждёт</strong><p>На нём 12 коротких событий: угроза, ресурс, контакт, аномалия и моральный выбор.</p></div>}<div className="rule-note"><span>Правило риска</span><p>Ставка 0–3 «рисинки». Чистый успех возвращает ставку; тяжёлое последствие забирает её в банк.</p></div></div></div></section>;
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
