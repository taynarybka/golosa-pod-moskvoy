"use client";

import { useEffect } from "react";
import { RolePortrait } from "./network-console";

export type DeathModalProps = {
  /** Имя персонажа. */
  name: string;
  /** Название роли. */
  roleName: string;
  roleId: string;
  /** Где оборвался путь. */
  station: string;
  /** Короткие числа для эпитафии: подпись → значение. */
  stats: { label: string; value: string | number }[];
  /** Последние строки отчёта: что случилось. */
  lines: string[];
  /** Главное действие: «Выбрать другую роль» / «Новая партия». */
  primary?: { label: string; onClick: () => void };
  /** Закрыть окно и остаться смотреть карту. */
  onDismiss: () => void;
};

/** Полноэкранное окно гибели персонажа: тёмная виньетка, портрет, эпитафия и последние события. */
export function DeathModal({ name, roleName, roleId, station, stats, lines, primary, onDismiss }: DeathModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);
  return <div className="death-modal" role="dialog" aria-modal="true" aria-labelledby="death-title">
    <button type="button" className="death-backdrop" aria-label="Закрыть окно" onClick={onDismiss}/>
    <div className="death-card">
      <div className="death-portrait"><RolePortrait roleId={roleId}/><i/></div>
      <p className="death-kicker">Путь оборвался</p>
      <h2 id="death-title">{name}</h2>
      <p className="death-role">{roleName} · последняя станция — <b>{station}</b></p>
      <div className="death-stats">{stats.map((entry) => <div key={entry.label}><b>{entry.value}</b><span>{entry.label}</span></div>)}</div>
      {lines.length > 0 && <div className="death-lines">{lines.slice(0, 4).map((line, index) => <p key={index}>{line}</p>)}</div>}
      <p className="death-epitaph">Метро запомнило этот путь. Голоса под Москвой станут на один тише.</p>
      <div className="death-actions">
        {primary && <button type="button" className="pixel-primary" onClick={primary.onClick}><span>{primary.label}</span><b>→</b></button>}
        <button type="button" className="death-dismiss" onClick={onDismiss}>Остаться и смотреть карту</button>
      </div>
    </div>
  </div>;
}
