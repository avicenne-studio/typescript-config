import inquirer from "inquirer";

import eslint from "./eslint.mjs";
import prettier from "./prettier.mjs";

if (process.env.npm_config_local_prefix !== undefined)
  process.chdir(process.env.npm_config_local_prefix);

const [eslintTasks, prettierTasks] = await Promise.all([eslint(), prettier()]);

const prompts = [];

if (eslintTasks.length !== 0) {
  prompts.push({
    name: "eslint",
    type: "confirm",
    message: "Would you like to install ESLint?",
    suffix: "",
  });
}

if (prettierTasks.length !== 0) {
  prompts.push({
    name: "prettier",
    type: "confirm",
    message: "Would you like to install Prettier?",
    suffix: "",
  });
}

// TODO: husky
// TODO: GitHub Actions
// TODO: PR templates

if (prompts.length === 0) process.exit();

if (
  !process.stdin.isTTY ||
  ((process.env.npm_command === "install" ||
    process.env.npm_command === "link") &&
    process.env.npm_config_progress !== "")
) {
  throw new Error(
    "@avicenne-studio/typescript-config requires that you run NPM scripts with the following flags: --foreground-scripts --no-progress",
  );
}

const answers = await inquirer.prompt(prompts);

await Promise.all([
  ...(answers.eslint ? eslintTasks.map(async (task) => await task()) : []),
  ...(answers.prettier ? prettierTasks.map(async (task) => await task()) : []),
]);
