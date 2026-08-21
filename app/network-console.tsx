"use client";

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { challengeCards, itemCards } from "./card-data";
import { getCordonProfile, roleCards } from "./game-data";
import { GameConsole } from "./game-console";
import { metroData } from "./metro-data";
import { demoCredentials, type NetworkSession, type SessionAction, type Viewer } from "./network-session";
import { scenarioEdgeMarks as rawScenarioEdgeMarks, stationResources } from "./scenario-data";
import { stationLore } from "./station-lore";
import { stationStories } from "./station-stories";

const scenarioEdgeMarks: Record<string, string> = rawScenarioEdgeMarks;

const rawNodes = metroData.nodes as readonly { id:string; name:string; lineId:string; lineName:string; color:string; lat:number; lng:number }[];
const rawEdges = metroData.edges as readonly { id:string; source:string; target:string; type:string; color:string }[];
const W=1200, H=900;
const mapNodes = rawNodes.map((node)=>({...node,x:W/2+(node.lng-37.62)*3200,y:H/2+(55.75-node.lat)*5200}));
const nodeById = new Map(mapNodes.map((node)=>[node.id,node]));
const bounds={x0:Math.min(...mapNodes.map(n=>n.x)),x1:Math.max(...mapNodes.map(n=>n.x)),y0:Math.min(...mapNodes.map(n=>n.y)),y1:Math.max(...mapNodes.map(n=>n.y))};
const fit=Math.min(W/(bounds.x1-bounds.x0+140),H/(bounds.y1-bounds.y0+140),1.15);
const fitTransform={k:fit,x:W/2-fit*(bounds.x0+bounds.x1)/2,y:H/2-fit*(bounds.y0+bounds.y1)/2};
const phaseLabels={planning:"Тайный выбор",reveal:"Раскрытие",challenge:"Испытания",resolution:"Итоги"} as const;
const itemLabels:Record<string,string>={headphones:"Наушники",tube:"Герметичный тубус",flare:"Сигнальный патрон",pass:"Поддельный пропуск",mirror:"Зеркальце"};
const limbLabels:Record<string,string>={leftArm:"Левая рука",rightArm:"Правая рука",leftLeg:"Левая нога",rightLeg:"Правая нога"};

type RoomPayload={viewer:Viewer;state:NetworkSession};

