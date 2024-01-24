import * as assert from "assert";
import merge from "deepmerge";
import fs from "fs/promises";

import { exec, fileExists, readJSON, writeJSON } from "./utils.mjs";

const DEV_DEPENDENCIES = ["@avicenne-studio/eslint-config"];
const CONFIG_FILE = ".eslintrc.json";
const JSON_CONFIG = {
  extends: "@avicenne-studio",
};
const SCRIPTS = {
  lint: "eslint .",
  "lint:fix": "eslint --fix .",
};

const getExtraneousPackageConfigTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  if (!("eslint" in manifest)) return;

  return () => {
    throw new Error(
      `Extraneous ESLint config found in package.json. Delete it to continue.`,
    );
  };
};

const getExtraneousConfigsTasks = async (): Promise<Task | undefined> => {
  for (const file of await fs.readdir(".")) {
    if (file === CONFIG_FILE || !file.startsWith(".eslintrc")) continue;

    return () => {
      throw new Error(
        `Extraneous ESLint config file found: ${file}. Delete it to continue.`,
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

  const updatedConfig = merge(previousConfig, JSON_CONFIG);

  try {
    assert.deepEqual(updatedConfig, previousConfig);
    return;
  } catch (e) {
    if (!(e instanceof assert.AssertionError)) throw e;
  }

  return async () => await writeJSON(CONFIG_FILE, updatedConfig);
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
