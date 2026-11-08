import { trackEvent } from "../../analytics";
import { useTunnels } from "../../context/tunnels";
import { useI18n } from "../../i18n";
import { useExcalidrawSetAppState } from "../App";
import DropdownMenu from "../dropdownMenu/DropdownMenu";
import { brainIcon } from "../icons";

import type { JSX, ReactNode } from "react";

export const TTDDialogTrigger = ({
  children,
  icon,
  tab = "text-to-diagram",
}: {
  children?: ReactNode;
  icon?: JSX.Element;
  tab?: "text-to-diagram" | "mermaid";
}) => {
  const { t } = useI18n();
  const { TTDDialogTriggerTunnel } = useTunnels();
  const setAppState = useExcalidrawSetAppState();

  return (
    <TTDDialogTriggerTunnel.In>
      <DropdownMenu.Item
        onSelect={() => {
          if (tab === "text-to-diagram") {
            trackEvent("ai", "dialog open", "ttd");
          }
          setAppState({ openDialog: { name: "ttd", tab } });
        }}
        icon={icon ?? brainIcon}
        badge={
          tab === "text-to-diagram" ? (
            <DropdownMenu.Item.Badge>AI</DropdownMenu.Item.Badge>
          ) : undefined
        }
      >
        {children ??
          (tab === "mermaid"
            ? t("mermaid.label")
            : t("labels.textToDiagram"))}
      </DropdownMenu.Item>
    </TTDDialogTriggerTunnel.In>
  );
};
TTDDialogTrigger.displayName = "TTDDialogTrigger";