function useRoom(code:string,pin:string){
  const [payload,setPayload]=useState<RoomPayload|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const payloadRef=useRef<RoomPayload|null>(null);
  const queueRef=useRef<Promise<void>>(Promise.resolve());
  const updatePayload=useCallback((next:RoomPayload)=>{payloadRef.current=next;setPayload(next);},[]);
  const load=useCallback(async(silent=false)=>{
    try{
      const response=await fetch(`/api/room/${encodeURIComponent(code)}?pin=${encodeURIComponent(pin)}`,{cache:"no-store"});
      const data=await response.json() as RoomPayload&{error?:string};
      if(!response.ok) throw new Error(data.error||"Комната недоступна.");
      updatePayload(data); if(!silent)setError("");
    }catch(reason){if(!silent)setError(reason instanceof Error?reason.message:"Ошибка связи.");}
  },[code,pin,updatePayload]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(true),1500);return()=>window.clearInterval(timer);},[load]);
  const act=useCallback((action:SessionAction)=>{
    setBusy(true);setError("");
    queueRef.current=queueRef.current.then(async()=>{
      let base=payloadRef.current;
      if(!base){await load(true);base=payloadRef.current;}
      if(!base)throw new Error("Комната ещё не загружена.");
      for(let attempt=0;attempt<2;attempt+=1){
        const response=await fetch(`/api/room/${encodeURIComponent(code)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin,action,expectedRevision:base.state.revision})});
        const data=await response.json() as RoomPayload&{error?:string};
        if(response.status===409&&data.state){base={...base,state:data.state};updatePayload(base);continue;}
        if(!response.ok)throw new Error(data.error||"Действие не выполнено.");
        updatePayload(data);return;
      }
      throw new Error("Состояние изменилось одновременно. Действие будет безопасно повторить.");
    }).catch(reason=>setError(reason instanceof Error?reason.message:"Ошибка связи.")).finally(()=>setBusy(false));
  },[code,load,pin,updatePayload]);
  return{payload,error,busy,act,reload:load};
}

export function JoinLobby(){
  const [code,setCode]=useState("TEST26");
  const [pin,setPin]=useState("");
  const [notice,setNotice]=useState("");
  const join=()=>{
    if(!pin.trim()){setNotice("Введите PIN устройства или нажмите тестовый вход ниже.");return;}
    window.location.href=`/room?code=${encodeURIComponent(code.trim().toUpperCase()||"TEST26")}&pin=${encodeURIComponent(pin.trim())}`;
  };
  const quick=(value:string)=>{window.location.href=`/room?code=${encodeURIComponent(code.trim().toUpperCase()||"TEST26")}&pin=${value}`;};
  return <main className="network-entry">
    <section className="entry-hero">
      <div className="entry-scan" aria-hidden="true"/><p className="pixel-kicker">Сетевая сборка · прототип 0.1</p>
      <h1>Голоса<br/><span>под Москвой</span></h1>
      <p>Настольная ролевая игра, в которой карта живёт на компьютерах, а личные решения остаются в телефонах игроков.</p>
      <div className="entry-status"><i/><span>Тестовая комната подготовлена</span><b>2 пары · 4 телефона</b></div>
    </section>
    <section className="join-panel pixel-panel">
      <div><p className="pixel-kicker">Подключение к партии</p><h2>Введите код и PIN</h2><p>Регистрация и почта не нужны. PIN определяет, какой экран откроется на устройстве.</p></div>
      <label>Код комнаты<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={10}/></label>
      <label>PIN устройства<input value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} onKeyDown={e=>{if(e.key==="Enter")join();}} inputMode="numeric" maxLength={4} placeholder="••••"/></label>
      <button className="pixel-primary" onClick={join}>Войти в комнату <span>→</span></button>
      {notice&&<p className="entry-error">{notice}</p>}
      <div className="test-logins"><span>Быстрый вход для домашнего теста</span><div><button onClick={()=>quick(demoCredentials.gm.pin)}>Ведущая</button><button onClick={()=>quick(demoCredentials.squads[0].pin)}>Отряд 1</button><button onClick={()=>quick(demoCredentials.players[0].pin)}>Игрок 1</button><button onClick={()=>quick(demoCredentials.common.pin)}>Общий экран</button></div></div>
      <a className="solo-entry-link" href="/solo"><b>Одиночная партия</b><span>Один игрок · одиннадцать автономных путников →</span></a>
      <a className="legacy-link" href="/room?code=TEST26&pin=2600">Открыть полный пульт ведущей</a>
    </section>
  </main>;
}

export function RoomConsole({defaultCode="TEST26",defaultPin=""}:{defaultCode?:string;defaultPin?:string}={}){
  const [credentials,setCredentials]=useState<{code:string;pin:string}|null>(null);
  useEffect(()=>{const q=new URLSearchParams(window.location.search);setCredentials({code:(q.get("code")||defaultCode).toUpperCase(),pin:q.get("pin")||defaultPin});},[defaultCode,defaultPin]);
  if(!credentials)return <LoadingScreen text="Считываем билет устройства…"/>;
  return <ConnectedRoom code={credentials.code} pin={credentials.pin}/>;
}

function ConnectedRoom({code,pin}:{code:string;pin:string}){
  const room=useRoom(code,pin);
  if(!room.payload&&!room.error)return <LoadingScreen text="Соединяемся с комнатой…"/>;
  if(!room.payload)return <main className="network-error"><div className="pixel-panel"><p className="pixel-kicker">Доступ закрыт</p><h1>{room.error}</h1><a href="/play">Вернуться ко входу</a></div></main>;
  const {viewer,state}=room.payload;
  if(viewer.kind==="gm")return <GameConsole network={{code,state,busy:room.busy,act:room.act}} networkControls={<GmNetworkPanel state={state} busy={room.busy} act={room.act}/>}/>;
  return <main className={`network-shell view-${viewer.kind}`}>
    <NetworkHeader state={state} viewer={viewer} code={code} error={room.error}/>
    {viewer.kind==="squad"&&<SquadPanel state={state} pair={viewer.pair}/>} 
    {viewer.kind==="player"&&<PlayerPhone state={state} playerId={viewer.playerId} busy={room.busy} act={room.act}/>} 
    {viewer.kind==="common"&&<CommonPanel state={state}/>} 
  </main>;
}

function LoadingScreen({text}:{text:string}){return <main className="network-loading"><div><span/><span/><span/></div><p>{text}</p></main>;}

function NetworkHeader({state,viewer,code,error}:{state:NetworkSession;viewer:Viewer;code:string;error:string}){
  return <header className="network-topbar"><a href="/play" className="network-brand"><i>Г</i><span><small>Москва · 2030</small><b>Голоса под Москвой</b></span></a><div className="network-clock"><span>{state.time}</span><b>Раунд {String(state.round).padStart(2,"0")}</b><em>{phaseLabels[state.phase]}</em></div><div className="network-device"><span className={error?"net-dot lost":"net-dot"}/><div><small>{viewer.label}</small><b>Комната {code}</b></div></div></header>;
}

function GmNetworkPanel({state,busy,act}:{state:NetworkSession;busy:boolean;act:(action:SessionAction)=>void}){
  const active=state.players.slice(0,state.playerCount);
  const [message,setMessage]=useState(state.gmMessage);
  useEffect(()=>setMessage(state.gmMessage),[state.gmMessage]);
  return <div className="gm-network-layout">
    <aside className="gm-command pixel-panel"><p className="pixel-kicker">Контроль партии</p><h2>{phaseLabels[state.phase]}</h2><p className="gm-phase-copy">{state.phase==="planning"?"Игроки принимают личные решения. Пока ведущая не откроет их, пары могут только договариваться.":state.phase==="reveal"?"Решения открыты. Несовпадение внутри пары создаёт разделение или сцену предательства.":state.phase==="challenge"?"Выберите карточку испытания и проведите ручное решение.":"Зафиксируйте потери, перемещение и награды перед новым раундом."}</p>
      {state.phase==="challenge"?<button disabled={busy} className="pixel-primary" onClick={()=>act({type:"gm-resolve-pair",pair:state.activePair})}>Завершить ход отряда {state.activePair}<span>✓</span></button>:<button disabled={busy||state.phase==="planning"} className="pixel-primary" onClick={()=>act({type:"gm-next-phase"})}>{state.phase==="planning"?"Ждём все решения":state.phase==="resolution"?"Начать новый раунд":"Перейти к испытаниям"}<span>→</span></button>}
      <div className="gm-switch"><button className={state.playerCount===4?"active":""} onClick={()=>act({type:"gm-set-player-count",count:4})}>Тест · 2 пары</button><button className={state.playerCount===12?"active":""} onClick={()=>act({type:"gm-set-player-count",count:12})}>Полная · 6 пар</button></div>
      <label>Сообщение всем<textarea value={message} onChange={e=>setMessage(e.target.value)}/></label><button onClick={()=>act({type:"gm-set-message",message})}>Передать на экраны</button>
      <label>Активное испытание<select value={state.activeChallenge||""} onChange={e=>act({type:"gm-set-challenge",challengeId:e.target.value||null})}><option value="">Нет испытания</option>{challengeCards.map(card=><option key={card.id} value={card.id}>{card.title} · {card.category}</option>)}</select></label>
      <div className={`gm-crisis-control ${state.crisisStatus}`}><span>Общий кризис</span><b>{state.crisisStatus==="inactive"?"ожидает":state.crisisStatus==="active"?"Квадрат в кольце · активен":"разрешён"}</b><p>{state.crisisStatus==="active"?"Патроны не производятся. Чёрное Нечто движется вдвое быстрее.":"Ведущая запускает кризис после первого полного цикла суток."}</p><div><button disabled={busy||state.crisisStatus==="active"} onClick={()=>act({type:"gm-set-crisis",status:"active"})}>Запустить</button><button disabled={busy||state.crisisStatus!=="active"} onClick={()=>act({type:"gm-set-crisis",status:"resolved"})}>Разрешить</button></div></div>
      <button className="danger-quiet" onClick={()=>{if(window.confirm("Сбросить тестовую комнату и все решения?"))act({type:"gm-reset"});}}>Сбросить тестовую комнату</button>
    </aside>
    <section className="gm-live">
      <div className="network-message"><span>Передача ведущей</span><p>{state.gmMessage}</p></div>
      <div className="gm-pair-tabs">{Array.from({length:state.playerCount/2},(_,i)=>i+1).map(pair=><button key={pair} className={`${state.activePair===pair?"active":""} ${state.resolvedPairs.includes(pair)?"resolved":""}`} onClick={()=>act({type:"gm-set-active-pair",pair})}><span>Отряд {pair}</span><b>{state.resolvedPairs.includes(pair)?"ход завершён":`${active.filter(p=>p.pair===pair&&p.ready).length}/2 решения`}</b></button>)}</div>
      <div className="gm-player-grid">{active.map((player,index)=><GmPlayerCard key={player.id} player={player} index={index} phase={state.phase} act={act}/>)}</div>
    </section>
    <aside className="gm-event-feed pixel-panel"><p className="pixel-kicker">Живая лента</p><div className="device-meter"><span>Устройства игроков</span><b>{active.filter(p=>p.onlineAt&&Date.now()-p.onlineAt<15000).length}<small>/{active.length}</small></b></div><div className="event-list">{state.log.slice(0,16).map(entry=><article key={entry.id}><time>{new Date(entry.at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}</time><p>{entry.text}</p></article>)}</div></aside>
  </div>;
}

function GmPlayerCard({player,index,phase,act}:{player:NetworkSession["players"][number];index:number;phase:NetworkSession["phase"];act:(a:SessionAction)=>void}){
  const role=roleCards.find(entry=>entry.id===player.roleId)!;const station=nodeById.get(player.position);
  return <article className={`gm-player-card ${player.lostLimbs.length>=4?"dead":""}`}><RolePortrait roleId={player.roleId}/><div className="gm-player-main"><div><small>Пара {player.pair} · {player.ready?"решение принято":"ожидает"}</small><h3>{player.name}</h3><p>{role.name} · {station?.name}</p></div><div className={`intent-stamp ${player.intent||"empty"}`}><span>{phase==="planning"?"Скрыто":player.intent==="stay"?"Остаётся":player.intent==="tunnel"?"Идёт в тоннель":"Нет решения"}</span>{phase!=="planning"&&player.target&&<small>→ {nodeById.get(player.target)?.name}</small>}</div><div className="gm-card-controls"><button onClick={()=>act({type:"gm-adjust-bullets",playerId:player.id,delta:-1})}>−</button><b>{player.bullets} ◉</b><button onClick={()=>act({type:"gm-adjust-bullets",playerId:player.id,delta:1})}>+</button>{Object.entries(limbLabels).map(([id,label])=><button title={label} className={player.lostLimbs.includes(id)?"limb-dot lost":"limb-dot"} key={id} onClick={()=>act({type:"gm-limb",playerId:player.id,limb:id})}>{id.includes("Arm")?"Р":"Н"}</button>)}</div></div></article>;
}

function SquadPanel({state,pair}:{state:NetworkSession;pair:number}){
  const players=state.players.filter(player=>player.pair===pair);
  const current=players[0]?.position;
  const [screen,setScreen]=useState<"map"|"players"|"table">("map");
  return <div className="squad-layout">
    <section className="squad-map-panel"><div className="squad-title"><div><p className="pixel-kicker">Штаб отряда {pair}</p><h1>{players.map(p=>roleCards.find(r=>r.id===p.roleId)?.name).join(" + ")}</h1></div><div className="squad-ready"><span>Личные решения</span><b>{players.filter(p=>p.ready).length}/2</b></div></div>
      <nav className="squad-screen-tabs"><button className={screen==="map"?"active":""} onClick={()=>setScreen("map")}>Карта</button><button className={screen==="players"?"active":""} onClick={()=>setScreen("players")}>Люди</button><button className={screen==="table"?"active":""} onClick={()=>setScreen("table")}>Карточный стол</button></nav>
      {screen==="map"&&<MetroNetworkMap state={state} focusIds={players.map(p=>p.position)} compact={false}/>} 
      {screen==="players"&&<PublicPlayers state={state}/>} 
      {screen==="table"&&<SquadCardTable state={state} players={players}/>} 
    </section>
    <aside className="squad-side"><div className="network-message"><span>Передача ведущей</span><p>{state.gmMessage}</p></div>{players.map((player)=><article className="squad-player pixel-panel" key={player.id}><RolePortrait roleId={player.roleId}/><small>Игрок {player.id} · {player.bullets} патронов</small><h2>{player.name}</h2><p>{roleCards.find(r=>r.id===player.roleId)?.publicFact}</p><div className={`squad-intent ${player.intent||"empty"}`}><span>{state.phase==="planning"?player.ready?"Решение зафиксировано":"Ожидает решения":player.intent==="stay"?"Остаётся на станции":player.intent==="tunnel"?`Идёт: ${nodeById.get(player.target||"")?.name||"направление скрыто"}`:"Решения нет"}</span></div></article>)}<StationBrief nodeId={current}/></aside>
  </div>;
}

function PublicPlayers({state}:{state:NetworkSession}){
  return <section className="public-roster"><div><p className="pixel-kicker">Публичные сведения</p><h2>Кто ещё жив</h2><p>Инвентарь, цель и секрет здесь не показываются.</p></div><div>{state.players.slice(0,state.playerCount).map((player)=><article key={player.id} className={player.lostLimbs.length>=4?"dead":""}><RolePortrait roleId={player.roleId}/><small>Пара {player.pair}</small><h3>{player.name}</h3><b>{roleCards.find(r=>r.id===player.roleId)?.name}</b><p>{nodeById.get(player.position)?.name}</p><i>{player.lostLimbs.length>=4?"Мёртв":`${4-player.lostLimbs.length}/4 конечности`}</i></article>)}</div></section>;
}

function SquadCardTable({state,players}:{state:NetworkSession;players:NetworkSession["players"]}){
  const challenge=challengeCards.find(card=>card.id===state.activeChallenge);
  return <section className="squad-card-table"><div className={`challenge-card-visual category-${challenge?.category||"empty"}`}><span>{challenge?.category||"Тоннель молчит"}</span><h2>{challenge?.title||"Испытание ещё не открыто"}</h2><p>{challenge?.scene||"Когда ведущая откроет карточку тоннеля, она появится здесь только у активной группы."}</p>{challenge&&<><strong>{challenge.question}</strong><small>Возможное последствие: {challenge.consequence}</small></>}</div><div className="played-cards"><p className="pixel-kicker">Ответ отряда</p><h3>Положите личные карты на стол</h3>{players.map(player=>{const item=itemCards.find(card=>card.id===player.selectedItem);return <article key={player.id} className={item?"placed":"empty"}><span>{player.name}</span><b>{item?.title||"Карта ещё не выбрана"}</b><p>{item?.description||"Игрок выбирает предмет на своём телефоне. Затем вслух объясняет, как применяет его в сцене."}</p></article>})}<div className="gm-ruling-note">Ведущая видит предложенные карты и принимает одно решение: <b>одобрено</b>, <b>одобрено с ценой</b> или <b>последствие</b>.</div></div></section>;
}

function PlayerPhone({state,playerId,busy,act}:{state:NetworkSession;playerId:number;busy:boolean;act:(a:SessionAction)=>void}){
  const player=state.players.find(entry=>entry.id===playerId)!;const role=roleCards.find(entry=>entry.id===player.roleId)!;
  const neighbors=useMemo(()=>rawEdges.filter(edge=>edge.source===player.position||edge.target===player.position).map(edge=>({edge,node:nodeById.get(edge.source===player.position?edge.target:edge.source)!})).filter(entry=>entry.node),[player.position]);
  useEffect(()=>{void act({type:"heartbeat",playerId});},[]);// eslint-disable-line react-hooks/exhaustive-deps
  const [showRole,setShowRole]=useState(false);
  return <div className="phone-screen">
    <section className="phone-identity"><RolePortrait roleId={player.roleId}/><div><p className="pixel-kicker">Личная карта · игрок {player.id}</p><input value={player.name} onChange={()=>{}} readOnly/><b>{role.name}</b></div><button onClick={()=>setShowRole(v=>!v)}>{showRole?"Скрыть":"Роль"}</button></section>
    {showRole&&<section className="phone-secret pixel-panel"><span>Только на этом экране</span><h2>{role.name}</h2><p>{role.history}</p><dl><div><dt>Способность</dt><dd>{role.ability}</dd></div><div><dt>Личная цель</dt><dd>{role.goal}</dd></div></dl></section>}
    <section className="phone-location"><span>Сейчас</span><h1>{nodeById.get(player.position)?.name}</h1><p>{nodeById.get(player.position)?.lineName}</p><div><b>{player.bullets} ◉</b><i>{4-player.lostLimbs.length}/4 конечности</i></div></section>
    <section className="phone-decision pixel-panel"><div><p className="pixel-kicker">Раунд {state.round} · {phaseLabels[state.phase]}</p><h2>{state.phase==="planning"?"Что вы сделаете?":"Решение принято"}</h2></div>{state.phase==="planning"?<><button disabled={busy} className={player.intent==="stay"?"decision-card selected":"decision-card"} onClick={()=>act({type:"set-intent",playerId,intent:"stay"})}><span>Остаться</span><b>Добывать ресурс, лечиться или вести сцену на станции.</b></button><div className="neighbor-choices">{neighbors.map(({edge,node})=>{const cordon=edge.type==="transfer"?getCordonProfile(edge.id):null;return <button disabled={busy} className={player.intent==="tunnel"&&player.target===node.id?"decision-card selected":"decision-card"} key={`${edge.id}-${node.id}`} onClick={()=>act({type:"set-intent",playerId,intent:"tunnel",target:node.id})}><span>Идти → {node.name}</span><b>{cordon?`Кордон · объявленная цена ${cordon.price} ◉`:scenarioEdgeMarks[`${edge.id}::forward`]==="closed"?"Путь отмечен закрытым":"Статус тоннеля известен отряду"}</b></button>})}</div></>:<div className={`phone-locked ${player.intent||"empty"}`}><strong>{player.intent==="stay"?"Вы остаетесь":player.intent==="tunnel"?`Вы идёте к станции «${nodeById.get(player.target||"")?.name}»`:"Решение не было принято"}</strong><p>Ведущая последовательно откроет решения. На фазе итогов движение и последствия появятся на общей карте.</p></div>}</section>
    <section className="phone-inventory"><div><p className="pixel-kicker">Личный инвентарь</p><span>Нажмите карту, чтобы предъявить её ведущей</span></div><div>{player.inventory.map(itemId=>{const item=itemCards.find(entry=>entry.id===itemId);return <button key={itemId} className={player.selectedItem===itemId?"inventory-card selected":"inventory-card"} onClick={()=>act({type:"toggle-item",playerId,itemId})}><small>{item?.category||"Личная вещь"}</small><b>{item?.title||itemLabels[itemId]||itemId}</b><p>{item?.description||"Предмет роли. Его применение определяется отыгрышем и решением ведущей."}</p></button>})}</div></section>
  </div>;
}

function CommonPanel({state}:{state:NetworkSession}){return <div className="common-layout"><div className="common-head"><p className="pixel-kicker">Общий терминал · без личных данных</p><h1>Карта живых</h1><p>{state.gmMessage}</p></div><MetroNetworkMap state={state} focusIds={state.players.slice(0,state.playerCount).filter(p=>p.lostLimbs.length<4).map(p=>p.position)} compact={false}/><aside className="common-log pixel-panel"><span>Последние публичные события</span>{state.log.slice(0,8).map(entry=><p key={entry.id}>{entry.text}</p>)}</aside></div>}

const rolePortraitIndex:Record<string,number>={mag:24,skeptic:12,mother:19,teen:20,scientist:7,medic:3,trackman:0,cartographer:6,signalman:1,shuttle:4,veteran:11,smuggler:2};
export function RolePortrait({index=0,roleId}:{index?:number;roleId?:string}){const portrait=roleId?rolePortraitIndex[roleId]??index:index;return <div className="role-portrait" style={{backgroundImage:"url('./npc-atlas-v1.png?v=2')",backgroundPosition:`${(portrait%5)*25}% ${Math.floor(portrait/5)*25}%`}} aria-hidden="true"/>;}

function StationBrief({nodeId}:{nodeId?:string}){if(!nodeId)return null;const node=nodeById.get(nodeId);const resource=stationResources[nodeId];const lore=stationLore[nodeId];const story=stationStories[nodeId];return <article className="station-brief pixel-panel"><span>Текущая станция</span><h3>{node?.name}</h3><b>{resource?.icon} {resource?.label}</b><p>{story?.fact||lore?.after2026||"Сведения о станции пока не подтверждены."}</p></article>}

function networkTrackGeometry(edge:(typeof rawEdges)[number],direction:"forward"|"backward"){
  const a=nodeById.get(edge.source),b=nodeById.get(edge.target);
  if(!a||!b)return null;
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.max(1,Math.hypot(dx,dy));
  const side=direction==="forward"?1:-1;
  const ox=(-dy/length)*2.6*side,oy=(dx/length)*2.6*side;
  return{x1:a.x+ox,y1:a.y+oy,x2:b.x+ox,y2:b.y+oy};
}

function networkTrackStyle(status:"normal"|"safe"|"unknown"|"closed",color:string){
  if(status==="safe")return{stroke:"#3bd294",strokeWidth:5.5,opacity:.95};
  if(status==="unknown")return{stroke:"#8b815f",strokeWidth:5.5,strokeDasharray:"3 7",opacity:.95};
  if(status==="closed")return{stroke:"#171b18",strokeWidth:8,strokeDasharray:"12 4",opacity:1};
  return{stroke:color,strokeWidth:3.5,opacity:.58};
}

export function MetroNetworkMap({state,focusIds,compact}:{state:NetworkSession;focusIds:string[];compact:boolean}){
  const [zoom,setZoom]=useState(1);const [query,setQuery]=useState("");const [selected,setSelected]=useState<string|null>(focusIds[0]||null);
  const center=selected?nodeById.get(selected):undefined;
  const k=fitTransform.k*zoom;const tx=center&&zoom>1?W/2-center.x*k:fitTransform.x*zoom+(W/2)*(1-zoom);const ty=center&&zoom>1?H/2-center.y*k:fitTransform.y*zoom+(H/2)*(1-zoom);
  const search=()=>{const q=query.trim().toLowerCase().replaceAll("ё","е");const found=mapNodes.find(n=>n.name.toLowerCase().replaceAll("ё","е").includes(q));if(found){setSelected(found.id);setZoom(3.2);}};
  const playerGroups=new Map<string,number>();state.players.slice(0,state.playerCount).filter(p=>p.lostLimbs.length<4).forEach(p=>playerGroups.set(p.position,(playerGroups.get(p.position)||0)+1));
  const npcGroups=new Map<string,number>();Object.entries(state.world.npcPositions).forEach(([npcId,stationId])=>{if(state.world.npcOwners[npcId]==null&&!state.world.swallowedStations.includes(stationId))npcGroups.set(stationId,(npcGroups.get(stationId)||0)+1);});
  return <div className={compact?"network-map compact":"network-map"}><div className="map-search"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")search();}} placeholder="Найти станцию"/><button onClick={search}>Найти</button></div><div className="network-map-zoom"><button onClick={()=>setZoom(v=>Math.min(5,v*1.35))}>+</button><button onClick={()=>setZoom(v=>Math.max(.75,v/1.35))}>−</button><button onClick={()=>{setZoom(1);setSelected(null);}}>Вся</button></div><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Полная карта метро, два тоннеля между станциями и позиции групп"><g transform={`translate(${tx} ${ty}) scale(${k})`}>{rawEdges.flatMap(edge=>{const a=nodeById.get(edge.source),b=nodeById.get(edge.target);if(!a||!b)return[];if(edge.type==="transfer")return[<line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ae8b47" strokeWidth={2.5} strokeDasharray="3 3" opacity={.8}/>];return(["forward","backward"] as const).map(direction=>{const geometry=networkTrackGeometry(edge,direction);const status=state.world.edges[`${edge.id}::${direction}`]||"normal";return geometry?<line key={`${edge.id}-${direction}`} {...geometry} {...networkTrackStyle(status,edge.color)} className={`network-track ${status}`}/>:null;});})}{mapNodes.map(node=>{const count=playerGroups.get(node.id)||0;const npcCount=npcGroups.get(node.id)||0;const focus=focusIds.includes(node.id);const swallowed=state.world.swallowedStations.includes(node.id);return <g key={node.id} className={`${selected===node.id?"net-station selected":"net-station"}${swallowed?" swallowed":""}`} onClick={()=>setSelected(node.id)}><circle cx={node.x} cy={node.y} r={focus?5:2.5} fill={swallowed?"#160f1b":focus?"#d7ef53":node.color} stroke={swallowed?"#9a6ab0":"#101612"} strokeWidth={swallowed?3:1}/>{count>0&&<><circle className="net-player-badge" cx={node.x+8} cy={node.y-8} r={7}/><text className="net-player-count" x={node.x+8} y={node.y-8}>{count}</text></>}{npcCount>0&&<><circle className="net-npc-badge" cx={node.x-8} cy={node.y-8} r={6}/><text className="net-npc-count" x={node.x-8} y={node.y-8}>{npcCount}</text></>}{(focus||selected===node.id)&&<text x={node.x+8} y={node.y+4} className="net-station-name">{node.name}</text>}</g>;})}</g></svg>{selected&&<div className="map-fact"><span>{nodeById.get(selected)?.lineName}</span><b>{nodeById.get(selected)?.name}</b><p>{state.world.swallowedStations.includes(selected)?"Чёрное нечто поглотило станцию":`${stationResources[selected]?.icon||""} ${stationResources[selected]?.label||"Станция"}`}</p><small>{npcGroups.get(selected)||0} NPC · {playerGroups.get(selected)||0} живых фигур</small></div>}</div>;
}
