import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import { SoloConsole } from "../app/solo-console";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SoloConsole />
  </React.StrictMode>,
);
