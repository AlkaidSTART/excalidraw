import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgrPlugin from "vite-plugin-svgr";
import checker from "vite-plugin-checker";

const readPackageVersion = () =>
  JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"),
  ).version as string;

const resolveAppVersion = (envVars: Record<string, string>) => {
  const override = envVars.VITE_APP_VERSION?.trim();
  if (override) {
    return override;
  }

  // Tagged CI builds (v1.2.3) must report the release version, otherwise the
  // update check would keep prompting users who already installed it.
  const refName = process.env.GITHUB_REF_NAME?.trim();
  if (refName?.startsWith("v")) {
    return refName.slice(1);
  }

  try {
    const tag = execSync("git describe --tags --exact-match HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (tag.startsWith("v")) {
      return tag.slice(1);
    }
  } catch {
    // not on a tag — fall back to the package version
  }

  return readPackageVersion();
};

export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode, path.resolve(__dirname, ".."));

  return {
    root: __dirname,
    define: {
      __APP_VERSION__: JSON.stringify(resolveAppVersion(envVars)),
    },
    server: {
      port: Number(envVars.VITE_APP_PORT || 3000),
      open: false,
    },
    envDir: "../",
    resolve: {
      alias: [
        {
          find: /^@excalidraw\/common$/,
          replacement: path.resolve(__dirname, "./lib/common/src/index.ts"),
        },
        {
          find: /^@excalidraw\/common\/(.*?)/,
          replacement: path.resolve(__dirname, "./lib/common/src/$1"),
        },
        {
          find: /^@excalidraw\/element$/,
          replacement: path.resolve(__dirname, "./lib/element/src/index.ts"),
        },
        {
          find: /^@excalidraw\/element\/(.*?)/,
          replacement: path.resolve(__dirname, "./lib/element/src/$1"),
        },
        {
          find: /^@excalidraw\/excalidraw$/,
          replacement: path.resolve(__dirname, "./lib/excalidraw/index.tsx"),
        },
        {
          find: /^@excalidraw\/excalidraw\/(.*?)/,
          replacement: path.resolve(__dirname, "./lib/excalidraw/$1"),
        },
        {
          find: /^@excalidraw\/math$/,
          replacement: path.resolve(__dirname, "./lib/math/src/index.ts"),
        },
        {
          find: /^@excalidraw\/math\/(.*?)/,
          replacement: path.resolve(__dirname, "./lib/math/src/$1"),
        },
        {
          find: /^@excalidraw\/utils$/,
          replacement: path.resolve(__dirname, "./lib/utils/src/index.ts"),
        },
        {
          find: /^@excalidraw\/utils\/(.*?)/,
          replacement: path.resolve(__dirname, "./lib/utils/src/$1"),
        },
        {
          find: /^@excalidraw\/fractional-indexing$/,
          replacement: path.resolve(
            __dirname,
            "./lib/fractional-indexing/src/index.ts",
          ),
        },
        {
          find: /^@excalidraw\/laser-pointer$/,
          replacement: path.resolve(
            __dirname,
            "./lib/laser-pointer/src/index.ts",
          ),
        },
      ],
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          assetFileNames(chunkInfo) {
            if (chunkInfo?.name?.endsWith(".woff2")) {
              const family = chunkInfo.name.split("-")[0];
              return `fonts/${family}/[name][extname]`;
            }

            return "assets/[name]-[hash][extname]";
          },
          manualChunks(id) {
            if (
              id === "\0vite/preload-helper.js" ||
              id === "\0commonjsHelpers.js"
            ) {
              return "bundler-helpers";
            }

            if (
              id.includes("excalidraw-app/lib/excalidraw/locales") &&
              id.match(/en.json|percentages.json/) === null
            ) {
              const index = id.indexOf("locales/");
              return `locales/${id.substring(index + 8)}`;
            }

            if (id.includes("@codemirror/") || id.includes("@lezer/")) {
              return "codemirror.chunk";
            }
          },
        },
      },
      sourcemap: true,
      assetsInlineLimit: 0,
    },
    plugins: [
      react(),
      checker({
        typescript: true,
        enableBuild: false,
        eslint:
          envVars.VITE_APP_ENABLE_ESLINT === "false"
            ? undefined
            : {
                lintCommand:
                  'eslint --ignore-path ../.eslintignore "./**/*.{js,ts,tsx}"',
              },
        overlay: {
          initialIsOpen: envVars.VITE_APP_COLLAPSE_OVERLAY === "false",
          badgeStyle: "margin-bottom: 4rem; margin-left: 1rem",
        },
      }),
      svgrPlugin(),
    ],
    publicDir: false,
  };
});
