import { createRoot } from "react-dom/client";
import SPETutorial from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <SPETutorial />
  </ErrorBoundary>
);
