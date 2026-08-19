import type { Metadata } from "next";
import { GameConsole } from "./game-console";

export const metadata: Metadata = {
  title: "Голоса под Москвой — пульт ведущего",
  description: "Интерактивный граф метро, колесо испытаний и инструменты большой ролевой игры.",
};

export default function Home() {
  return <GameConsole />;
}
