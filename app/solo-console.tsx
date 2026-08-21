"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { challengeCards, itemCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { getCordonProfile, itemInspectionRisk, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type PlayerIntent, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type SoloPhase = "setup" | "planning" | "challenge" | "cordon" | "summary" | "won" | "dead";
type SoloSave = {
  session: NetworkSession;
  phase: SoloPhase;
  humanId: number;
  report: string[];
  steps: number;
  pendingTarget: string | null;
  pendingEdgeId: string | null;
  challengeAlternatives: string[];
  roleUses: Record<string,number>;
};
type MetroEdge = { id:string; source:string; target:string; type:string };
type TurnOutcome = { move:boolean; injury?:boolean; note?:string; rewardItem?:string; rewardBullets?:number };

const edges = metroData.edges as readonly MetroEdge[];
const nodes = metroData.nodes as readonly {id:string;name:string;lineName:string}[];
const byId = new Map(nodes.map((node)=>[node.id,node]));
const targetId = "1::библиотека им.ленина";
const soloStorageKey = "metro-solo-v3";
const timeCycle:SessionTime[]=["Утро","День","Вечер","Ночь"];
const limbCycle=["leftArm","rightArm","leftLeg","rightLeg"];
const limbNames:Record<string,string>={leftArm:"левая рука",rightArm:"правая рука",leftLeg:"левая нога",rightLeg:"правая нога"};
const botNames=["Север","Лис","Яна","Сыч","Док","Шило","Марта","Картограф","Искра","Челнок","Старик","Тихий"];
const itemNames:Record<string,string>={wire:"Моток проволоки",cloth:"Плотная тряпка",tarp:"Водостойкий тент",rope:"Верёвка с карабином",crowbar:"Лом",wrench:"Разводной ключ",chalk:"Коробка мела",flashlight:"Ручной фонарь",battery:"Рабочая батарея",mirror:"Осколок зеркала",rat_spray:"Баллон от крыс",whistle:"Свисток",radio:"Карманная рация",tube:"Герметичный тубус",filter:"Запасной фильтр",mask:"Противогаз",boots:"Резиновые сапоги",lighter:"Бензиновая зажигалка",medkit:"Аптечка",tourniquet:"Жгут",antiseptic:"Антисептик",splint:"Складная шина",painkillers:"Обезболивающее",hot_meal:"Горячая свинина",headphones:"Наушники",pass:"Поддельный пропуск"};
const expendableItems=new Set(["wire","cloth","tarp","rat_spray","battery","filter","lighter","hot_meal","antiseptic","painkillers"]);
const commonRewards=["chalk","cloth","wire","lighter","tourniquet"];

