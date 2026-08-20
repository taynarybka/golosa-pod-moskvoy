import type { Metadata } from "next";
import { RoomConsole } from "../network-console";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Игровая комната — Голоса под Москвой",description:"Сетевой экран ведущей, отряда или игрока."};
export default function RoomPage(){return <RoomConsole/>;}
