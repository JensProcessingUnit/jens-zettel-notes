import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@fontsource/crimson-text/400.css";
import "@fontsource/crimson-text/600.css";
import "@fontsource/jetbrains-mono/400.css";

createRoot(document.getElementById("root")!).render(<App />);
