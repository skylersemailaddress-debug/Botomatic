import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return <main><h1>mobileAppShell</h1><p>Representative static fixture for corpus validation.</p></main>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
