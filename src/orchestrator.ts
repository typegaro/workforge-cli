import fs from "fs-extra";
import path from "node:path";
import { Effect } from "effect";
import { ConfigService } from "./config-service";
import { HookType, CONFIG_FILE_NAME } from "./domain";
import { GitService } from "./git-service";
import { logger } from "./logger";
import { ProjectService } from "./project-service";
import { repoUrlToName, worktreeLeafName } from "./repo";
import { TerminalService } from "./terminal-service";
import { TmuxService } from "./tmux-service";

function resolveProjectName(projectPath: string, projectName?: string): string {
  if (projectName?.trim()) {
    return projectName.trim();
  }
  return path.basename(path.resolve(projectPath));
}

export class Orchestrator {
  readonly projects = new ProjectService();
  readonly config = new ConfigService();
  readonly git = new GitService();
  readonly terminal = new TerminalService();
  readonly tmux = new TmuxService();

  initProject(url: string | undefined, gwt: boolean): Effect.Effect<void, Error> {
    if (!url?.trim()) {
      return Effect.tryPromise({
        try: () => this.initLocal(gwt),
        catch: (error) => new Error(String(error)),
      });
    }

    return Effect.tryPromise({
      try: () => this.initFromUrl(url, gwt),
      catch: (error) => new Error(String(error)),
    });
  }

  loadProject(projectPath: string, gwt: boolean, profile?: string, projectName?: string): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        await this.projects.enterProjectDir(projectPath);

        const cfg = await Effect.runPromise(this.config.loadConfig(projectPath, gwt));
        const currentProfile = this.config.selectProfile(cfg, profile);
        const tpl = cfg[currentProfile];
        if (!tpl) {
          throw new Error(`profile \"${currentProfile}\" not found`);
        }

        logger.setLevel(tpl?.log_level);

        const name = resolveProjectName(projectPath, projectName);
        await this.terminal.runCommands(HookType.OnLoad, tpl.hooks?.on_load ?? []);

        if (!tpl.tmux) {
          await this.terminal.runCommands(HookType.OnShellRunIn, tpl.hooks?.on_shell_run_in ?? []);
          await this.terminal.runForeground(tpl.foreground);
          await this.terminal.runCommands(HookType.OnShellRunOut, tpl.hooks?.on_shell_run_out ?? []);
          return;
        }

        const sessionBase = tpl.tmux.session_name
          ? tpl.tmux.session_name
          : gwt
            ? path.basename(path.dirname(projectPath))
            : path.basename(projectPath);

        let sessionName = sessionBase;
        try {
          const branch = await this.git.currentBranch();
          if (branch.trim()) {
            sessionName = `${sessionBase}/${branch}`;
          }
        } catch {
          logger.debug(`unable to resolve current branch for ${name}`);
        }

        await this.terminal.runCommands(HookType.OnShellRunIn, tpl.hooks?.on_shell_run_in ?? []);
        await this.tmux.newSession(sessionName, tpl.tmux.attach, tpl.tmux.windows ?? ["$SHELL"]);
        await this.terminal.runCommands(HookType.OnShellRunOut, tpl.hooks?.on_shell_run_out ?? []);
      },
      catch: (error) => new Error(String(error)),
    });
  }

  closeProject(name: string, profile?: string): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const entry = await Effect.runPromise(this.projects.findProjectEntry(name));
        const sessionName = name;
        const exists = await this.tmux.hasSession(sessionName);
        if (!exists) {
          throw new Error(`no tmux session found for \"${name}\"`);
        }

        const cfg = await Effect.runPromise(this.config.loadConfig(entry.project.path, entry.isGwt));
        const currentProfile = this.config.selectProfile(cfg, profile);
        await this.terminal.runCommands(HookType.OnClose, cfg[currentProfile]?.hooks?.on_close ?? []);

        await this.tmux.killSession(sessionName);
        logger.ok(`closed project ${name}`);
      },
      catch: (error) => new Error(String(error)),
    });
  }

  removeWorktree(name: string): Effect.Effect<string, Error> {
    return Effect.tryPromise({
      try: async () => {
        const leafPath = await this.projects.resolveWorktreeLeaf(name);

        const cfg = await Effect.runPromise(this.config.loadConfig(leafPath, true));
        const profile = this.config.selectProfile(cfg);
        await this.terminal.runCommands(HookType.OnDelete, cfg[profile]?.hooks?.on_delete ?? []);

        await this.git.removeWorktree(leafPath);
        return leafPath;
      },
      catch: (error) => new Error(String(error)),
    });
  }

  private async initFromUrl(url: string, gwt: boolean): Promise<void> {
    const repoName = repoUrlToName(url);
    let clonePath = repoName;
    const projectPath = gwt ? "." : repoName;

    const entries = await fs.readdir(process.cwd());
    if (entries.length > 0) {
      if (gwt) {
        logger.warn("directory not empty, aborting");
        return;
      }

      if (entries.includes(CONFIG_FILE_NAME)) {
        logger.warn("this is already a Workforge directory");
        return;
      }
    }

    await this.git.clone(url, clonePath);

    if (gwt) {
      const branch = await this.git.currentBranch(clonePath);
      const branchDir = worktreeLeafName(branch);

      if (branchDir && branchDir !== clonePath) {
        await fs.move(clonePath, branchDir);
        clonePath = branchDir;
      }

      const sourceConfig = path.join(clonePath, CONFIG_FILE_NAME);
      if (await fs.pathExists(sourceConfig)) {
        await fs.copy(sourceConfig, CONFIG_FILE_NAME, { overwrite: true });
      } else {
        await this.config.writeExampleConfig();
      }
    } else {
      await this.config.writeExampleConfig(clonePath);
    }

    await Effect.runPromise(this.projects.addProject(repoName, gwt, projectPath));
  }

  private async initLocal(gwt: boolean): Promise<void> {
    const cwd = process.cwd();
    const repoName = path.basename(cwd);
    await this.config.writeExampleConfig();
    await Effect.runPromise(this.projects.addProject(repoName, gwt));
  }
}
