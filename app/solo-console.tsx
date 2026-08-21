"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { challengeCards, itemCards } from "./card-data";
import { challengeSolutions, type ChallengeOption } from "./challenge-solutions";
import { getCordonProfile, itemInspectionRisk, roleCards } from "./game-data";
import { metroData } from "./metro-data";
import { MetroNetworkMap, RolePortrait } from "./network-console";
import { createDemoSession, type NetworkPlayer, type NetworkSession, type PlayerIntent, type SessionTime } from "./network-session";
import { scenarioEdgeMarks, stationResources } from "./scenario-data";

type SoloPhase = "setup" | "planning" | "challenge" | "cordon" | "summary" | "won" | "dead";
type SoloStats = {
  stays:number; cordons:number; challenges:number; itemSolutions:number;
  quietTunnels:number; healed:number; bulletsSpent:number; visited:string[];
};
type SoloSave = {
  session: NetworkSession;
  phase: SoloPhase;
  humanId: number;
  report: string[];
  steps: number;
  pendingTarget: string | null;
  pendingEdgeId: string | null;
  soloGoalId: string;
  stats: SoloStats;
};
type MetroEdge = { id:string; source:string; target:string; type:string };
type TurnOutcome = { move:boolean; injury?:boolean; note?:string; rewardItem?:string; rewardBullets?:number; challenge?:boolean; itemSolution?:boolean; quiet?:boolean; cordon?:boolean; bulletsSpent?:number };
type SoloGoal = { id:string; title:string; text:string; target:number; progress:(save:SoloSave)=>number; unit:string };

const edges = metroData.edges as readonly MetroEdge[];
const nodes = metroData.nodes as readonly {id:string;name:string;lineName:string}[];
const byId = new Map(nodes.map((node)=>[node.id,node]));
const targetId = "1::библиотека им.ленина";
const soloStorageKey = "metro-expedition-v1";
const timeCycle:SessionTime[]=["Утро","День","Вечер","Ночь"];
const limbCycle=["leftArm","rightArm","leftLeg","rightLeg"];
const limbNames:Record<string,string>={leftArm:"левая рука",rightArm:"правая рука",leftLeg:"левая нога",rightLeg:"правая нога"};
const botNames=["Север","Лис","Яна","Сыч","Док","Шило","Марта","Картограф","Искра","Челнок","Старик","Тихий"];
const itemNames:Record<string,string>={wire:"Моток проволоки",cloth:"Плотная тряпка",tarp:"Водостойкий тент",rope:"Верёвка с карабином",crowbar:"Лом",wrench:"Разводной ключ",chalk:"Коробка мела",flashlight:"Ручной фонарь",battery:"Рабочая батарея",mirror:"Осколок зеркала",rat_spray:"Баллон от крыс",whistle:"Свисток",radio:"Карманная рация",tube:"Герметичный тубус",filter:"Запасной фильтр",mask:"Противогаз",boots:"Резиновые сапоги",lighter:"Бензиновая зажигалка",medkit:"Аптечка",tourniquet:"Жгут",antiseptic:"Антисептик",splint:"Складная шина",painkillers:"Обезболивающее",hot_meal:"Горячая свинина",headphones:"Наушники",pass:"Поддельный пропуск"};
const expendableItems=new Set(["wire","cloth","tarp","rat_spray","battery","filter","lighter","hot_meal","antiseptic","painkillers"]);
const commonRewards=["chalk","cloth","wire","lighter","tourniquet"];
const soloGoals:SoloGoal[]=[
  {id:"long-road",title:"Длинная дорога",text:"Добраться до Полиса, пройдя не меньше 15 тоннелей.",target:15,progress:save=>save.steps,unit:"тоннелей"},
  {id:"wanderer",title:"Своя карта",text:"До Полиса лично побывать минимум на 12 разных станциях.",target:12,progress:save=>save.stats.visited.length,unit:"станций"},
  {id:"reserve",title:"Белый запас",text:"Принести в Полис не меньше 35 патронов.",target:35,progress:save=>save.session.players[save.humanId-1]?.bullets||0,unit:"патронов"},
  {id:"collector",title:"Всё пригодится",text:"Донести до Полиса не меньше шести предметов.",target:6,progress:save=>save.session.players[save.humanId-1]?.inventory.length||0,unit:"предметов"},
  {id:"variety",title:"Не одной проволокой",text:"Собрать в рюкзаке пять разных видов предметов.",target:5,progress:save=>new Set(save.session.players[save.humanId-1]?.inventory||[]).size,unit:"видов"},
  {id:"camp",title:"Станционный человек",text:"За экспедицию не меньше шести раз остаться на станции.",target:6,progress:save=>save.stats.stays,unit:"остановок"},
  {id:"trials",title:"Проверено на себе",text:"Успешно разрешить семь тоннельных испытаний.",target:7,progress:save=>save.stats.challenges,unit:"испытаний"},
  {id:"improvise",title:"Импровизатор",text:"Трижды решить испытание подходящей карточкой предмета.",target:3,progress:save=>save.stats.itemSolutions,unit:"решений"},
  {id:"customs",title:"Чужие границы",text:"Успешно пройти три межлинейных кордона.",target:3,progress:save=>save.stats.cordons,unit:"кордонов"},
  {id:"silence",title:"Тишина тоже событие",text:"Трижды пройти тоннель без испытания.",target:3,progress:save=>save.stats.quietTunnels,unit:"тихих проходов"},
  {id:"recovery",title:"Собрать себя заново",text:"За экспедицию восстановить две потерянные конечности.",target:2,progress:save=>save.stats.healed,unit:"лечений"},
  {id:"unbroken",title:"Ни царапины",text:"Добраться до Полиса со всеми четырьмя конечностями.",target:4,progress:save=>4-(save.session.players[save.humanId-1]?.lostLimbs.length||0),unit:"конечности"},
];

