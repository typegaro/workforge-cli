import path from "node:path";
import { Command } from "commander";
import { Effect } from "effect";
import { logger } from "./logger";
import { Orchestrator } from "./orchestrator";

const orchestrator = new Orchestrator();

async function run(command: Effect.Effect<unknown, Error>): Promise<void> {
  try {
    await Effect.runPromise(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exitCode = 1;
  }
}

export async function execute(argv: string[]): Promise<void> {
  const app = new Command();

  app.name("wf").description("Workforge in TypeScript/Bun");

  app
    .command("init")
    .argument("[url]", "repository url")
    .option("-t, --gwt", "register as git worktree root", false)
    .action(async (url: string | undefined, options: { gwt: boolean }) => {
      await run(orchestrator.initProject(url, options.gwt));
    });

  app
    .command("load")
    .argument("[dir]", "project directory")
    .option("-p, --profile <profile>", "profile name")
    .action(async (dir: string | undefined, options: { profile?: string }) => {
      const base = "..";
      const targetPath = dir ? path.join(base, dir) : base;
      await run(orchestrator.loadProject(targetPath, false, options.profile));
    });

  app
    .command("list")
    .alias("ls")
    .action(async () => {
      await run(
        Effect.gen(function* () {
          const entries = yield* orchestrator.projects.sortedProjectEntries();
          for (const entry of entries) {
            console.log(entry.project.name);
          }
        }),
      );
    });

  app
    .command("open")
    .argument("<name>", "project name")
    .option("-p, --profile <profile>", "profile name")
    .action(async (name: string, options: { profile?: string }) => {
      await run(
        Effect.gen(function* () {
          const entry = yield* orchestrator.projects.findProjectEntry(name);
          yield* orchestrator.loadProject(entry.project.path, entry.isGwt, options.profile, entry.project.name);
        }),
      );
    });

  app
    .command("close")
    .argument("<name>", "project name")
    .option("-p, --profile <profile>", "profile name")
    .action(async (name: string, options: { profile?: string }) => {
      await run(orchestrator.closeProject(name, options.profile));
    });

  app
    .command("add")
    .argument("<first>", "branch or worktree/project")
    .argument("[branch]", "branch when first argument is project")
    .option("-c, --create-branch", "create branch if missing", false)
    .option("--base <base>", "base branch", "main")
    .action(
      async (
        first: string,
        branch: string | undefined,
        options: { createBranch: boolean; base: string },
      ) => {
        await run(
          Effect.tryPromise({
            try: async () => {
              let worktreePath = ".";
              let targetBranch = first;

              if (branch) {
                const maybe = await Effect.runPromiseExit(orchestrator.projects.findProjectEntry(first));
                if (maybe._tag === "Success") {
                  worktreePath = maybe.value.project.path;
                } else {
                  worktreePath = first;
                }
                targetBranch = branch;
              }

              await orchestrator.git.addWorktree(
                worktreePath,
                targetBranch,
                options.createBranch,
                options.base,
              );
            },
            catch: (error) => new Error(String(error)),
          }),
        );
      },
    );

  app
    .command("rm")
    .argument("<name>", "worktree name")
    .action(async (name: string) => {
      await run(orchestrator.removeWorktree(name));
    });

  await app.parseAsync(argv);
}
