# Taste

## Tooling

- Prefers pnpm as the package manager; avoid yarn (remove yarn.lock/workspace, convert scripts, CI and Tauri commands to pnpm). Confidence: 0.9

## Styling

- Prefers Tailwind CSS utility classes over Sass/SCSS, with styles co-located inside each component rather than in separate .scss files. Confidence: 0.8

## Architecture & Data Persistence

- For app data persistence, prefers a real embedded database (e.g. SQLite via tauri-plugin-sql) that works across mobile and desktop over plain JSON files. Confidence: 0.85
- Prefers keeping Tauri projects as a single frontend plus the Tauri shell — no monorepo/workspace packages unless genuinely required. Confidence: 0.75
