import clsx from "clsx";
import { useI18n, languages } from "@excalidraw/excalidraw/i18n";

import { useSetAtom } from "../app-jotai";

import { appLangCodeAtom } from "./language-state";

export const LanguageList = ({ className }: { className?: string }) => {
  const { t, langCode } = useI18n();
  const setLangCode = useSetAtom(appLangCodeAtom);

  return (
    <select
      className={clsx("dropdown-select dropdown-select__language", className)}
      onChange={({ target }) => setLangCode(target.value)}
      value={langCode}
      aria-label={t("buttons.selectLanguage")}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};