function directedStatus(session:NetworkSession,edge:MetroEdge,position:string){
  if(edge.type==="transfer")return "cordon";
  const direction=edge.source===position?"forward":"backward";
  return session.world.edges[`${edge.id}::${direction}`]||(scenarioEdgeMarks as Record<string,string>)[`${edge.id}::${direction}`]||"normal";
}
function neighbors(position:string,session:NetworkSession,includeClosed=false){
  return edges.flatMap((edge)=>{
    if(edge.source!==position&&edge.target!==position)return [];
    const target=edge.source===position?edge.target:edge.source;
    const status=directedStatus(session,edge,position);
    if(!includeClosed&&status==="closed")return [];
    return [{edge,target,status}];
  });
}
function distance(start:string,session:NetworkSession,target=targetId){
  if(start===target)return 0;
  const queue:[[string,number]]=[[start,0]];const seen=new Set([start]);
  while(queue.length){const [current,depth]=queue.shift()!;for(const next of neighbors(current,session)){if(seen.has(next.target))continue;if(next.target===target)return depth+1;seen.add(next.target);queue.push([next.target,depth+1]);}}
  return 999;
}
function bestStep(position:string,session:NetworkSession,seed:number){
  const options=neighbors(position,session).sort((a,b)=>distance(a.target,session)-distance(b.target,session));
  const best=options.filter(option=>distance(option.target,session)<=distance(options[0]?.target||position,session)+1);
  return best.length?best[seed%best.length].target:null;
}
function pickChallenge(exclude:string[]=[]){
  const pool=challengeCards.filter(card=>!exclude.includes(card.id)&&card.id!=="people-01");
  return pool[Math.floor(Math.random()*pool.length)]||challengeCards[0];
}
function freshSave(humanId:number):SoloSave{
  const session=createDemoSession("SOLO26");session.playerCount=12;session.status="playing";session.gmMessage="Один из голосов принадлежит вам. Остальные идут сами.";
  session.crisisStatus="inactive";
  session.players=session.players.map((player,index)=>({...player,bullets:player.bullets*3,name:index+1===humanId?"Вы":botNames[index],onlineAt:index+1===humanId?Date.now():null}));
  session.log=[{id:"solo-start",at:Date.now(),text:"Одиночная партия началась. Одиннадцать путников переданы ботам."}];
  return {session,phase:"planning",humanId,report:["Выберите: остаться на станции или войти в соседний тоннель."],steps:0,pendingTarget:null,pendingEdgeId:null,challengeAlternatives:[],roleUses:{}};
}
function botIntent(player:NetworkPlayer,session:NetworkSession):{intent:Exclude<PlayerIntent,null>;target:string|null}{
  const resource=stationResources[player.position];
  if(player.position===targetId)return {intent:"stay",target:null};
  if(player.lostLimbs.length>1&&resource?.kind==="medkit")return {intent:"stay",target:null};
  if(player.bullets<3&&resource?.kind==="rice")return {intent:"stay",target:null};
  if((session.round+player.id)%6===0)return {intent:"stay",target:null};
  const target=bestStep(player.position,session,session.round+player.id);
  return target?{intent:"tunnel",target}:{intent:"stay",target:null};
}
function addResource(player:NetworkPlayer,session:NetworkSession,report:string[],human:boolean){
  const resource=stationResources[player.position];
  if(resource?.kind==="rice"){
    if(session.crisisStatus==="active"){if(human)report.push("Кризис остановил производство патронов на этой станции.");}
    else{const amount=session.time==="День"?2:1;player.bullets+=amount;if(human)report.push(`Добыто патронов: +${amount}.`);}
  }else if(resource?.kind==="medkit"){player.inventory.push("medkit");if(human)report.push("В рюкзак добавлена аптечка.");}
  else if(resource?.kind==="wire"){player.inventory.push("wire");if(human)report.push("В рюкзак добавлен моток проволоки.");}
  else if(human)report.push("Вы открыли локальную сцену станции. Механической добычи здесь нет.");
}
function finishTurn(save:SoloSave,outcome:TurnOutcome):SoloSave{
  const session={...save.session,world:{...save.session.world,edges:{...save.session.world.edges}},players:save.session.players.map(player=>({...player,inventory:[...player.inventory],lostLimbs:[...player.lostLimbs]}))};
  const human=session.players[save.humanId-1];const role=roleCards.find(entry=>entry.id===human.roleId);const report:string[]=[];
  session.players.forEach((player)=>{
    if(player.intent==="tunnel"&&player.target){
      if(player.id===save.humanId){
        if(outcome.move){
          const source=player.position;const traveledEdge=edges.find(edge=>edge.id===save.pendingEdgeId);player.position=player.target;report.push(`Вы дошли до станции «${byId.get(player.position)?.name}».`);
          if(role?.id==="cartographer"&&traveledEdge&&directedStatus(session,traveledEdge,source)==="unknown"){
            session.world.edges[`${traveledEdge.id}::forward`]="normal";session.world.edges[`${traveledEdge.id}::backward`]="normal";report.push("Картограф нанёс оба направления на общую карту.");
          }
        }else report.push("Вы вернулись на исходную станцию и ничего на ней не добывали.");
      }else{
        player.position=player.target;
        if((session.round+player.id)%11===0){const limb=limbCycle[(session.round+player.id)%4];if(!player.lostLimbs.includes(limb))player.lostLimbs.push(limb);report.push(`${player.name} ранен по пути: ${limbNames[limb]}.`);}
      }
    }else if(player.intent==="stay")addResource(player,session,report,player.id===save.humanId);
  });
  if(outcome.injury){
    const protectedByMother=role?.id==="mother"&&!save.roleUses.mother_guard;
    if(protectedByMother){save={...save,roleUses:{...save.roleUses,mother_guard:1}};report.push("Способность Матери отменила потерю конечности.");}
    else{const available=limbCycle.filter(limb=>!human.lostLimbs.includes(limb));const limb=available[Math.floor(Math.random()*available.length)];if(limb){human.lostLimbs.push(limb);report.push(`Последствие: потеряна ${limbNames[limb]}.`);}}
  }
  if(outcome.rewardItem){human.inventory.push(outcome.rewardItem);report.push(`Награда: ${itemNames[outcome.rewardItem]||outcome.rewardItem}.`);}
  if(outcome.rewardBullets){human.bullets+=outcome.rewardBullets;report.push(`Награда: +${outcome.rewardBullets} патрона.`);}
  if(outcome.note)report.unshift(outcome.note);
  const botsAtPolis=session.players.filter(player=>player.id!==save.humanId&&player.position===targetId).length;
  if(botsAtPolis)report.push(`В Полисе уже ${botsAtPolis} бот${botsAtPolis===1?"":"а/ов"}.`);
  session.round+=1;session.time=timeCycle[(timeCycle.indexOf(session.time)+1)%4];session.phase="planning";session.activeChallenge=null;
  session.players=session.players.map(player=>({...player,intent:null,target:null,ready:false,selectedItem:null}));
  const dead=human.lostLimbs.length>=4;const won=human.position===targetId;
  return {...save,session,phase:dead?"dead":won?"won":"summary",report:report.slice(0,9),steps:save.steps+(outcome.move&&human.intent==="tunnel"?1:0),pendingTarget:null,pendingEdgeId:null,challengeAlternatives:[]};
}

