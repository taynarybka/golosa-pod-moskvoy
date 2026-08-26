import type { Metadata } from "next";
import { ExpeditionConsole } from "../expedition-console";

export const metadata:Metadata={title:"Люди и боты — Голоса под Москвой",description:"Совместная экспедиция по московскому метро: от двух до двенадцати людей, остальных путников ведут боты."};

export default function ExpeditionPage(){return <ExpeditionConsole/>;}
