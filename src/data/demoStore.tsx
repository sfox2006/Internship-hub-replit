import { createContext, useContext, useState, type ReactNode } from "react";
import type { PersonalState } from "../../shared/types";
import { initialState, loadState, saveState } from "./storage";
type Store = {
  state: PersonalState;
  error: string | null;
  update: (fn: (s: PersonalState) => PersonalState) => boolean;
  toggle: (
    key:
      | "completedResourceIds"
      | "completedRequirementIds"
      | "assistingEntityKeys",
    id: string,
  ) => void;
};
const Context = createContext<Store | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => {
    try {
      return loadState(window.localStorage);
    } catch {
      return {
        state: initialState(),
        error:
          "Browser storage is unavailable. Changes will only last in this session.",
      };
    }
  });
  const [state, setState] = useState(loaded.state);
  const [error, setError] = useState(loaded.error);
  function update(fn: (s: PersonalState) => PersonalState) {
    const next = fn(state);
    let message: string | null;
    try {
      message = saveState(window.localStorage, next);
    } catch {
      message =
        "Browser storage is unavailable. Changes could not be saved for reload.";
    }
    setState(next);
    setError(message);
    return !message;
  }
  function toggle(
    key:
      | "completedResourceIds"
      | "completedRequirementIds"
      | "assistingEntityKeys",
    id: string,
  ) {
    update((s) => ({
      ...s,
      [key]: s[key].includes(id)
        ? s[key].filter((x) => x !== id)
        : [...s[key], id],
    }));
  }
  return (
    <Context.Provider value={{ state, error, update, toggle }}>
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const store = useContext(Context);
  if (!store) throw Error("DemoProvider required");
  return store;
}
