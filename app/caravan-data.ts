import { metroData } from "./metro-data";

export type ActiveCaravan = {
  id: string;
  name: string;
  lineId: string;
  lineName: string;
  color: string;
  stationId: string;
  nextStationId: string;
  direction: "forward" | "backward";
  resting: boolean;
};

const routes = metroData.lines.map((line) => ({
  ...line,
  stations: metroData.nodes.filter((node) => node.lineId === line.id).map((node) => node.id),
})).filter((line) => line.stations.length > 1);

function pingPong(step:number,length:number){
  const period=Math.max(1,(length-1)*2);const point=step%period;
  return point<length?point:period-point;
}

/** Караваны делают переход, затем один раунд стоят на станции. */
export function activeCaravansForRound(round:number):ActiveCaravan[]{
  const step=Math.floor(Math.max(0,round-1)/2);const resting=round%2===0;
  return routes.flatMap((route)=>{
    const ring=route.id==="5"||route.id==="11";
    const shortBranch=route.stations.length<=14;
    const directions:("forward"|"backward")[]=ring?[route.id==="11"?"backward":"forward"]:shortBranch?["forward"]:["forward","backward"];
    return directions.map((direction)=>{
      const length=route.stations.length;
      const position=ring
        ?(direction==="forward"?step%length:(length-1-(step%length)+length)%length)
        :(direction==="forward"?pingPong(step,length):length-1-pingPong(step,length));
      const nextStep=step+1;
      const nextPosition=ring
        ?(direction==="forward"?nextStep%length:(length-1-(nextStep%length)+length)%length)
        :(direction==="forward"?pingPong(nextStep,length):length-1-pingPong(nextStep,length));
      return {
        id:`caravan-${route.id}-${direction}`,
        name:ring?`Кольцевая почта · ${route.name}`:shortBranch?`Челночный караван · ${route.name}`:`${direction==="forward"?"Прямой":"Обратный"} караван · ${route.name}`,
        lineId:route.id,
        lineName:route.name,
        color:route.color,
        stationId:route.stations[position],
        nextStationId:route.stations[nextPosition],
        direction,
        resting,
      };
    });
  });
}
