import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import App from "./App";
import { DemoProvider } from "./data/demoStore";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DemoProvider>
        <App />
      </DemoProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
