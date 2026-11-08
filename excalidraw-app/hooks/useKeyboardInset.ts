import { useEffect } from "react";

/**
 * Exposes the part of the viewport covered by the soft keyboard as
 * `--keyboard-inset-bottom`. Android usually resizes the WebView, but iOS and
 * some Android configurations only shrink `visualViewport`, so we use that as
 * the source of truth for bottom UI and text editing.
 */
export const useKeyboardInset = () => {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - (viewport.height + viewport.offsetTop),
      );
      document.documentElement.style.setProperty(
        "--keyboard-inset-bottom",
        `${Math.round(inset)}px`,
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      document.documentElement.style.removeProperty("--keyboard-inset-bottom");
    };
  }, []);
};
