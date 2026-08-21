import type { Metadata } from "next";
import { SoloConsole } from "../solo-console";

export const metadata: Metadata = {
  title: "Экспедиция — Голоса под Москвой",
  description: "Путешествие через постапокалиптическое московское метро к Полису.",
};

export default function SoloPage() { return <SoloConsole/>; }