const emptySoloStats=(position:string):SoloStats=>({stays:0,cordons:0,challenges:0,itemSolutions:0,quietTunnels:0,healed:0,bulletsSpent:0,visited:[position]});
const randomSoloGoal=()=>soloGoals[Math.floor(Math.random()*soloGoals.length)]?.id||soloGoals[0].id;

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
  const session=createDemoSession("VOICE26");session.playerCount=12;session.status="playing";session.gmMessage="Один из голосов принадлежит вам. Остальные путники идут своим маршрутом.";
  session.crisisStatus="inactive";
  session.players=session.players.map((player,index)=>({...player,bullets:player.bullets*3,name:index+1===humanId?"Вы":botNames[index],onlineAt:index+1===humanId?Date.now():null}));
  session.log=[{id:"expedition-start",at:Date.now(),text:"Экспедиция началась. Двенадцать голосов движутся к Полису."}];
  return {session,phase:"planning",humanId,report:["Личная цель открыта. Путь к Полису начался."],steps:0,pendingTarget:null,pendingEdgeId:null,soloGoalId:randomSoloGoal(),stats:emptySoloStats(session.players[humanId-1].position)};
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
  const human=session.players[save.humanId-1];const report:string[]=[];
  const stats:SoloStats={...save.stats,visited:[...save.stats.visited]};
  session.players.forEach((player)=>{
    if(player.intent==="tunnel"&&player.target){
      if(player.id===save.humanId){
        if(outcome.move){
          player.position=player.target;report.push(`Вы дошли до станции «${byId.get(player.position)?.name}».`);
          if(!stats.visited.includes(player.position))stats.visited.push(player.position);
        }else report.push("Вы вернулись на исходную станцию и ничего на ней не добывали.");
      }else{
        player.position=player.target;
        if((session.round+player.id)%11===0){const limb=limbCycle[(session.round+player.id)%4];if(!player.lostLimbs.includes(limb))player.lostLimbs.push(limb);report.push(`${player.name} ранен по пути: ${limbNames[limb]}.`);}
      }
    }else if(player.intent==="stay"){addResource(player,session,report,player.id===save.humanId);if(player.id===save.humanId)stats.stays+=1;}
  });
  if(outcome.challenge)stats.challenges+=1;
  if(outcome.itemSolution)stats.itemSolutions+=1;
  if(outcome.quiet)stats.quietTunnels+=1;
  if(outcome.cordon)stats.cordons+=1;
  if(outcome.bulletsSpent)stats.bulletsSpent+=outcome.bulletsSpent;
  if(outcome.injury){
    const available=limbCycle.filter(limb=>!human.lostLimbs.includes(limb));const limb=available[Math.floor(Math.random()*available.length)];if(limb){human.lostLimbs.push(limb);report.push(`Последствие: потеряна ${limbNames[limb]}.`);}
  }
  if(outcome.rewardItem){human.inventory.push(outcome.rewardItem);report.push(`Награда: ${itemNames[outcome.rewardItem]||outcome.rewardItem}.`);}
  if(outcome.rewardBullets){human.bullets+=outcome.rewardBullets;report.push(`Награда: +${outcome.rewardBullets} патрона.`);}
  if(outcome.note)report.unshift(outcome.note);
  const travelersAtPolis=session.players.filter(player=>player.id!==save.humanId&&player.position===targetId).length;
  if(travelersAtPolis)report.push(`В Полисе уже ${travelersAtPolis} ${travelersAtPolis===1?"путник":"путников"}.`);
  session.round+=1;session.time=timeCycle[(timeCycle.indexOf(session.time)+1)%4];session.phase="planning";session.activeChallenge=null;
  session.players=session.players.map(player=>({...player,intent:null,target:null,ready:false,selectedItem:null}));
  const dead=human.lostLimbs.length>=4;const won=human.position===targetId;
  return {...save,session,stats,phase:dead?"dead":won?"won":"summary",report:report.slice(0,9),steps:save.steps+(outcome.move&&human.intent==="tunnel"?1:0),pendingTarget:null,pendingEdgeId:null};
}

