import type { Metadata } from "next";
import { ModeSelect } from "./mode-select";

export const metadata: Metadata = {
  title: "Голоса под Москвой — выбор режима",
  description: "Соло-экспедиция, компания с ботами или полная ролевая партия с ведущей.",
};

export default function Home() {
  return <ModeSelect/>;
}
