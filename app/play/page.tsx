import type { Metadata } from "next";
import { JoinLobby } from "../network-console";

export const metadata:Metadata={title:"Подключение к партии — Голоса под Москвой",description:"Вход в сетевую комнату по коду и PIN устройства."};
export default function PlayPage(){return <JoinLobby/>;}
