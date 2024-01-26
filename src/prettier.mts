import merge from "deepmerge";
import fs from "fs/promises";
import inquirer from "inquirer";

import { exec, readJSON, writeJSON } from "./utils.mjs";

import JSON_CONFIG from "./.prettierrc.json" assert { type: "json" };

const DEV_DEPENDENCIES = ["@avicenne-studio/prettier-config"];
const CONFIG_FILE = ".prettierrc.json";
const SCRIPTS = {
  format: "prettier --write .",
  "format:check": "prettier --check .",
};

const getExtraneousConfigFilesTasks = async (): Promise<Task | undefined> => {
  const files = (await fs.readdir(".")).filter(
    (file) => file !== CONFIG_FILE && file.startsWith(".prettierrc"),
  );

  if (files.length === 0) return;

  return async () => {
    for (const file of files) {
      const { answer } = await inquirer.prompt({
        answer: {
          type: "confirm",
          message: `Delete extraneous Prettier config file ${file}?`,
          suffix: "",
        },
      });

      if (!answer) return;

      await fs.unlink(file);
    }
  };
};

const getExtraneousPackageConfigTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  if (!manifest?.prettier) return;

  return async () => {
    const { answer } = await inquirer.prompt({
      answer: {
        type: "confirm",
        message: "Delete extraneous Prettier config found in package.json?",
        suffix: "",
      },
    });

    if (!answer) return;

    await writeJSON(
      "package.json",
      merge(await readJSON("package.json"), {
        prettier: undefined,
      }),
    );
  };
};

const installDevDependenciesTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  const missing = DEV_DEPENDENCIES.filter(
    (packageName) => manifest.devDependencies?.[packageName] === undefined,
  );
  if (missing.length === 0) return;

  const cmd = `npm install --save-dev ${missing.map((packageName) => JSON.stringify(packageName)).join(" ")}`;
  return async () => {
    await exec(cmd);
  };
};

const setupScriptsTask = async (): Promise<Task | undefined> => {
  const manifest = await readJSON("package.json");

  const missing = Object.entries(SCRIPTS).filter(
    ([script, cmd]) => manifest.scripts?.[script] !== cmd,
  );
  if (missing.length === 0) return;

  return async () => {
    const scripts = Object.fromEntries(missing);

    for (const script of Object.keys(scripts)) {
      if (manifest.scripts?.[script] === undefined) continue;

      const { answer } = await inquirer.prompt({
        answer: {
          type: "confirm",
          message: `Overwrite existing NPM script ${script}?`,
          suffix: "",
        },
      });

      if (answer) continue;

      delete scripts[script];
    }

    await writeJSON(
      "package.json",
      merge(await readJSON("package.json"), {
        scripts,
      }),
    );
  };
};

const createConfigTask = async (): Promise<Task | undefined> => {
  const previousConfig = await readJSON(CONFIG_FILE);

  if (previousConfig === JSON_CONFIG) return;

  return async () => await writeJSON(CONFIG_FILE, JSON_CONFIG);
};

export default async () => {
  return (
    await Promise.all([
      getExtraneousConfigFilesTasks(),
      getExtraneousPackageConfigTask(),
      installDevDependenciesTask(),
      setupScriptsTask(),
      createConfigTask(),
    ])
  ).filter((task): task is Task => task !== undefined);
};
