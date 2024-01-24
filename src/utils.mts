import { execSync } from "child_process";
import fs from "fs/promises";
import prettier from "prettier";

export const fileExists = async (path: string) => {
  try {
    await fs.stat(path);
    return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if ("code" in e && e.code === "ENOENT") return false;
    throw e;
  }
};

export const readJSON = async (path: string) => {
  return JSON.parse(await fs.readFile(path, "utf8"));
};

export const writeJSON = async (path: string, json: unknown) => {
  await fs.writeFile(
    path,
    await prettier.format(JSON.stringify(json, null, "  "), {
      parser: "json",
    }),
  );
};

export const exec = async (cmd: string) => {
  execSync(cmd, {
    stdio: "inherit",
  });
};
