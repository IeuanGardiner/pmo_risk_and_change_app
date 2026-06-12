import { useEffect, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface SearchHandle {
  focus(): void;
}

export function useGlobalShortcuts(searchRef: RefObject<SearchHandle | null>) {
  const navigate = useNavigate();
  const { can } = useAuth();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "r" || e.key === "R") {
          if (can("risks:create")) {
            e.preventDefault();
            navigate("/risks/new");
          }
          return;
        }
        if (e.key === "c" || e.key === "C") {
          if (can("changes:create")) {
            e.preventDefault();
            navigate("/changes/new");
          }
          return;
        }
      }

      if (e.key === "/" && !inField && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, can, searchRef]);
}
