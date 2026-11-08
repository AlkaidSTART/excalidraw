import { Button } from "./Button";

import type { VersionUpdate } from "../version";

export const UpdateBanner = ({
  update,
  clientVersion,
  onUpdate,
  onDismiss,
}: {
  update: VersionUpdate | null;
  clientVersion: string | null;
  onUpdate: () => void;
  onDismiss: () => void;
}) => {
  if (!update) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)_+_1rem)] z-[200] mx-auto flex max-w-[560px] flex-col gap-3 rounded-[0.8rem] border border-app-border bg-app-surface p-4 text-app-text shadow-[0_12px_40px_rgb(0_0_0_/_28%)] min-[600px]:flex-row min-[600px]:items-center"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[0.95rem] font-semibold">
          Update available — v{update.version}
        </p>
        <p className="m-0 mt-0.5 text-[0.85rem] text-app-text-muted">
          You are on v{clientVersion ?? "unknown"}. Update to get the latest
          fixes.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={onDismiss}>
          Later
        </Button>
        <Button onClick={onUpdate}>Update now</Button>
      </div>
    </div>
  );
};
