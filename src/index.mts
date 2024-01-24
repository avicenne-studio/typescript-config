import inquirer from "inquirer";

import eslint from "./eslint.mjs";

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

if (process.env.npm_config_local_prefix !== undefined)
  process.chdir(process.env.npm_config_local_prefix);

const [eslintTasks] = await Promise.all([eslint()]);

const prompts = [];

if (eslintTasks.length !== 0) {
  prompts.push({
    name: "eslint",
    type: "confirm",
    message: "Would you like to install ESLint?",
    suffix: "",
  });
}

// TODO: Prettier
// TODO: husky
// TODO: GitHub Actions
// TODO: PR templates

if (prompts.length === 0) process.exit();

const answers = await inquirer.prompt(prompts);

await Promise.all([
  ...(answers.eslint ? eslintTasks.map(async (task) => await task()) : []),
]);
