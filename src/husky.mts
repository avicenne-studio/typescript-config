import merge from "deepmerge";
import fs from "fs/promises";
import inquirer from "inquirer";
import path from "path";

import {
  exec,
  fileExists,
  readFile,
  readJSON,
  writeFile,
  writeJSON,
} from "./utils.mjs";

import PRE_COMMIT_HOOK from "./.husky/pre-commit.json" assert { type: "json" };

const DEV_DEPENDENCIES = ["husky"];
const SCRIPTS = {
  prepare: "husky",
};
const HOOKS = {
  "pre-commit": `${PRE_COMMIT_HOOK.join("\n")}\n`,
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

const setupHooksTask = async (): Promise<Task | undefined> => {
  const missing = (
    await Promise.all(
      Object.entries(HOOKS).map(async ([hook, cmd]) =>
        (await readFile(path.join(".husky", hook))) !== cmd
          ? [[hook, cmd] as const]
          : [],
      ),
    )
  ).flat();
  if (missing.length === 0) return;

  return async () => {
    const hooks = Object.fromEntries(missing);

    for (const hook of Object.keys(hooks)) {
      if (!(await fileExists(path.join(".husky", hook)))) continue;

      const { answer } = await inquirer.prompt({
        answer: {
          type: "confirm",
          message: `Overwrite existing Git hook ${hook}?`,
          suffix: "",
        },
      });

      if (answer) continue;

      delete hooks[hook];
    }

    await fs.mkdir(".husky", {
      recursive: true,
    });

    for (const [hook, cmd] of Object.entries(hooks))
      await writeFile(path.join(".husky", hook), cmd, "none");
  };
};

export default async () => {
  return (
    await Promise.all([
      installDevDependenciesTask(),
      setupScriptsTask(),
      setupHooksTask(),
    ])
  ).filter((task): task is Task => task !== undefined);
};
