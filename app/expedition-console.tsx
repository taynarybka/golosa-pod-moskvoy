"use client";

import { useMemo, useState } from "react";
import { activeCaravansForRound } from "./caravan-data";
import { challengeCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { getCordonProfile, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type MetroEdge={id:string;source:string;target:string;type:string;color:string};
type SetupPlayer={name:string;roleId:string;start:string};
type ExpeditionPhase="planning"|"challenge"|"summary";
type ExpeditionSave={session:NetworkSession;humanIds:number[];activeHuman:number;phase:ExpeditionPhase;pendingTarget:string|null;pendingEdge:string|null;report:string[];traversals:{source:string;target:string;playerId:number}[]};
type Outcome={move:boolean;injury?:boolean;note:string;reward?:string};

const edges=metroData.edges as readonly MetroEdge[];
const nodes=metroData.nodes as readonly {id:string;name:string;lineName:string;color:string}[];
const nodeById=new Map(nodes.map(node=>[node.id,node]));
const polisIds=new Set(["1::библиотека им.ленина","3::арбатская","4::александровский сад","9::боровицкая"]);
const starts=["10::окружная","2::водный стадион","6::калужская","7::спартак","8A::мичуринский проспект","11::печатники"];
const botNames=["Север","Лис","Яна","Сыч","Док","Шило","Марта","Картограф","Искра","Челнок","Старик","Тихий"];
const limbCycle=["leftArm","rightArm","leftLeg","rightLeg"];
const timeCycle:SessionTime[]=["Утро","День","Вечер","Ночь"];
const rewards=["chalk","cloth","wire","lighter","tourniquet"];
const itemNames:Record<string,string>={chalk:"Мел",cloth:"Плотная ткань",wire:"Моток проволоки",lighter:"Зажигалка",tourniquet:"Жгут",medkit:"Аптечка"};

function edgeStatus(session:NetworkSession,edge:MetroEdge,position:string){if(edge.type==="transfer")return "cordon";const direction=edge.source===position?"forward":"backward";return session.world.edges[`${edge.id}::${direction}`]||(scenarioEdgeMarks as Record<string,string>)[`${edge.id}::${direction}`]||"normal";}
function passages(position:string,session:NetworkSession){
  const ordinary=edges.flatMap(edge=>{if(edge.source!==position&&edge.target!==position)return[];const target=edge.source===position?edge.target:edge.source;const status=edgeStatus(session,edge,position);return status==="closed"?[]:[{edge,target,status}];});
  const caravan=activeCaravansForRound(session.round).flatMap(entry=>{if(entry.resting||entry.stationId!==position)return[];const edge=edges.find(item=>(item.source===entry.stationId&&item.target===entry.nextStationId)||(item.target===entry.stationId&&item.source===entry.nextStationId));return edge?[{edge,target:entry.nextStationId,status:"caravan"}]:[];});
  return [...ordinary,...caravan].filter((entry,index,array)=>array.findIndex(other=>other.edge.id===entry.edge.id&&other.target===entry.target)===index);
}
function distance(start:string,session:NetworkSession){if(polisIds.has(start))return 0;const queue:[[string,number]]=[[start,0]],seen=new Set([start]);while(queue.length){const [current,d]=queue.shift()!;for(const option of passages(current,session)){if(seen.has(option.target))continue;if(polisIds.has(option.target))return d+1;seen.add(option.target);queue.push([option.target,d+1]);}}return 999;}
function botStep(player:NetworkPlayer,session:NetworkSession){const options=passages(player.position,session).sort((a,b)=>distance(a.target,session)-distance(b.target,session));return options[0]?.target||null;}
function addResource(player:NetworkPlayer,session:NetworkSession,report:string[]){const resource=stationResources[player.position];if(resource?.kind==="rice"){const amount=session.time==="День"?2:1;player.bullets+=amount;report.push(`${player.name}: +${amount} ◉ на станции.`);}else if(resource?.kind==="medkit"){player.inventory.push("medkit");report.push(`${player.name}: получена аптечка.`);}else if(resource?.kind==="wire"){player.inventory.push("wire");report.push(`${player.name}: получена проволока.`);}else report.push(`${player.name}: локальная сцена без добычи.`);}
function cloneSession(session:NetworkSession):NetworkSession{return{...session,players:session.players.map(player=>({...player,inventory:[...player.inventory],lostLimbs:[...player.lostLimbs]})),world:{...session.world,edges:{...session.world.edges}}};}

export function ExpeditionConsole(){
  const [humanCount,setHumanCount]=useState(2);
  const [setup,setSetup]=useState<SetupPlayer[]>(()=>Array.from({length:12},(_,index)=>({name:`Игрок ${index+1}`,roleId:roleCards[index].id,start:starts[index%starts.length]})));
  const [save,setSave]=useState<ExpeditionSave|null>(null);
  const current=save?save.session.players[save.humanIds[save.activeHuman]-1]:null;
  const currentChallenge=save?challengeCards.find(card=>card.id===save.session.activeChallenge):null;
  const options=useMemo(()=>currentChallenge?(challengeSolutions[currentChallenge.id]||[]).filter(option=>!option.roleIds?.length):[],[currentChallenge]);
  const updateSetup=(index:number,patch:Partial<SetupPlayer>)=>setSetup(currentSetup=>currentSetup.map((entry,i)=>i===index?{...entry,...patch}:entry));
  const begin=()=>{
    const session=createDemoSession("COMPANY");session.status="playing";session.playerCount=12;session.gmMessage="Компания людей и ботов движется к Полису без ведущей.";
    const selectedRoles=setup.slice(0,humanCount).map(entry=>entry.roleId);const leftovers=roleCards.map(role=>role.id).filter(id=>!selectedRoles.includes(id));
    session.players=session.players.map((player,index)=>{const human=index<humanCount;const roleId=human?setup[index].roleId:leftovers[index-humanCount];const roleIndex=roleCards.findIndex(role=>role.id===roleId);const base=createDemoSession().players[roleIndex];return{...player,roleId,name:human?setup[index].name:botNames[index],position:human?setup[index].start:base.position,bullets:base.bullets*3,inventory:[...base.inventory],onlineAt:human?Date.now():null};});
    setSave({session,humanIds:Array.from({length:humanCount},(_,index)=>index+1),activeHuman:0,phase:"planning",pendingTarget:null,pendingEdge:null,report:["Экспедиция началась. Ход передаётся людям по очереди, затем идут боты."],traversals:[]});
  };
  const finish=(base:ExpeditionSave,outcome:Outcome)=>{
    const session=cloneSession(base.session);const player=session.players[base.humanIds[base.activeHuman]-1];const source=player.position;const report=[outcome.note];
    if(outcome.move&&base.pendingTarget){player.position=base.pendingTarget;base.traversals.push({source,target:base.pendingTarget,playerId:player.id});}
    if(outcome.injury){const limb=limbCycle.find(entry=>!player.lostLimbs.includes(entry));if(limb)player.lostLimbs.push(limb);report.push(`${player.name} потерял конечность.`);}
    if(outcome.reward){player.inventory.push(outcome.reward);report.push(`Караван передал: ${itemNames[outcome.reward]||outcome.reward}.`);}
    if(base.activeHuman<base.humanIds.length-1)return{...base,session,activeHuman:base.activeHuman+1,phase:"planning" as const,pendingTarget:null,pendingEdge:null,report};
    session.players.filter(candidate=>!base.humanIds.includes(candidate.id)).forEach(bot=>{
      if(polisIds.has(bot.position))return;
      const shouldStay=Math.random()<.46||bot.lostLimbs.length>0&&Math.random()<.62;
      if(shouldStay){addResource(bot,session,report);return;}
      const target=botStep(bot,session);if(!target)return;
      if(Math.random()<.1){const limb=limbCycle.find(entry=>!bot.lostLimbs.includes(entry));if(limb)bot.lostLimbs.push(limb);report.push(`${bot.name} задержан тоннелем и ранен.`);}else bot.position=target;
    });
    session.round+=1;session.time=timeCycle[(timeCycle.indexOf(session.time)+1)%4];session.activeChallenge=null;
    return{...base,session,activeHuman:0,phase:"summary" as const,pendingTarget:null,pendingEdge:null,report:report.slice(0,10),traversals:[]};
  };
  const choose=(target:string|null,edge?:MetroEdge,status?:string)=>setSave(base=>{
    if(!base||base.phase!=="planning")return base;const session=cloneSession(base.session);const player=session.players[base.humanIds[base.activeHuman]-1];
    if(!target){addResource(player,session,[]);return finish({...base,session},{move:false,note:`${player.name} остался на станции и получил её ресурс.`});}
    const pending={...base,session,pendingTarget:target,pendingEdge:edge?.id||null};
    if(!edge)return base;
    if(edge.type==="transfer"){const toll=getCordonProfile(edge.id).price;if(player.bullets<toll)return finish(pending,{move:false,note:`На кордон нужно ${toll} ◉. Патронов не хватило.`});player.bullets-=toll;return finish(pending,{move:true,note:`${player.name} заплатил ${toll} ◉ и прошёл кордон.`});}
    const caravan=activeCaravansForRound(session.round).find(entry=>!entry.resting&&entry.stationId===player.position&&entry.nextStationId===target);
    if(caravan){const reward=Math.random()<.5?rewards[Math.floor(Math.random()*rewards.length)]:undefined;return finish(pending,{move:true,reward,note:`${player.name} прошёл с караваном «${caravan.name}». Испытания не было.`});}
    const companion=base.traversals.find(entry=>entry.source===player.position&&entry.target===target);
    if(companion)return finish(pending,{move:true,note:`${player.name} присоединился к попутчику и безопасно прошёл тоннель.`});
    const quietChance=status==="safe"?.45:.1;if(Math.random()<quietChance)return finish(pending,{move:true,note:"Тоннель оказался тихим. Переход прошёл без испытания."});
    const card=challengeCards.filter(card=>card.id!=="people-01")[Math.floor(Math.random()*(challengeCards.length-1))];session.activeChallenge=card.id;return{...pending,session,phase:"challenge",report:["Открыта карта тоннеля."]};
  });
  const resolve=(option:ChallengeOption)=>setSave(base=>{
    if(!base||base.phase!=="challenge")return base;const session=cloneSession(base.session);const player=session.players[base.humanIds[base.activeHuman]-1];const item=option.itemIds?.find(id=>player.inventory.includes(id));if(option.itemIds?.length&&!item)return base;if(option.bulletCost&&player.bullets<option.bulletCost)return base;if(option.bulletCost)player.bullets-=option.bulletCost;if(item&&option.consumeItem){const index=player.inventory.indexOf(item);player.inventory.splice(index,1);}if(option.outcome==="retreat")return finish({...base,session},{move:false,note:`${player.name}: отступление без ранения.`});const failure=option.outcome==="risk"?.48:item?.18:option.bulletCost?.12:.3;const success=Math.random()>=failure;return finish({...base,session},{move:success,injury:!success,note:success?`${option.label}: получилось.`:`${option.label}: тоннель оказался сильнее.`});
  });
  if(!save)return <main className="expedition-setup"><a href="/" className="solo-back">← Три режима</a><header><p className="pixel-kicker">Режим 02 · люди и боты</p><h1>Соберите компанию</h1><p>Первая сетевая вертикаль работает как общий игровой стол: люди по очереди принимают решения на этом экране, оставшихся персонажей ведут боты. Следующим обновлением разнесём людей по отдельным компьютерам.</p></header><label className="expedition-count">Сколько людей играет?<input type="range" min="2" max="12" value={humanCount} onChange={event=>setHumanCount(Number(event.target.value))}/><b>{humanCount}</b></label><section className="expedition-player-grid">{setup.slice(0,humanCount).map((entry,index)=><article key={index} className="pixel-panel"><RolePortrait roleId={entry.roleId}/><label>Имя<input value={entry.name} onChange={event=>updateSetup(index,{name:event.target.value})}/></label><label>Персонаж<select value={entry.roleId} onChange={event=>updateSetup(index,{roleId:event.target.value})}>{roleCards.map(role=><option key={role.id} value={role.id} disabled={setup.slice(0,humanCount).some((other,i)=>i!==index&&other.roleId===role.id)}>{role.name}</option>)}</select></label><label>Старт<select value={entry.start} onChange={event=>updateSetup(index,{start:event.target.value})}>{starts.map(id=><option key={id} value={id}>{nodeById.get(id)?.name} · {nodeById.get(id)?.lineName}</option>)}</select></label></article>)}</section><button className="pixel-primary expedition-begin" onClick={begin}>Начать совместную экспедицию →</button></main>;
  if(!current)return null;const role=roleCards.find(entry=>entry.id===current.roleId);const neighbors=passages(current.position,save.session);
  return <main className="solo-shell expedition-shell"><header className="solo-header"><div><span>Раунд {save.session.round}</span><b>{save.session.time}</b><i>{save.activeHuman+1}/{save.humanIds.length} ход человека</i></div><strong>Люди + боты</strong><a href="/">Режимы</a></header><div className="solo-layout"><MetroNetworkMap state={save.session} focusIds={save.session.players.map(player=>player.position)} compact={false}/><aside className="solo-command"><section className="solo-human pixel-panel"><RolePortrait roleId={current.roleId}/><div><small>Сейчас ходит</small><h1>{current.name}</h1><p>{role?.name} · {nodeById.get(current.position)?.name}</p><span>{current.bullets} ◉ · {4-current.lostLimbs.length}/4 конечности</span></div></section>{save.phase==="planning"&&<section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={()=>choose(null)}><b>Остаться</b><span>Получить ресурс станции</span></button>{neighbors.map(({edge,target,status})=>{const node=nodeById.get(target);return <button key={`${edge.id}-${target}`} onClick={()=>choose(target,edge,status)}><b>Идти → <i className="route-station-chip" style={{borderColor:node?.color}}>{node?.name}</i></b><span>{status==="caravan"?"🐫 Караван идёт этим маршрутом: испытания не будет":edge.type==="transfer"?`Кордон · ${getCordonProfile(edge.id).price} ◉`:node?.lineName}</span></button>;})}</section>}{save.phase==="challenge"&&currentChallenge&&<section className="solo-challenge pixel-panel"><span>{currentChallenge.type}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.prompt}</strong><div className="solo-solutions">{options.map(option=>{const usable=!option.itemIds?.length||option.itemIds.some(id=>current.inventory.includes(id));return <button key={option.id} disabled={!usable||Boolean(option.bulletCost&&current.bullets<option.bulletCost)} onClick={()=>resolve(option)}><b>{option.label}</b><span>{option.detail}</span>{option.bulletCost&&<small>{option.bulletCost} ◉</small>}</button>;})}</div></section>}{save.phase==="summary"&&<section className="solo-report pixel-panel"><p className="pixel-kicker">Раунд завершён</p>{save.report.map((line,index)=><p key={index}>{line}</p>)}<button className="pixel-primary" onClick={()=>setSave(base=>base?{...base,phase:"planning",report:["Люди снова выбирают путь."]}:base)}>Следующий раунд →</button></section>}<section className="expedition-roster pixel-panel"><p className="pixel-kicker">Кто в пути</p>{save.session.players.map(player=><div key={player.id}><b>{player.name}</b><span>{save.humanIds.includes(player.id)?"человек":"бот"}</span><i>{nodeById.get(player.position)?.name}</i></div>)}</section></aside></div></main>;
}
