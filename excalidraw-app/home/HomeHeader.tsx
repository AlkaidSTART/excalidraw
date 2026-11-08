import { LoadIcon, PlusIcon } from "@excalidraw/excalidraw/components/icons";

import { Button } from "../components/Button";

export const HomeHeader = ({
  query,
  onQueryChange,
  onNew,
  onImport,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onNew: () => void;
  onImport: () => void;
}) => {
  return (
    <header className="mx-auto mb-4 flex max-w-[1200px] flex-col gap-3">
      <div className="flex items-center justify-between gap-4 max-[600px]:flex-col max-[600px]:items-start">
        <h1 className="m-0 text-2xl font-bold">Excalidraw</h1>
        <div className="flex gap-2 max-[600px]:w-full">
          <Button className="max-[600px]:flex-1" onClick={onNew}>
            {PlusIcon} New
          </Button>
          <Button
            variant="secondary"
            className="max-[600px]:flex-1"
            onClick={onImport}
          >
            {LoadIcon} Import
          </Button>
        </div>
      </div>
      <input
        className="min-h-11 w-full rounded-[0.6rem] border border-app-border bg-app-surface px-3.5 font-app text-base text-app-text outline-none focus:border-app-accent"
        type="search"
        value={query}
        placeholder="Search drawings"
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </header>
  );
};
