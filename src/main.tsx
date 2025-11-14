import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorLogging } from "@/lib/logger";

initGlobalErrorLogging();
createRoot(document.getElementById("root")!).render(<App />);
