import { env } from "cloudflare:workers";
import { applySessionAction, createDemoSession, projectSession, resolveViewer, type NetworkSession, type SessionAction } from "../../../network-session";
import { metroData } from "../../../metro-data";
import { getCordonProfile } from "../../../game-data";
import { scenarioEdgeMarks, stationResources } from "../../../scenario-data";

type RouteContext = { params: Promise<{ code: string }> };

async function ensureTable() {
  if (!env.DB) throw new Error("Серверное хранилище комнаты недоступно.");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS game_rooms (
    code TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function readOrCreate(code: string): Promise<NetworkSession> {
  await ensureTable();
  const row = await env.DB.prepare("SELECT state_json FROM game_rooms WHERE code = ?").bind(code).first<{ state_json: string }>();
  if (row?.state_json) return JSON.parse(row.state_json) as NetworkSession;
  const state = createDemoSession(code);
  await env.DB.prepare("INSERT OR IGNORE INTO game_rooms (code, state_json, revision) VALUES (?, ?, ?)")
    .bind(code, JSON.stringify(state), state.revision).run();
  const inserted = await env.DB.prepare("SELECT state_json FROM game_rooms WHERE code = ?").bind(code).first<{ state_json: string }>();
  return inserted?.state_json ? JSON.parse(inserted.state_json) as NetworkSession : state;
}

function cleanCode(value: string) {
  return value.toUpperCase().replace(/[^A-ZА-Я0-9]/g, "").slice(0, 10) || "TEST26";
}

function resolveMovement(state: NetworkSession) {
  const edges = metroData.edges as readonly { id:string; source:string; target:string; type:string }[];
  const active = state.players.slice(0, state.playerCount);
  const groups = new Map<string, typeof active>();
  active.forEach((player) => {
    if (player.intent !== "tunnel" || !player.target) return;
    const key = `${player.pair}::${player.position}::${player.target}`;
    groups.set(key, [...(groups.get(key) || []), player]);
  });
  const notes:string[]=[];
  groups.forEach((travelers) => {
    const source = travelers[0].position;
    const target = travelers[0].target!;
    const edge = edges.find((entry) => (entry.source === source && entry.target === target) || (entry.source === target && entry.target === source));
    if (!edge) { notes.push(`${travelers.map(p=>p.name).join(" и ")}: переход не найден.`); return; }
    if (edge.type !== "transfer") {
      const direction = edge.source === source ? "forward" : "backward";
      if ((scenarioEdgeMarks as Record<string, string>)[`${edge.id}::${direction}`] === "closed") { notes.push(`${travelers.map(p=>p.name).join(" и ")}: тоннель закрыт, группа осталась на месте.`); return; }
    }
    let toll = edge.type === "transfer" ? getCordonProfile(edge.id).price + (state.time === "Вечер" ? 1 : 0) : 0;
    if (toll) {
      const available = travelers.reduce((sum, player) => sum + player.bullets, 0);
      if (available < toll) { notes.push(`${travelers.map(p=>p.name).join(" и ")}: не хватило патронов на кордон (${toll} ◉).`); return; }
      travelers.forEach((traveler) => {
        const payment = Math.min(traveler.bullets, toll);
        traveler.bullets -= payment;
        toll -= payment;
      });
    }
    travelers.forEach((traveler) => { traveler.position = target; });
    notes.push(`${travelers.map(p=>p.name).join(" и ")} перешли на станцию ${String((metroData.nodes as readonly {id:string;name:string}[]).find(n=>n.id===target)?.name)}${edge.type === "transfer" ? " через кордон" : ""}.`);
  });
  active.filter((player)=>player.intent==="stay").forEach((player)=>{
    const resource=stationResources[player.position];
    if(resource?.kind==="rice"){player.bullets+=1;notes.push(`${player.name} остался на станции и добыл 1 патрон.`);}
    else if(resource?.kind==="medkit"){player.inventory.push("medkit");notes.push(`${player.name} получил аптечку.`);}
    else if(resource?.kind==="wire"){player.inventory.push("wire");notes.push(`${player.name} получил проволоку.`);}
    else notes.push(`${player.name} остался на станции и открыл локальную сцену.`);
  });
  const now=Date.now();
  notes.reverse().forEach((text,index)=>state.log.unshift({id:`${now}-${index}-resolution`,at:now,text}));
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code: rawCode } = await context.params;
    const code = cleanCode(rawCode);
    const pin = new URL(request.url).searchParams.get("pin") || "";
    const viewer = resolveViewer(pin);
    if (!viewer) return Response.json({ error: "Неверный PIN устройства." }, { status: 401 });
    const state = await readOrCreate(code);
    return Response.json({ viewer, state: projectSession(state, viewer) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось открыть комнату." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code: rawCode } = await context.params;
    const code = cleanCode(rawCode);
    const body = await request.json() as { pin?: string; action?: SessionAction; expectedRevision?: number };
    const viewer = resolveViewer(body.pin || "");
    if (!viewer) return Response.json({ error: "Неверный PIN устройства." }, { status: 401 });
    if (!body.action) return Response.json({ error: "Действие не передано." }, { status: 400 });
    const current = await readOrCreate(code);
    if (body.expectedRevision && body.expectedRevision !== current.revision) {
      return Response.json({ error: "Состояние уже изменилось на другом устройстве.", state: projectSession(current, viewer) }, { status: 409 });
    }
    const changed = applySessionAction(current, body.action, viewer);
    if (body.action.type === "gm-next-phase" && current.phase === "challenge" && changed.phase === "resolution") resolveMovement(changed);
    changed.revision = current.revision + 1;
    const result = await env.DB.prepare("UPDATE game_rooms SET state_json = ?, revision = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ? AND revision = ?")
      .bind(JSON.stringify(changed), changed.revision, code, current.revision).run();
    if (!result.meta.changes) return Response.json({ error: "Одновременное действие. Повторите выбор." }, { status: 409 });
    return Response.json({ viewer, state: projectSession(changed, viewer) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Действие не выполнено." }, { status: 400 });
  }
}
