import merge from "deepmerge";
import fs from "fs/promises";

import { exec, fileExists, readJSON, writeJSON } from "./utils.mjs";

const DEV_DEPENDENCIES = ["@avicenne-studio/prettier-config"];
const CONFIG_FILE = ".prettierrc.json";
const JSON_CONFIG = "@avicenne-studio/prettier-config";
const SCRIPTS = {
  format: "prettier --write .",
  "format:check": "prettier --check .",
};

const getExtraneousPackageConfigTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  if (!("prettier" in manifest)) return;

  return () => {
    throw new Error(
      `Extraneous Prettier config found in package.json. Delete it to continue.`,
    );
  };
};

const getExtraneousConfigsTasks = async (): Promise<Task | undefined> => {
  for (const file of await fs.readdir(".")) {
    if (file === CONFIG_FILE || !file.startsWith(".prettierrc")) continue;

    return () => {
      throw new Error(
        `Extraneous Prettier config file found: ${file}. Delete it to continue.`,
      );
    };
  }

  return await getExtraneousPackageConfigTask();
};

const installDevDependenciesTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  const missing = DEV_DEPENDENCIES.filter(
    (packageName) => !(packageName in manifest.devDependencies),
  );
  if (missing.length === 0) return;

  const cmd = `npm install --save-dev ${missing.map((packageName) => JSON.stringify(packageName)).join(" ")}`;
  return async () => await exec(cmd);
};

const setupScriptsTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  const missing = Object.entries(SCRIPTS).filter(
    ([script, cmd]) => manifest.scripts?.[script] !== cmd,
  );
  if (missing.length === 0) return;

  return async () => {
    await writeJSON(
      "package.json",
      merge(await readJSON("package.json"), {
        scripts: Object.fromEntries(missing),
      }),
    );
  };
};

const updateConfigTask = async (): Promise<Task | undefined> => {
  const previousConfig = await readJSON(CONFIG_FILE);

  if (previousConfig === JSON_CONFIG) return;

  return async () => await writeJSON(CONFIG_FILE, JSON_CONFIG);
};

const createConfigTask = async (): Promise<Task | undefined> => {
  if (await fileExists(CONFIG_FILE)) return await updateConfigTask();

  return async () => {
    await writeJSON(CONFIG_FILE, JSON_CONFIG);
  };
};

export default async () => {
  return (
    await Promise.all([
      getExtraneousConfigsTasks(),
      installDevDependenciesTask(),
      setupScriptsTask(),
      createConfigTask(),
    ])
  ).filter((task): task is Task => task !== undefined);
};
