import { useEffect } from "react";
import { loadCachedBranding } from "../theme/branding";

/** Sets the browser tab title for the current page, suffixed with the
    configured product name. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${loadCachedBranding().appName}`;
  }, [title]);
}
