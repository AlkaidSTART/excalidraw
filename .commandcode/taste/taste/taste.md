# Taste
- Prefers pnpm as the package manager; avoid yarn (remove yarn.lock/workspace, convert scripts, CI and Tauri commands to pnpm). Confidence: 0.9
- Prefers Tailwind CSS utility classes over Sass/SCSS, with styles co-located inside each component rather than in separate .scss files. Confidence: 0.8
- When forking/rebranding a product, wants a clean UI with the upstream vendor's marketing stripped out: no free-trial banners, sign-up/sign-in prompts, upsell buttons, or social/community (Discord, X, blog, YouTube) links. Confidence: 0.75
- When rebranding, wants every default framework/vendor app icon replaced by the product's own logo — not just the top-level desktop icons but also the mobile/generated native project resources (e.g. Tauri's default icon in `gen/android/.../res`). Confidence: 0.7
- Prefers version management automated in CI rather than run by hand: pushing to master should auto-bump the version, tag it, and publish the release, instead of relying on local bump scripts. Confidence: 0.6
- For app data persistence, prefers a real embedded database (e.g. SQLite via tauri-plugin-sql) that works across mobile and desktop over plain JSON files. Confidence: 0.85
- Prefers keeping Tauri projects as a single frontend plus the Tauri shell — no monorepo/workspace packages unless genuinely required. Confidence: 0.75
