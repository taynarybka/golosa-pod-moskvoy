import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { SoloConsole } from "../app/solo-console";
import { ExpeditionConsole } from "../app/expedition-console";
import { GameConsole } from "../app/game-console";

type Mode="menu"|"solo"|"expedition"|"gm";
const readMode=():Mode=>{const value=window.location.hash.replace("#","");return value==="solo"||value==="expedition"||value==="gm"?value:"menu";};
const modes=[
  {number:"01",eyebrow:"Один против метро",title:"Соло-экспедиция",text:"Выберите одного персонажа. Остальные одиннадцать путников станут ботами и будут соревноваться с вами за место в Полисе.",meta:"1 человек · 11 ботов",hash:"#solo",action:"Выбрать персонажа"},
  {number:"02",eyebrow:"Компания без ведущей",title:"Люди и боты",text:"От двух до двенадцати живых игроков на одном игровом экране. Пустые места займут боты.",meta:"2–12 человек · остальные боты",hash:"#expedition",action:"Собрать компанию"},
  {number:"03",eyebrow:"Большая ролевая партия",title:"Пульт ведущей",text:"Полная карта, тоннели, NPC, кризис, часы и управление большой партией. Работает автономно прямо в браузере.",meta:"12 человек · 1 ведущая",hash:"#gm",action:"Открыть пульт"},
] as const;
function ModeMenu(){return <main className="mode-select-shell"><header className="mode-select-head"><div><span>Москва · 2030</span><b>Голоса под Москвой</b></div><em>Выберите формат партии</em></header><section className="mode-select-hero"><p className="pixel-kicker">Три способа услышать голоса</p><h1>Сколько вас<br/><span>спустилось?</span></h1><p>Карта одна. Правила пути меняются в зависимости от того, кто сидит по другую сторону экрана.</p></section><section className="mode-card-grid">{modes.map(mode=><a className="mode-card" href={mode.hash} key={mode.hash}><div><span>{mode.number}</span><small>{mode.eyebrow}</small></div><h2>{mode.title}</h2><p>{mode.text}</p><footer><b>{mode.meta}</b><strong>{mode.action} →</strong></footer></a>)}</section><footer className="mode-select-footer"><span>GitHub-сборка · без входа в ChatGPT</span><i>◉ Патроны · 🐫 Караваны · 4 конечности</i></footer></main>}
function App(){const [mode,setMode]=useState<Mode>(readMode);useEffect(()=>{const change=()=>setMode(readMode());const intercept=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement).closest("a");if(anchor?.getAttribute("href")==="/"){event.preventDefault();window.location.hash="";}};window.addEventListener("hashchange",change);document.addEventListener("click",intercept);return()=>{window.removeEventListener("hashchange",change);document.removeEventListener("click",intercept);};},[]);if(mode==="solo")return <><a className="github-mode-back" href="#">← Режимы</a><SoloConsole/></>;if(mode==="expedition")return <><a className="github-mode-back" href="#">← Режимы</a><ExpeditionConsole/></>;if(mode==="gm")return <><a className="github-mode-back" href="#">← Режимы</a><GameConsole/></>;return <ModeMenu/>;}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
