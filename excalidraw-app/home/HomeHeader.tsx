import { LoadIcon, PlusIcon } from "@excalidraw/excalidraw/components/icons";

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
    <header className="app-home__header">
      <div className="app-home__title-row">
        <h1>Excalidraw</h1>
        <div className="app-home__actions">
          <button type="button" className="app-home__button" onClick={onNew}>
            {PlusIcon} New
          </button>
          <button
            type="button"
            className="app-home__button app-home__button--secondary"
            onClick={onImport}
          >
            {LoadIcon} Import
          </button>
        </div>
      </div>
      <input
        className="app-home__search"
        type="search"
        value={query}
        placeholder="Search drawings"
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </header>
  );
};
