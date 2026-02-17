import { logger } from "./logger";
import { spawn } from "node:child_process";

function runShell(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const shell = process.env.SHELL || "/bin/sh";
    const shellName = shell.split("/").at(-1) ?? "sh";
    const args = shellName === "bash" || shellName === "zsh" || shellName === "fish" ? ["-lc", command] : ["-c", command];

    const child = spawn(shell, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`command failed with exit code ${code}`));
    });
  });
}

export class TerminalService {
  async runCommands(hookName: string, commands: string[]): Promise<void> {
    for (let i = 0; i < commands.length; i += 1) {
      const command = commands[i] as string;
      logger.debug(`running ${hookName} command #${i + 1}: ${command}`);
      await runShell(command);
    }
  }

  async runForeground(command?: string): Promise<void> {
    if (!command?.trim()) {
      return;
    }
    await runShell(command);
  }
}
