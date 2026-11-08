import { useEffect } from "react";

export type AndroidBackResult = "handled" | "exit";

declare global {
  interface Window {
    __handleAndroidBack?: () => AndroidBackResult;
  }
}

export const useAndroidBack = (handler: () => AndroidBackResult) => {
  useEffect(() => {
    window.__handleAndroidBack = handler;
    return () => {
      delete window.__handleAndroidBack;
    };
  }, [handler]);
};
