import chalk from "chalk";

const levels = ["SILENT", "ERROR", "WARN", "INFO", "DEBUG"] as const;
type Level = (typeof levels)[number];

const levelWeight: Record<Level, number> = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

let current: Level = "INFO";

function normalizeLevel(level?: string): Level {
  const candidate = level?.trim().toUpperCase() ?? "INFO";
  return (levels as readonly string[]).includes(candidate) ? (candidate as Level) : "INFO";
}

function canLog(level: Level): boolean {
  return levelWeight[current] >= levelWeight[level];
}

export const logger = {
  setLevel(level?: string): void {
    current = normalizeLevel(level);
  },
  info(message: string): void {
    if (canLog("INFO")) {
      console.log(chalk.blue("[INFO]"), message);
    }
  },
  ok(message: string): void {
    if (canLog("INFO")) {
      console.log(chalk.green("[OK]"), message);
    }
  },
  warn(message: string): void {
    if (canLog("WARN")) {
      console.error(chalk.yellow("[WARN]"), message);
    }
  },
  error(message: string): void {
    if (canLog("ERROR")) {
      console.error(chalk.red("[ERROR]"), message);
    }
  },
  debug(message: string): void {
    if (canLog("DEBUG")) {
      console.log(chalk.magenta("[DEBUG]"), message);
    }
  },
};
