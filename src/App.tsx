import { useState } from "react";
import "./styles.css";
import Home from "./components/Home";
import Trainer from "./components/Trainer";

type View = "home" | "trainer";

function App() {
  const [view, setView] = useState<View>("home");

  if (view === "trainer") {
    return <Trainer onExit={() => setView("home")} />;
  }
  return <Home onContinue={() => setView("trainer")} />;
}

export default App;
