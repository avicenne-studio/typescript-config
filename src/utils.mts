import { execSync } from "child_process";
import fs from "fs/promises";
import prettier, { BuiltInParserName, LiteralUnion } from "prettier";

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

export const readFile = async (path: string) => {
  try {
    return await fs.readFile(path, "utf8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    if ("code" in e && e.code === "ENOENT") return null;
    throw e;
  }
};

export const readJSON = async (path: string) => {
  const text = await readFile(path);
  if (text === null) return null;
  return JSON.parse(text);
};

export const writeFile = async (
  filepath: string,
  data: string,
  parser?: LiteralUnion<BuiltInParserName>,
) => {
  if (parser !== "none") {
    data = await prettier.format(data, {
      filepath,
      parser,
    });
  }

  await fs.writeFile(filepath, data);
};

export const writeJSON = async (filepath: string, json: unknown) => {
  await writeFile(filepath, JSON.stringify(json, null, "  "), "json");
};

export const exec = async (cmd: string) => {
  // TODO: Make async
  return execSync(cmd, { stdio: "inherit" }).toString();
};
