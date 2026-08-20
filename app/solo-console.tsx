"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { challengeCards, itemCards, type ChallengeCard, type ItemCard } from "./card-data";
import { roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type PlayerIntent, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type SoloPhase = "setup" | "planning" | "challenge" | "summary" | "won" | "dead";
type SoloSave = { session: NetworkSession; phase: SoloPhase; humanId: number; report: string[]; steps: number };
type MetroEdge = { id:string; source:string; target:string; type:string };

const edges = metroData.edges as readonly MetroEdge[];
const nodes = metroData.nodes as readonly {id:string;name:string;lineName:string}[];
const byId = new Map(nodes.map((node)=>[node.id,node]));
const targetId = "1::библиотека им.ленина";
const timeCycle:SessionTime[]=["Утро","День","Вечер","Ночь"];
const limbCycle=["leftArm","rightArm","leftLeg","rightLeg"];
const limbNames:Record<string,string>={leftArm:"левая рука",rightArm:"правая рука",leftLeg:"левая нога",rightLeg:"правая нога"};
const botNames=["Север","Лис","Яна","Сыч","Док","Шило","Марта","Картограф","Искра","Челнок","Старик","Тихий"];

function clean(value:string){return value.toLowerCase().replaceAll("ё","е").replace(/[^а-яa-z0-9]+/g," ").trim();}
function openNeighbors(position:string){
  return edges.flatMap((edge)=>{
    if(edge.source!==position&&edge.target!==position)return [];
    const target=edge.source===position?edge.target:edge.source;
    if(edge.type!=="transfer"){
      const direction=edge.source===position?"forward":"backward";
      if((scenarioEdgeMarks as Record<string,string>)[`${edge.id}::${direction}`]==="closed")return [];
    }
    return [{edge,target}];
  });
}
function distance(start:string,target=targetId){
  if(start===target)return 0;
  const queue:[[string,number]]=[[start,0]];const seen=new Set([start]);
  while(queue.length){const [current,depth]=queue.shift()!;for(const next of openNeighbors(current)){if(seen.has(next.target))continue;if(next.target===target)return depth+1;seen.add(next.target);queue.push([next.target,depth+1]);}}
  return 999;
}
function bestStep(position:string,seed:number){
  const options=openNeighbors(position).sort((a,b)=>distance(a.target)-distance(b.target));
  const best=options.filter(option=>distance(option.target)<=distance(options[0]?.target||position)+1);
  return best.length?best[seed%best.length].target:null;
}
function challengeFor(round:number,humanId:number){return challengeCards[(round*7+humanId*3)%challengeCards.length];}
function itemCountersChallenge(item:ItemCard|undefined,challenge:ChallengeCard){
  if(!item)return false;
  const hay=clean([item.title,...item.tags,...item.examples].join(" "));
  return challenge.counters.some(counter=>clean(counter).split(" ").some(word=>word.length>=4&&hay.includes(word.slice(0,Math.min(6,word.length)))));
}
function freshSave(humanId:number):SoloSave{
  const session=createDemoSession("SOLO26");session.playerCount=12;session.status="playing";session.gmMessage="Один из голосов принадлежит вам. Остальные идут сами.";
  session.players=session.players.map((player,index)=>({...player,name:index+1===humanId?"Вы":botNames[index],onlineAt:index+1===humanId?Date.now():null}));
  session.log=[{id:"solo-start",at:Date.now(),text:"Одиночная партия началась. Одиннадцать путников переданы ботам."}];
  return {session,phase:"planning",humanId,report:["Выберите: остаться на станции или войти в соседний тоннель."],steps:0};
}
function botIntent(player:NetworkPlayer,session:NetworkSession):{intent:Exclude<PlayerIntent,null>;target:string|null}{
  const resource=stationResources[player.position];
  if(player.position===targetId)return {intent:"stay",target:null};
  if(player.lostLimbs.length>1&&resource?.kind==="medkit")return {intent:"stay",target:null};
  if(player.bullets<3&&resource?.kind==="rice")return {intent:"stay",target:null};
  if((session.round+player.id)%6===0)return {intent:"stay",target:null};
  const target=bestStep(player.position,session.round+player.id);
  return target?{intent:"tunnel",target}:{intent:"stay",target:null};
}
function resolveTurn(save:SoloSave,success=true):SoloSave{
  const session={...save.session,players:save.session.players.map(player=>({...player,inventory:[...player.inventory],lostLimbs:[...player.lostLimbs]}))};
  const human=session.players[save.humanId-1];const report:string[]=[];
  session.players.forEach((player)=>{
    if(player.intent==="tunnel"&&player.target){
      const destination=player.target;player.position=destination;
      if(player.id===save.humanId){report.push(`Вы дошли до станции «${byId.get(destination)?.name}».`);}
      else if((session.round+player.id)%9===0){const limb=limbCycle[(session.round+player.id)%4];if(!player.lostLimbs.includes(limb))player.lostLimbs.push(limb);report.push(`${player.name} добрался до «${byId.get(destination)?.name}», но потерял: ${limbNames[limb]}.`);}
    }else if(player.intent==="stay"){
      const resource=stationResources[player.position];
      if(resource?.kind==="rice"&&session.crisisStatus!=="active")player.bullets+=1;
      if(resource?.kind==="medkit"&&!player.inventory.includes("medkit"))player.inventory.push("medkit");
      if(resource?.kind==="wire"&&!player.inventory.includes("wire"))player.inventory.push("wire");
      if(player.id===save.humanId)report.push(session.crisisStatus==="active"&&resource?.kind==="rice"?"Вы остались, но кризис остановил производство патронов.":`Вы остались на «${byId.get(player.position)?.name}» и получили ресурс станции.`);
    }
  });
  if(human.intent==="tunnel"&&!success){const limb=limbCycle[(session.round+save.humanId)%4];if(!human.lostLimbs.includes(limb))human.lostLimbs.push(limb);report.push(`Испытание не пройдено: потеряна ${limbNames[limb]}.`);}
  const botsAtPolis=session.players.filter(player=>player.id!==save.humanId&&player.position===targetId).length;
  if(botsAtPolis)report.push(`В Полисе уже ${botsAtPolis} бот${botsAtPolis===1?"":"а/ов"}. Их решения продолжают влиять на общий мир.`);
  const oldRound=session.round;session.round+=1;session.time=timeCycle[(timeCycle.indexOf(session.time)+1)%4];session.phase="planning";session.activeChallenge=null;
  if(oldRound===4&&session.crisisStatus==="inactive"){session.crisisStatus="active";report.unshift("КРИЗИС: производство патронов остановилось. На карте загорелся знак квадрата в кольце.");}
  session.players=session.players.map(player=>({...player,intent:null,target:null,ready:false,selectedItem:null}));
  const dead=human.lostLimbs.length>=4;const won=human.position===targetId;
  return {session,phase:dead?"dead":won?"won":"summary",humanId:save.humanId,report:report.slice(0,7),steps:save.steps+(human.intent==="tunnel"?1:0)};
}

export function SoloConsole(){
  const [save,setSave]=useState<SoloSave|null>(null);const [selectedRole,setSelectedRole]=useState(roleCards[0].id);const [selectedItem,setSelectedItem]=useState<string|null>(null);
  useEffect(()=>{const raw=localStorage.getItem("metro-solo-v1");if(raw){try{setSave(JSON.parse(raw) as SoloSave);}catch{/* Повреждённое локальное сохранение игнорируется. */}}},[]);
  useEffect(()=>{if(save)localStorage.setItem("metro-solo-v1",JSON.stringify(save));},[save]);
  const human=save?.session.players[save.humanId-1];const role=human?roleCards.find(entry=>entry.id===human.roleId):undefined;
  const neighbors=human?openNeighbors(human.position):[];
  const currentChallenge=save?challengeCards.find(card=>card.id===save.session.activeChallenge):undefined;
  const begin=()=>{const index=roleCards.findIndex(role=>role.id===selectedRole);setSave(freshSave(index+1));setSelectedItem(null);};
  const choose=(intent:Exclude<PlayerIntent,null>,target:string|null)=>setSave(current=>{
    if(!current||current.phase!=="planning")return current;
    const session:NetworkSession={...current.session,phase:"reveal",players:current.session.players.map(player=>({...player}))};
    session.players.forEach(player=>{const decision=player.id===current.humanId?{intent,target}:botIntent(player,session);player.intent=decision.intent;player.target=decision.target;player.ready=true;});
    if(intent==="tunnel"){
      const challenge=challengeFor(session.round,current.humanId);session.phase="challenge";session.activeChallenge=challenge.id;
      return {...current,session,phase:"challenge",report:["Боты приняли решения. Ваш тоннель открыл испытание."]};
    }
    return resolveTurn({...current,session},true);
  });
  const resolveChallenge=()=>setSave(current=>{
    if(!current||!currentChallenge)return current;
    const item=itemCards.find(card=>card.id===selectedItem);const success=itemCountersChallenge(item,currentChallenge);
    const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory]}))};
    const player=session.players[current.humanId-1];
    if(item&&success)player.inventory=player.inventory.filter(entry=>entry!==item.id);
    const result=resolveTurn({...current,session},success);
    result.report.unshift(success?`${item?.title}: решение принято системой, предмет потрачен.`:selectedItem?`${item?.title} не соответствует ориентирам испытания.`:"Вы пошли без подходящего предмета.");
    return result;
  });
  const nextRound=()=>setSave(current=>current?{...current,phase:"planning",report:["Боты снова планируют маршруты. Ваше решение принимается первым."]}:current);
  if(!save)return <main className="solo-setup"><a href="/play" className="solo-back">← Сетевая игра</a><section><p className="pixel-kicker">Одиночная экспедиция</p><h1>Один живой голос.<br/><span>Одиннадцать ботов.</span></h1><p>Вы управляете одним персонажем. Остальные роли самостоятельно выбирают маршруты, добывают ресурсы, получают ранения и идут к Полису. Ваша партия хранится только в этом браузере.</p><label>Выберите роль<select value={selectedRole} onChange={event=>setSelectedRole(event.target.value)}>{roleCards.map(role=><option value={role.id} key={role.id}>{role.name} · {role.pairName}</option>)}</select></label><button className="pixel-primary" onClick={begin}>Начать одиночную партию <span>→</span></button></section><div className="solo-role-preview"><RolePortrait index={Math.max(0,roleCards.findIndex(role=>role.id===selectedRole))}/><h2>{roleCards.find(role=>role.id===selectedRole)?.name}</h2><p>{roleCards.find(role=>role.id===selectedRole)?.history}</p><b>{roleCards.find(role=>role.id===selectedRole)?.goal}</b></div></main>;
  if(!human||!role)return null;
  return <main className="solo-shell"><header className="solo-header"><a href="/play">Голоса под Москвой</a><div><span>{save.session.time}</span><b>Раунд {String(save.session.round).padStart(2,"0")}</b><em>{save.phase==="planning"?"Ваш ход":save.phase==="challenge"?"Испытание":save.phase==="summary"?"Итоги":save.phase==="won"?"Полис":"Погиб"}</em></div><button onClick={()=>{if(confirm("Удалить одиночное сохранение?")){localStorage.removeItem("metro-solo-v1");setSave(null);}}}>Новая партия</button></header>
    <div className="solo-layout"><section className="solo-map"><MetroNetworkMap state={save.session} focusIds={[human.position]} compact={false}/></section><aside className="solo-command">
      <article className="solo-human pixel-panel"><RolePortrait index={human.id-1}/><small>Ваш персонаж · {human.bullets} ◉ · пройдено {save.steps}</small><h2>{role.name}</h2><p>{role.publicFact}</p><div><b>{byId.get(human.position)?.name}</b><span>{4-human.lostLimbs.length}/4 конечности</span></div></article>
      {save.session.crisisStatus==="active"&&<div className="solo-crisis"><b>Квадрат в кольце</b><span>Производство патронов остановлено.</span></div>}
      {save.phase==="planning"&&<section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={()=>choose("stay",null)}><b>Остаться</b><span>{stationResources[human.position]?.label||"Локальная сцена"}</span></button>{neighbors.map(({edge,target})=><button key={`${edge.id}-${target}`} onClick={()=>choose("tunnel",target)}><b>Идти → {byId.get(target)?.name}</b><span>{edge.type==="transfer"?"Переход между ветками · кордон":"Один тоннель · возможное испытание"}</span></button>)}</section>}
      {save.phase==="challenge"&&currentChallenge&&<section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div>{human.inventory.map(itemId=>{const item=itemCards.find(card=>card.id===itemId);return <button className={selectedItem===itemId?"selected":""} key={itemId} onClick={()=>setSelectedItem(itemId)}>{item?.title||itemId}</button>})}</div><button className="pixel-primary" onClick={resolveChallenge}>Разыграть {selectedItem?"выбранный предмет":"без предмета"}</button><small>В соло-режиме система сравнивает свойства предмета с ориентирами карточки. Подходящий расходник тратится.</small></section>}
      {(save.phase==="summary"||save.phase==="won"||save.phase==="dead")&&<section className={`solo-report pixel-panel ${save.phase}`}><p className="pixel-kicker">Итоги раунда</p><h2>{save.phase==="won"?"Вы дошли до Полиса":save.phase==="dead"?"Живая форма погибла":"Метро продолжает двигаться"}</h2>{save.report.map((line,index)=><p key={index}>{line}</p>)}{save.phase==="summary"&&<button className="pixel-primary" onClick={nextRound}>Следующий раунд <span>→</span></button>}{save.phase!=="summary"&&<button onClick={()=>{localStorage.removeItem("metro-solo-v1");setSave(null);}}>Выбрать другую роль</button>}</section>}
      <section className="solo-bot-feed pixel-panel"><p className="pixel-kicker">Другие путники</p>{save.session.players.filter(player=>player.id!==save.humanId).map(player=><div key={player.id}><span>{player.name} · {roleCards.find(role=>role.id===player.roleId)?.name}</span><b>{byId.get(player.position)?.name}</b><i>{player.lostLimbs.length>=4?"погиб":`${4-player.lostLimbs.length}/4`}</i></div>)}</section>
    </aside></div>
  </main>;
}
