import type { Metadata } from "next";
import { SoloConsole } from "../solo-console";

export const metadata: Metadata = {
  title: "Одиночная партия — Голоса под Москвой",
  description: "Один живой персонаж и одиннадцать автономных путников-ботов на общей карте метро.",
};

export default function SoloPage() { return <SoloConsole/>; }
