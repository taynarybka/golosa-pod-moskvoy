"use client";

const modes = [
  {
    number:"01", eyebrow:"Один против метро", title:"Соло-экспедиция",
    text:"Выберите одного персонажа. Остальные одиннадцать путников станут ботами и будут соревноваться с вами за место в Полисе.",
    meta:"1 человек · 11 ботов", href:"/solo", action:"Выбрать персонажа",
  },
  {
    number:"02", eyebrow:"Компания без ведущей", title:"Люди и боты",
    text:"От двух до двенадцати живых игроков. Свободно выбирайте роли, собирайтесь в группы или прокладывайте разные маршруты. Пустые места займут боты.",
    meta:"2–12 человек · остальные боты", href:"/expedition", action:"Собрать компанию",
  },
  {
    number:"03", eyebrow:"Большая ролевая партия", title:"Игра с ведущей",
    text:"Двенадцать игроков, личные экраны, компьютеры отрядов и полный пульт управления событиями, тоннелями и миром метро.",
    meta:"12 человек · 1 ведущая", href:"/play?mode=gm", action:"Открыть сетевую игру",
  },
] as const;

export function ModeSelect(){
  return <main className="mode-select-shell">
    <header className="mode-select-head"><div><span>Москва · 2030</span><b>Голоса под Москвой</b></div><em>Выберите формат партии</em></header>
    <section className="mode-select-hero"><p className="pixel-kicker">Три способа услышать голоса</p><h1>Сколько вас<br/><span>спустилось?</span></h1><p>Карта одна. Правила пути меняются в зависимости от того, кто сидит по другую сторону экрана.</p></section>
    <section className="mode-card-grid">{modes.map(mode=><a href={mode.href} key={mode.number} className="mode-card"><div><span>{mode.number}</span><small>{mode.eyebrow}</small></div><h2>{mode.title}</h2><p>{mode.text}</p><footer><b>{mode.meta}</b><strong>{mode.action} →</strong></footer></a>)}</section>
    <footer className="mode-select-footer"><span>Сборка для тестирования · правила будут меняться</span><i>◉ Патроны · 🐫 Караваны · 4 конечности</i></footer>
  </main>;
}
