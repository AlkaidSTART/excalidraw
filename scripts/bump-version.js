#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const tauriConfigPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");
const cargoLockPath = path.join(root, "src-tauri", "Cargo.lock");
const androidPropertiesPath = path.join(
  root,
  "src-tauri",
  "gen",
  "android",
  "app",
  "tauri.properties",
);

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const BUMP_TYPES = new Set(["patch", "minor", "major"]);

const usage = `Usage: node scripts/bump-version.js [patch|minor|major|<version>] [--base <version>] [--set <version>] [--dry-run]

Examples:
  node scripts/bump-version.js patch
  node scripts/bump-version.js minor --base 1.2.3
  node scripts/bump-version.js --set 2.0.0`;

const fail = (message) => {
  process.stderr.write(`bump-version: ${message}\n`);
  process.exit(1);
};

const cleanVersion = (version) =>
  String(version ?? "")
    .trim()
    .replace(/^v/i, "");

const parseArgs = (argv) => {
  const options = { bump: null, set: null, base: null, dryRun: false };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    } else if (arg === "--set" || arg === "-s") {
      options.set = argv[++index];
    } else if (arg === "--base") {
      options.base = argv[++index];
    } else if (arg === "--bump" || arg === "-b") {
      options.bump = argv[++index];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (BUMP_TYPES.has(arg)) {
      options.bump = arg;
    } else if (SEMVER.test(cleanVersion(arg))) {
      options.set = cleanVersion(arg);
    } else {
      fail(`unknown argument "${arg}"\n\n${usage}`);
    }
  }

  if (options.bump && !BUMP_TYPES.has(options.bump)) {
    fail(`unknown bump type "${options.bump}"`);
  }

  return options;
};

const bumpVersion = (version, type) => {
  const match = SEMVER.exec(cleanVersion(version));
  if (!match) {
    fail(`cannot bump "${version}"; expected a semver x.y.z`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      fail(`unknown bump type "${type}"`);
  }
};

const readPackageVersion = () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return cleanVersion(packageJson.version);
};

const replaceFile = (file, pattern, replacement, label) => {
  const content = fs.readFileSync(file, "utf8");
  const updated = content.replace(pattern, replacement);
  if (updated === content) {
    fail(`could not update ${label} in ${path.relative(root, file)}`);
  }
  return updated;
};

const writeJsonVersion = (file, version) => {
  const updated = replaceFile(
    file,
    /("version"\s*:\s*")[^"]*(")/,
    `$1${version}$2`,
    "version",
  );
  fs.writeFileSync(file, updated);
};

const writeCargoTomlVersion = (version) => {
  const updated = replaceFile(
    cargoTomlPath,
    /(\[package\][\s\S]*?^version\s*=\s*")[^"]*(")/m,
    `$1${version}$2`,
    "[package] version",
  );
  fs.writeFileSync(cargoTomlPath, updated);
};

const writeCargoLockVersion = (version) => {
  if (!fs.existsSync(cargoLockPath)) {
    return;
  }

  const updated = replaceFile(
    cargoLockPath,
    /(\[\[package\]\]\nname = "excalidraw"\nversion = ")[^"]*(")/,
    `$1${version}$2`,
    "excalidraw version",
  );
  fs.writeFileSync(cargoLockPath, updated);
};

const writeAndroidProperties = (version) => {
  if (!fs.existsSync(androidPropertiesPath)) {
    return;
  }

  // Matches Tauri's default Android version code derivation.
  const [major, minor, patch] = version.split(".").map(Number);
  const versionCode = major * 1_000_000 + minor * 1_000 + patch;

  const content = fs.readFileSync(androidPropertiesPath, "utf8");
  const updated = content
    .replace(/(tauri\.android\.versionName=).*/, `$1${version}`)
    .replace(/(tauri\.android\.versionCode=)\d+/, `$1${versionCode}`);

  fs.writeFileSync(androidPropertiesPath, updated);
};

const applyVersion = (version) => {
  writeJsonVersion(packageJsonPath, version);
  writeJsonVersion(tauriConfigPath, version);
  writeCargoTomlVersion(version);
  writeCargoLockVersion(version);
  writeAndroidProperties(version);
};

const options = parseArgs(process.argv.slice(2));
const base = cleanVersion(options.base) || readPackageVersion();

if (!SEMVER.test(base)) {
  fail(`cannot use "${base}" as the base version; expected a semver x.y.z`);
}

const nextVersion = options.set
  ? cleanVersion(options.set)
  : bumpVersion(base, options.bump || "patch");

if (!SEMVER.test(nextVersion)) {
  fail(`invalid version "${nextVersion}"; expected a semver x.y.z`);
}

if (!options.dryRun) {
  applyVersion(nextVersion);
}

// stdout is reserved for the resolved version so CI can capture it.
process.stdout.write(`${nextVersion}\n`);
