import path from "node:path";
import os from "node:os";
import { realpath } from "node:fs/promises";

export function workforgeConfigDir(): string {
  const cfg = process.env.XDG_CONFIG_HOME;
  if (cfg && cfg.trim() !== "") {
    return path.join(cfg, "workforge");
  }
  return path.join(os.homedir(), ".config", "workforge");
}

export function registryPath(): string {
  return path.join(workforgeConfigDir(), "workforge.json");
}

export async function normalizePath(targetPath: string): Promise<string> {
  if (!targetPath.trim()) {
    throw new Error("path is empty");
  }
  const abs = path.resolve(targetPath);
  try {
    return await realpath(abs);
  } catch {
    return abs;
  }
}
