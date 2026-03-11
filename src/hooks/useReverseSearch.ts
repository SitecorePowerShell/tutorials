import { useState, useCallback } from "react";

export interface ReverseSearchState {
  active: boolean;
  query: string;
  matchIndex: number;
  matches: string[];
  currentMatch: string | null;
}

const INITIAL_STATE: ReverseSearchState = {
  active: false,
  query: "",
  matchIndex: 0,
  matches: [],
  currentMatch: null,
};

function filterHistory(history: string[], query: string): string[] {
  if (!query) return [...history].reverse();
  const q = query.toLowerCase();
  return [...history].reverse().filter((entry) =>
    entry.toLowerCase().includes(q)
  );
}

export function useReverseSearch(commandHistory: string[]) {
  const [state, setState] = useState<ReverseSearchState>(INITIAL_STATE);

  const activate = useCallback(() => {
    const matches = [...commandHistory].reverse();
    setState({
      active: true,
      query: "",
      matchIndex: 0,
      matches,
      currentMatch: matches[0] ?? null,
    });
  }, [commandHistory]);

  const deactivate = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const updateQuery = useCallback(
    (query: string) => {
      const matches = filterHistory(commandHistory, query);
      setState({
        active: true,
        query,
        matchIndex: 0,
        matches,
        currentMatch: matches[0] ?? null,
      });
    },
    [commandHistory]
  );

  const nextMatch = useCallback(() => {
    setState((prev) => {
      if (prev.matches.length === 0) return prev;
      const nextIndex = (prev.matchIndex + 1) % prev.matches.length;
      return {
        ...prev,
        matchIndex: nextIndex,
        currentMatch: prev.matches[nextIndex],
      };
    });
  }, []);

  const accept = useCallback((): string | null => {
    const match = state.currentMatch;
    setState(INITIAL_STATE);
    return match;
  }, [state.currentMatch]);

  return { state, activate, deactivate, updateQuery, nextMatch, accept };
}
