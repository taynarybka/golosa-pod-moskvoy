import type { Metadata } from "next";
import { RoomConsole } from "./network-console";

export const metadata: Metadata = {
  title: "Голоса под Москвой — пульт ведущего",
  description: "Интерактивный граф метро, колесо испытаний и инструменты большой ролевой игры.",
};

export default function Home() {
  return <RoomConsole defaultCode="TEST26" defaultPin="2600" />;
}
