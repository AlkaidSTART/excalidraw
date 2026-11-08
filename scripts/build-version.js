#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const versionFile = path.join("build", "version.json");

const versionDate = (date) => date.toISOString().replace(".000", "");

const commitHash = () => {
  try {
    return require("child_process")
      .execSync("git rev-parse --short HEAD")
      .toString()
      .trim();
  } catch {
    return "none";
  }
};

const commitDate = (hash) => {
  try {
    const unix = require("child_process")
      .execSync(`git show -s --format=%ct ${hash}`)
      .toString()
      .trim();
    const date = new Date(parseInt(unix) * 1000);
    return versionDate(date);
  } catch {
    return versionDate(new Date());
  }
};

const getFullVersion = () => {
  const hash = commitHash();
  return `${commitDate(hash)}-${hash}`;
};

const data = JSON.stringify(
  {
    version: getFullVersion(),
  },
  undefined,
  2,
);

fs.writeFileSync(versionFile, data);
