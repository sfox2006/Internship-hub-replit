import "@fontsource/raleway/latin-400.css";
import "@fontsource/raleway/latin-600.css";
import "@fontsource/raleway/latin-700.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/auth.css";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