export function SoloConsole(){
  const [save,setSave]=useState<SoloSave|null>(null);const [selectedRole,setSelectedRole]=useState(roleCards[0].id);
  useEffect(()=>{const raw=localStorage.getItem(soloStorageKey);if(raw){try{const parsed=JSON.parse(raw) as SoloSave;setSave({...parsed,session:{...parsed.session,crisisStatus:"inactive"},pendingTarget:parsed.pendingTarget||null,pendingEdgeId:parsed.pendingEdgeId||null,challengeAlternatives:parsed.challengeAlternatives||[],roleUses:parsed.roleUses||{}});}catch{/* Повреждённое локальное сохранение игнорируется. */}}},[]);
  useEffect(()=>{if(save)localStorage.setItem(soloStorageKey,JSON.stringify(save));},[save]);
  const human=save?.session.players[save.humanId-1];const role=human?roleCards.find(entry=>entry.id===human.roleId):undefined;
  const availableNeighbors=human&&save?neighbors(human.position,save.session):[];
  const allNeighbors=human&&save?neighbors(human.position,save.session,true):[];
  const currentChallenge=save?challengeCards.find(card=>card.id===save.session.activeChallenge):undefined;
  const currentEdge=save?.pendingEdgeId?edges.find(edge=>edge.id===save.pendingEdgeId):undefined;
  const currentCordon=currentEdge?getCordonProfile(currentEdge.id):undefined;
  const inventoryGroups=useMemo(()=>{const groups=new Map<string,number>();human?.inventory.forEach(item=>groups.set(item,(groups.get(item)||0)+1));return [...groups.entries()];},[human?.inventory]);
  const begin=()=>{const index=roleCards.findIndex(entry=>entry.id===selectedRole);setSave(freshSave(index+1));};
  const prepareBots=(session:NetworkSession,humanId:number,intent:Exclude<PlayerIntent,null>,target:string|null)=>{
    session.players.forEach(player=>{const decision=player.id===humanId?{intent,target}:botIntent(player,session);player.intent=decision.intent;player.target=decision.target;player.ready=true;});
  };
  const choose=(intent:Exclude<PlayerIntent,null>,target:string|null,edge?:MetroEdge,status?:string)=>setSave(current=>{
    if(!current||current.phase!=="planning")return current;
    const session:NetworkSession={...current.session,phase:"reveal",players:current.session.players.map(player=>({...player}))};prepareBots(session,current.humanId,intent,target);
    if(intent==="stay")return finishTurn({...current,session}, {move:false});
    if(!edge||!target)return current;
    const pending={...current,session,pendingTarget:target,pendingEdgeId:edge.id};
    if(edge.type==="transfer")return {...pending,phase:"cordon",report:["Переход между линиями ведёт только через кордон. Тоннельного испытания здесь нет."]};
    const quietChance=status==="safe"?.45:.10;
    if(Math.random()<quietChance)return finishTurn(pending,{move:true,note:status==="safe"?"Безопасный тоннель оказался тихим: вы прошли без испытания.":"Обычный пустой перегон: в этот раз ничего не произошло."});
    const first=pickChallenge();const alternatives=role?.id==="teen"&&(current.steps+1)%5===0?[first.id,pickChallenge([first.id]).id]:[first.id];session.phase="challenge";session.activeChallenge=alternatives[0];
    return {...pending,session,phase:"challenge",challengeAlternatives:alternatives,report:[alternatives.length>1?"Способность подростка: выберите одно из двух предчувствий.":"Автоматическая ведущая открыла событие тоннеля."]};
  });
  const resolveOption=(option:ChallengeOption)=>setSave(current=>{
    if(!current||!currentChallenge)return current;
    const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory]}))};const player=session.players[current.humanId-1];
    const itemId=option.itemIds?.find(id=>player.inventory.includes(id));
    if(option.itemIds?.length&&!itemId)return current;
    if(option.roleIds?.length&&!option.roleIds.includes(player.roleId))return current;
    if(option.bulletCost&&player.bullets<option.bulletCost)return current;
    if(option.bulletCost)player.bullets-=option.bulletCost;
    if(itemId&&option.consumeItem&&expendableItems.has(itemId)){const index=player.inventory.indexOf(itemId);player.inventory.splice(index,1);}
    const itemNote=itemId?` Использовано: ${itemNames[itemId]||itemId}${expendableItems.has(itemId)?" (потрачено)":""}.`:"";
    if(option.outcome==="retreat")return finishTurn({...current,session},{move:false,note:`${option.label}.${itemNote}`});
    if(option.outcome==="risk"){
      const succeeded=Math.random()<.62;return finishTurn({...current,session},{move:succeeded,injury:!succeeded,note:succeeded?`${option.label}: риск оправдался.`:`${option.label}: попытка сорвалась.${itemNote}`});
    }
    const rewardItem=option.rewardItem||(option.outcome==="reward"?commonRewards[(current.session.round+current.humanId)%commonRewards.length]:undefined);
    return finishTurn({...current,session},{move:true,rewardItem,rewardBullets:option.rewardBullets,note:`${option.label}: решение сработало.${itemNote}`});
  });
  const resolveCordon=(mode:"pay"|"inspect"|"smuggle"|"retreat")=>setSave(current=>{
    if(!current||!currentCordon)return current;
    const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory]}))};const player=session.players[current.humanId-1];
    if(mode==="retreat")return finishTurn({...current,session},{move:false,note:"Вы отказались от условий кордона и вернулись на исходную станцию."});
    if(mode==="smuggle"){
      if(player.roleId!=="smuggler"||current.roleUses[`smuggler-${session.round}`])return current;
      return finishTurn({...current,session,roleUses:{...current.roleUses,[`smuggler-${session.round}`]:1}},{move:true,note:"Контрабандист провёл себя через пост без платы и досмотра."});
    }
    const inspectionCost=Math.min(4,player.inventory.reduce((sum,item)=>sum+(itemInspectionRisk[item]||0),0));
    const toll=currentCordon.price+(session.time==="Вечер"?1:0);const cost=mode==="inspect"?inspectionCost:toll;
    if(player.bullets<cost)return current;player.bullets-=cost;
    return finishTurn({...current,session},{move:true,note:mode==="inspect"?`Досмотр завершён. Подозрительные вещи потребовали ${cost} ◉; обычной пошлины не было.`:`Пошлина ${cost} ◉ уплачена. Досмотра на этом посту нет.`});
  });
  const heal=(limb:string)=>setSave(current=>{
    if(!current||current.phase!=="planning")return current;const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory],lostLimbs:[...player.lostLimbs]}))};const player=session.players[current.humanId-1];const kit=player.inventory.indexOf("medkit");if(kit<0||!player.lostLimbs.includes(limb))return current;player.inventory.splice(kit,1);player.lostLimbs=player.lostLimbs.filter(entry=>entry!==limb);return {...current,session,report:[`Аптечка потрачена: восстановлена ${limbNames[limb]}. Лечение не израсходовало ход.`,...current.report]};
  });
  const reveal=(edge:MetroEdge,position:string,ability:"mag"|"trackman")=>setSave(current=>{
    if(!current)return current;const key=`${ability}-${current.session.round}`;if(current.roleUses[key])return current;const session={...current.session,world:{...current.session.world,edges:{...current.session.world.edges}}};const direction=edge.source===position?"forward":"backward";const track=`${edge.id}::${direction}`;const old=session.world.edges[track]||"normal";session.world.edges[track]=old==="closed"&&ability==="trackman"?"unknown":old==="unknown"?((current.session.round+edge.id.length)%4===0?"safe":"normal"):old;return {...current,session,roleUses:{...current.roleUses,[key]:1},report:[`${ability==="mag"?"Маг увидел":"Путеец проверил"} направление: ${session.world.edges[track]}.`,...current.report]};
  });
  const roleQuickAction=()=>setSave(current=>{
    if(!current||!role||!human)return current;const key=`${role.id}-${current.session.round}`;if(current.roleUses[key])return current;
    if(role.id==="signalman"){const bot=current.session.players.find(p=>p.id!==current.humanId&&p.lostLimbs.length<4);return {...current,roleUses:{...current.roleUses,[key]:1},report:[`Связист поймал передачу: ${bot?.name} находится на «${byId.get(bot?.position||"")?.name}» и несёт ${bot?.inventory.length||0} предмета.`,...current.report]};}
    if(role.id==="shuttle"&&current.session.time==="Ночь"){const duplicate=inventoryGroups.find(([,count])=>count>1);if(!duplicate)return current;const session={...current.session,players:current.session.players.map(p=>({...p,inventory:[...p.inventory]}))};const player=session.players[current.humanId-1];player.inventory.splice(player.inventory.indexOf(duplicate[0]),1);player.bullets+=2;return {...current,session,roleUses:{...current.roleUses,[key]:1},report:[`Челнок продал ${itemNames[duplicate[0]]||duplicate[0]} за 2 патрона. Ход не потрачен.`,...current.report]};}
    return current;
  });
  const veteranBypass=()=>setSave(current=>current&&current.phase==="challenge"&&!current.roleUses.veteran_once?finishTurn({...current,roleUses:{...current.roleUses,veteran_once:1}},{move:true,note:"Ветеран применил сигнальный патрон и провёл отряд без испытания."}):current);
  const skepticBypass=()=>setSave(current=>current&&current.phase==="challenge"&&currentChallenge?.category==="Ментальное"&&!current.roleUses[`skeptic-${Math.floor(current.session.round/2)}`]?finishTurn({...current,roleUses:{...current.roleUses,[`skeptic-${Math.floor(current.session.round/2)}`]:1}},{move:true,note:"Скептик разобрал видение на проверяемые детали и провёл группу."}):current);
  const nextRound=()=>setSave(current=>current?{...current,phase:"planning",report:["Боты снова планируют маршруты. Ваше решение принимается первым."]}:current);

  if(!save)return <main className="solo-setup"><a href="/play" className="solo-back">← Сетевая игра</a><section><p className="pixel-kicker">Одиночная экспедиция</p><h1>Один живой голос.<br/><span>Одиннадцать ботов.</span></h1><p>Это та же партия, что на компьютере игрока, но решения ведущей и остальных персонажей принимает автомат. Испытание возникает не в каждом тоннеле, а предмет всегда остаётся только одним из способов решения.</p><label>Выберите роль<select value={selectedRole} onChange={event=>setSelectedRole(event.target.value)}>{roleCards.map(entry=><option value={entry.id} key={entry.id}>{entry.name} · {entry.pairName}</option>)}</select></label><button className="pixel-primary" onClick={begin}>Начать одиночную партию <span>→</span></button></section><div className="solo-role-preview"><RolePortrait roleId={selectedRole}/><h2>{roleCards.find(entry=>entry.id===selectedRole)?.name}</h2><p>{roleCards.find(entry=>entry.id===selectedRole)?.history}</p><b>{roleCards.find(entry=>entry.id===selectedRole)?.goal}</b></div></main>;
  if(!human||!role)return null;
  const options=currentChallenge?challengeSolutions[currentChallenge.id]||[]:[];
  const inspectionCost=Math.min(4,human.inventory.reduce((sum,item)=>sum+(itemInspectionRisk[item]||0),0));
  const cordonToll=currentCordon?currentCordon.price+(save.session.time==="Вечер"?1:0):0;
  const abilityUsed=Boolean(save.roleUses[`${role.id}-${save.session.round}`]);
  return <main className="solo-shell"><header className="solo-header"><a href="/play">Голоса под Москвой</a><div><span>{save.session.time}</span><b>Раунд {String(save.session.round).padStart(2,"0")}</b><em>{save.phase==="planning"?"Ваш ход":save.phase==="challenge"?"Испытание":save.phase==="cordon"?"Кордон":save.phase==="summary"?"Итоги":save.phase==="won"?"Полис":"Погиб"}</em></div><button onClick={()=>{if(confirm("Удалить одиночное сохранение?")){localStorage.removeItem(soloStorageKey);setSave(null);}}}>Новая партия</button></header>
    <div className="solo-layout"><section className="solo-map"><MetroNetworkMap state={save.session} focusIds={[human.position]} compact={false}/></section><aside className="solo-command">
      <article className="solo-human pixel-panel"><RolePortrait roleId={human.roleId}/><small>Ваш персонаж · {human.bullets} ◉ · пройдено {save.steps}</small><h2>{role.name}</h2><p>{role.publicFact}</p><div><b>{byId.get(human.position)?.name}</b><span>{4-human.lostLimbs.length}/4 конечности</span></div></article>
      <section className="solo-ability pixel-panel"><p className="pixel-kicker">Способность роли</p><strong>{role.ability}</strong>{role.id==="mag"&&<div>{allNeighbors.filter(({edge,status})=>edge.type!=="transfer"&&status==="unknown").map(({edge,target})=><button disabled={abilityUsed||!(save.session.time==="Вечер"||save.session.time==="Ночь")} key={edge.id} onClick={()=>reveal(edge,human.position,"mag")}>Увидеть: {byId.get(target)?.name}</button>)}</div>}{role.id==="trackman"&&<div>{allNeighbors.filter(({edge,status})=>edge.type!=="transfer"&&(status==="unknown"||status==="closed")).map(({edge,target})=><button disabled={abilityUsed} key={edge.id} onClick={()=>reveal(edge,human.position,"trackman")}>Осмотреть: {byId.get(target)?.name}</button>)}</div>}{role.id==="signalman"&&<button disabled={abilityUsed} onClick={roleQuickAction}>Поймать передачу бота</button>}{role.id==="shuttle"&&<button disabled={abilityUsed||save.session.time!=="Ночь"||!inventoryGroups.some(([,count])=>count>1)} onClick={roleQuickAction}>Продать дубликат за 2 ◉</button>}<small>{abilityUsed?"Способность уже применена в этом раунде.":role.id==="mag"&&!(save.session.time==="Вечер"||save.session.time==="Ночь")?"Маг действует вечером или ночью.":"Если способность автоматическая, она сработает в подходящей сцене сама."}</small></section>
      {save.phase==="planning"&&human.lostLimbs.length>0&&<section className="solo-heal pixel-panel"><p className="pixel-kicker">Лечение без расхода хода</p><span>Аптечек: {human.inventory.filter(item=>item==="medkit").length}</span><div>{human.lostLimbs.map(limb=><button disabled={!human.inventory.includes("medkit")} key={limb} onClick={()=>heal(limb)}>Восстановить: {limbNames[limb]}</button>)}</div></section>}
      <section className="solo-inventory pixel-panel"><p className="pixel-kicker">Рюкзак</p><div>{inventoryGroups.map(([item,count])=><article key={item}><b>{itemCards.find(card=>card.id===item)?.title||itemNames[item]||item}</b><span>×{count}</span><small>{itemInspectionRisk[item]?`Подозрительность: ${itemInspectionRisk[item]}`:"Обычная вещь"}</small></article>)}</div></section>
      {save.phase==="planning"&&<section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={()=>choose("stay",null)}><b>Остаться</b><span>{stationResources[human.position]?.label||"Локальная сцена"} · ресурс добавится в рюкзак</span></button>{availableNeighbors.map(({edge,target,status})=><button key={`${edge.id}-${target}`} onClick={()=>choose("tunnel",target,edge,status)}><b>Идти → {byId.get(target)?.name}</b><span>{edge.type==="transfer"?"Переход между ветками · кордон без тоннельной карты":status==="safe"?"Безопасный тоннель · высокий шанс тихого прохода":status==="unknown"?"Непонятный тоннель · событие почти наверняка":`Открытый тоннель · 10% тихого прохода`}</span></button>)}</section>}
      {save.phase==="challenge"&&currentChallenge&&<section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2>{save.challengeAlternatives.length>1&&<div className="challenge-alternatives">{save.challengeAlternatives.map(id=><button className={save.session.activeChallenge===id?"selected":""} key={id} onClick={()=>setSave(current=>current?{...current,session:{...current.session,activeChallenge:id}}:current)}>{challengeCards.find(card=>card.id===id)?.title}</button>)}</div>}<p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div className="solo-solutions">{options.map(option=>{const item=option.itemIds?.find(id=>human.inventory.includes(id));const roleAllowed=!option.roleIds?.length||option.roleIds.includes(role.id);const affordable=!option.bulletCost||human.bullets>=option.bulletCost;const disabled=Boolean(option.itemIds?.length&&!item)||!roleAllowed||!affordable;return <button disabled={disabled} key={option.id} onClick={()=>resolveOption(option)}><b>{option.label}</b><span>{option.detail}</span>{option.itemIds?.length&&<small>{item?`Есть: ${itemNames[item]||item}`:`Нужно: ${option.itemIds.map(id=>itemNames[id]||id).join(" / ")}`}</small>}{option.bulletCost&&<small>Цена: {option.bulletCost} ◉</small>}</button>})}</div>{role.id==="veteran"&&<button disabled={Boolean(save.roleUses.veteran_once)} className="role-escape" onClick={veteranBypass}>Способность Ветерана: пройти без испытания</button>}{role.id==="skeptic"&&currentChallenge.category==="Ментальное"&&<button className="role-escape" onClick={skepticBypass}>Способность Скептика: разоблачить видение</button>}<small>Предмет — только один из вариантов. Ролевые решения и отступление не требуют карточки.</small></section>}
      {save.phase==="cordon"&&currentCordon&&<section className="solo-cordon pixel-panel"><span>{currentCordon.title}</span><h2>{currentCordon.inspection?"Досмотр":"Пошлина"}</h2><p>{currentCordon.guardText}</p>{currentCordon.inspection?<><strong>Этот пост не берёт обычную пошлину. Он проводит шмон.</strong><p>Подозрительные вещи дадут доплату {inspectionCost} ◉.</p><button disabled={human.bullets<inspectionCost} onClick={()=>resolveCordon("inspect")}>Пройти досмотр · {inspectionCost} ◉</button></>:<><strong>Этот пост берёт деньги, но не досматривает.</strong><button disabled={human.bullets<cordonToll} onClick={()=>resolveCordon("pay")}>Заплатить {cordonToll} ◉</button></>}{role.id==="smuggler"&&<button disabled={Boolean(save.roleUses[`smuggler-${save.session.round}`])} onClick={()=>resolveCordon("smuggle")}>Провести контрабандистом бесплатно</button>}<button onClick={()=>resolveCordon("retreat")}>Отказаться и вернуться</button></section>}
      {(save.phase==="summary"||save.phase==="won"||save.phase==="dead")&&<section className={`solo-report pixel-panel ${save.phase}`}><p className="pixel-kicker">Итоги раунда</p><h2>{save.phase==="won"?"Вы дошли до Полиса":save.phase==="dead"?"Живая форма погибла":"Метро продолжает двигаться"}</h2>{save.report.map((line,index)=><p key={index}>{line}</p>)}{save.phase==="summary"&&<button className="pixel-primary" onClick={nextRound}>Следующий раунд <span>→</span></button>}{save.phase!=="summary"&&<button onClick={()=>{localStorage.removeItem(soloStorageKey);setSave(null);}}>Выбрать другую роль</button>}</section>}
      <section className="solo-bot-feed pixel-panel"><p className="pixel-kicker">Другие путники</p>{save.session.players.filter(player=>player.id!==save.humanId).map(player=><div key={player.id}><span>{player.name} · {roleCards.find(entry=>entry.id===player.roleId)?.name}</span><b>{byId.get(player.position)?.name}</b><i>{player.lostLimbs.length>=4?"погиб":`${4-player.lostLimbs.length}/4`}</i></div>)}</section>
    </aside></div>
  </main>;
}