export function SoloConsole(){
  const [save,setSave]=useState<SoloSave|null>(null);const [selectedRole,setSelectedRole]=useState(roleCards[0].id);
  const [musicOn,setMusicOn]=useState(false);const audioRef=useRef<AudioContext|null>(null);
  useEffect(()=>{const raw=localStorage.getItem(soloStorageKey);if(raw){try{const parsed=JSON.parse(raw) as SoloSave;const position=parsed.session.players[parsed.humanId-1]?.position||"";setSave({...parsed,session:{...parsed.session,crisisStatus:"inactive"},pendingTarget:parsed.pendingTarget||null,pendingEdgeId:parsed.pendingEdgeId||null,soloGoalId:parsed.soloGoalId||randomSoloGoal(),stats:{...emptySoloStats(position),...(parsed.stats||{}),visited:parsed.stats?.visited||[position]}});}catch{/* Повреждённое локальное сохранение игнорируется. */}}},[]);
  useEffect(()=>{if(save)localStorage.setItem(soloStorageKey,JSON.stringify(save));},[save]);
  useEffect(()=>()=>{void audioRef.current?.close();},[]);
  const toggleMusic=async()=>{
    if(audioRef.current){await audioRef.current.close();audioRef.current=null;setMusicOn(false);return;}
    const AudioContextClass=window.AudioContext;const context=new AudioContextClass();const master=context.createGain();master.gain.value=.075;master.connect(context.destination);
    const low=context.createBiquadFilter();low.type="lowpass";low.frequency.value=150;low.Q.value=2.4;low.connect(master);
    [43,58].forEach((frequency,index)=>{const oscillator=context.createOscillator();const gain=context.createGain();oscillator.type=index?"triangle":"sine";oscillator.frequency.value=frequency;gain.gain.value=index?.13:.2;oscillator.connect(gain).connect(low);oscillator.start();});
    const noise=context.createBuffer(1,context.sampleRate*4,context.sampleRate);const channel=noise.getChannelData(0);for(let index=0;index<channel.length;index++)channel[index]=(Math.random()*2-1)*(.16+.08*Math.sin(index/context.sampleRate*Math.PI));
    const source=context.createBufferSource();const tunnel=context.createBiquadFilter();const noiseGain=context.createGain();source.buffer=noise;source.loop=true;tunnel.type="bandpass";tunnel.frequency.value=420;tunnel.Q.value=.7;noiseGain.gain.value=.11;source.connect(tunnel).connect(noiseGain).connect(master);source.start();
    const pulse=context.createOscillator();const pulseGain=context.createGain();pulse.frequency.value=.085;pulseGain.gain.value=.025;pulse.connect(pulseGain).connect(master.gain);pulse.start();
    audioRef.current=context;await context.resume();setMusicOn(true);
  };
  const human=save?.session.players[save.humanId-1];const role=human?roleCards.find(entry=>entry.id===human.roleId):undefined;
  const availableNeighbors=human&&save?neighbors(human.position,save.session):[];
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
    if(Math.random()<quietChance)return finishTurn(pending,{move:true,quiet:true,note:status==="safe"?"Безопасный тоннель оказался тихим: вы прошли без испытания.":"Обычный пустой перегон: в этот раз ничего не произошло."});
    const challenge=pickChallenge();session.phase="challenge";session.activeChallenge=challenge.id;
    return {...pending,session,phase:"challenge",report:["Событие тоннеля открыто."]};
  });
  const resolveOption=(option:ChallengeOption)=>setSave(current=>{
    if(!current||!currentChallenge)return current;
    const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory]}))};const player=session.players[current.humanId-1];
    const itemId=option.itemIds?.find(id=>player.inventory.includes(id));
    if(option.itemIds?.length&&!itemId)return current;
    if(option.roleIds?.length)return current;
    if(option.bulletCost&&player.bullets<option.bulletCost)return current;
    if(option.bulletCost)player.bullets-=option.bulletCost;
    if(itemId&&option.consumeItem&&expendableItems.has(itemId)){const index=player.inventory.indexOf(itemId);player.inventory.splice(index,1);}
    const itemNote=itemId?` Использовано: ${itemNames[itemId]||itemId}${expendableItems.has(itemId)?" (потрачено)":""}.`:"";
    if(option.outcome==="retreat")return finishTurn({...current,session},{move:false,note:`${option.label}.${itemNote}`});
    if(option.outcome==="risk"){
      const succeeded=Math.random()<.62;return finishTurn({...current,session},{move:succeeded,injury:!succeeded,challenge:succeeded,bulletsSpent:option.bulletCost||0,note:succeeded?`${option.label}: риск оправдался.`:`${option.label}: попытка сорвалась.${itemNote}`});
    }
    const rewardItem=option.rewardItem||(option.outcome==="reward"?commonRewards[(current.session.round+current.humanId)%commonRewards.length]:undefined);
    return finishTurn({...current,session},{move:true,rewardItem,rewardBullets:option.rewardBullets,challenge:true,itemSolution:Boolean(itemId),bulletsSpent:option.bulletCost||0,note:`${option.label}: решение сработало.${itemNote}`});
  });
  const resolveCordon=(mode:"pay"|"inspect"|"retreat")=>setSave(current=>{
    if(!current||!currentCordon)return current;
    const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory]}))};const player=session.players[current.humanId-1];
    if(mode==="retreat")return finishTurn({...current,session},{move:false,note:"Вы отказались от условий кордона и вернулись на исходную станцию."});
    const inspectionCost=Math.min(4,player.inventory.reduce((sum,item)=>sum+(itemInspectionRisk[item]||0),0));
    const toll=currentCordon.price+(session.time==="Вечер"?1:0);const cost=mode==="inspect"?inspectionCost:toll;
    if(player.bullets<cost)return current;player.bullets-=cost;
    return finishTurn({...current,session},{move:true,cordon:true,bulletsSpent:cost,note:mode==="inspect"?`Досмотр завершён. Подозрительные вещи потребовали ${cost} ◉; обычной пошлины не было.`:`Пошлина ${cost} ◉ уплачена. Досмотра на этом посту нет.`});
  });
  const heal=(limb:string)=>setSave(current=>{
    if(!current||current.phase!=="planning")return current;const session={...current.session,players:current.session.players.map(player=>({...player,inventory:[...player.inventory],lostLimbs:[...player.lostLimbs]}))};const player=session.players[current.humanId-1];const kit=player.inventory.indexOf("medkit");if(kit<0||!player.lostLimbs.includes(limb))return current;player.inventory.splice(kit,1);player.lostLimbs=player.lostLimbs.filter(entry=>entry!==limb);return {...current,session,stats:{...current.stats,healed:current.stats.healed+1},report:[`Аптечка потрачена: восстановлена ${limbNames[limb]}. Лечение не израсходовало ход.`,...current.report]};
  });
  const nextRound=()=>setSave(current=>current?{...current,phase:"planning",report:["Остальные путники снова выбирают маршруты. Ваше решение принимается первым."]}:current);

  if(!save)return <main className="solo-setup"><button className="ambient-toggle setup-sound" onClick={toggleMusic}>{musicOn?"Звук: вкл":"Звук: выкл"}</button><section><p className="pixel-kicker">Москва · 2030</p><h1>Голоса ведут к Полису.<br/><span>Путь начинается здесь.</span></h1><p>Выберите персонажа и начните путь по московскому метро. У каждого путешественника — своя история и личная цель.</p><label>Выберите роль<select value={selectedRole} onChange={event=>setSelectedRole(event.target.value)}>{roleCards.map(entry=><option value={entry.id} key={entry.id}>{entry.name} · {entry.pairName}</option>)}</select></label><button className="pixel-primary" onClick={begin}>Начать экспедицию <span>→</span></button></section><div className="solo-role-preview"><RolePortrait roleId={selectedRole}/><h2>{roleCards.find(entry=>entry.id===selectedRole)?.name}</h2><p>{roleCards.find(entry=>entry.id===selectedRole)?.history}</p><b>Личная цель будет выдана после начала экспедиции.</b></div></main>;
  if(!human||!role)return null;
  const options=currentChallenge?(challengeSolutions[currentChallenge.id]||[]).filter(option=>!option.roleIds?.length):[];
  const inspectionCost=Math.min(4,human.inventory.reduce((sum,item)=>sum+(itemInspectionRisk[item]||0),0));
  const cordonToll=currentCordon?currentCordon.price+(save.session.time==="Вечер"?1:0):0;
  const soloGoal=soloGoals.find(goal=>goal.id===save.soloGoalId)||soloGoals[0];
  const soloGoalProgress=soloGoal.progress(save);
  const soloGoalDone=save.phase==="won"&&soloGoalProgress>=soloGoal.target;
  return <main className="solo-shell"><header className="solo-header"><span className="solo-title">Голоса под Москвой</span><div><span>{save.session.time}</span><b>Раунд {String(save.session.round).padStart(2,"0")}</b><em>{save.phase==="planning"?"Ваш ход":save.phase==="challenge"?"Испытание":save.phase==="cordon"?"Кордон":save.phase==="summary"?"Итоги":save.phase==="won"?"Полис":"Погиб"}</em></div><aside><button className="ambient-toggle" onClick={toggleMusic}>{musicOn?"Звук: вкл":"Звук: выкл"}</button><button onClick={()=>{if(confirm("Удалить сохранение экспедиции?")){localStorage.removeItem(soloStorageKey);setSave(null);}}}>Новая партия</button></aside></header>
    <div className="solo-layout"><section className="solo-map"><MetroNetworkMap state={save.session} focusIds={[human.position]} compact={false}/></section><aside className="solo-command">
      <article className="solo-human pixel-panel"><RolePortrait roleId={human.roleId}/><small>Ваш персонаж · {human.bullets} ◉ · пройдено {save.steps}</small><h2>{role.name}</h2><div><b>{byId.get(human.position)?.name}</b><span>{4-human.lostLimbs.length}/4 конечности</span></div></article>
      <section className={`solo-goal pixel-panel ${soloGoalDone?"complete":""}`}><p className="pixel-kicker">Личная цель</p><h3>{soloGoal.title}</h3><p>{soloGoal.text}</p><div><span>{soloGoalProgress} / {soloGoal.target} {soloGoal.unit}</span><b>{soloGoalDone?"Выполнено":soloGoalProgress>=soloGoal.target?"Условие собрано":"В процессе"}</b></div></section>
      {save.phase==="planning"&&human.lostLimbs.length>0&&<section className="solo-heal pixel-panel"><p className="pixel-kicker">Лечение без расхода хода</p><span>Аптечек: {human.inventory.filter(item=>item==="medkit").length}</span><div>{human.lostLimbs.map(limb=><button disabled={!human.inventory.includes("medkit")} key={limb} onClick={()=>heal(limb)}>Восстановить: {limbNames[limb]}</button>)}</div></section>}
      <section className="solo-inventory pixel-panel"><p className="pixel-kicker">Рюкзак</p><div>{inventoryGroups.map(([item,count])=><article key={item}><b>{itemCards.find(card=>card.id===item)?.title||itemNames[item]||item}</b><span>×{count}</span><small>{itemInspectionRisk[item]?`Подозрительность: ${itemInspectionRisk[item]}`:"Обычная вещь"}</small></article>)}</div></section>
      {save.phase==="planning"&&<section className="solo-action pixel-panel"><p className="pixel-kicker">Ваше решение</p><button onClick={()=>choose("stay",null)}><b>Остаться</b><span>{stationResources[human.position]?.label||"Локальная сцена"} · ресурс добавится в рюкзак</span></button>{availableNeighbors.map(({edge,target,status})=><button key={`${edge.id}-${target}`} onClick={()=>choose("tunnel",target,edge,status)}><b>Идти → {byId.get(target)?.name}</b><span>{edge.type==="transfer"?"Переход между ветками · кордон без тоннельной карты":status==="safe"?"Безопасный тоннель · высокий шанс тихого прохода":status==="unknown"?"Непонятный тоннель · событие почти наверняка":`Открытый тоннель · 10% тихого прохода`}</span></button>)}</section>}
      {save.phase==="challenge"&&currentChallenge&&<section className="solo-challenge pixel-panel"><span>{currentChallenge.category}</span><h2>{currentChallenge.title}</h2><p>{currentChallenge.scene}</p><strong>{currentChallenge.question}</strong><div className="solo-solutions">{options.map(option=>{const item=option.itemIds?.find(id=>human.inventory.includes(id));const affordable=!option.bulletCost||human.bullets>=option.bulletCost;const disabled=Boolean(option.itemIds?.length&&!item)||!affordable;return <button disabled={disabled} key={option.id} onClick={()=>resolveOption(option)}><b>{option.label}</b><span>{option.detail}</span>{option.itemIds?.length&&<small>{item?`Есть: ${itemNames[item]||item}`:`Нужно: ${option.itemIds.map(id=>itemNames[id]||id).join(" / ")}`}</small>}{option.bulletCost&&<small>Цена: {option.bulletCost} ◉</small>}</button>})}</div><small>Предмет — только один из вариантов. Ролевые решения и отступление не требуют карточки.</small></section>}
      {save.phase==="cordon"&&currentCordon&&<section className="solo-cordon pixel-panel"><span>{currentCordon.title}</span><h2>{currentCordon.inspection?"Досмотр":"Пошлина"}</h2><p>{currentCordon.guardText}</p>{currentCordon.inspection?<><strong>Этот пост не берёт обычную пошлину. Он проводит шмон.</strong><p>Подозрительные вещи дадут доплату {inspectionCost} ◉.</p><button disabled={human.bullets<inspectionCost} onClick={()=>resolveCordon("inspect")}>Пройти досмотр · {inspectionCost} ◉</button></>:<><strong>Этот пост берёт деньги, но не досматривает.</strong><button disabled={human.bullets<cordonToll} onClick={()=>resolveCordon("pay")}>Заплатить {cordonToll} ◉</button></>}<button onClick={()=>resolveCordon("retreat")}>Отказаться и вернуться</button></section>}
      {(save.phase==="summary"||save.phase==="won"||save.phase==="dead")&&<section className={`solo-report pixel-panel ${save.phase}`}><p className="pixel-kicker">Итоги раунда</p><h2>{save.phase==="won"?"Вы дошли до Полиса":save.phase==="dead"?"Живая форма погибла":"Метро продолжает двигаться"}</h2>{save.report.map((line,index)=><p key={index}>{line}</p>)}{save.phase==="summary"&&<button className="pixel-primary" onClick={nextRound}>Следующий раунд <span>→</span></button>}{save.phase!=="summary"&&<button onClick={()=>{localStorage.removeItem(soloStorageKey);setSave(null);}}>Выбрать другую роль</button>}</section>}
      <section className="solo-bot-feed pixel-panel"><p className="pixel-kicker">Другие путники</p>{save.session.players.filter(player=>player.id!==save.humanId).map(player=><div key={player.id}><span>{player.name} · {roleCards.find(entry=>entry.id===player.roleId)?.name}</span><b>{byId.get(player.position)?.name}</b><i>{player.lostLimbs.length>=4?"погиб":`${4-player.lostLimbs.length}/4`}</i></div>)}</section>
    </aside></div>
  </main>;
}
