import fs from "fs-extra";
import path from "node:path";
import { Effect } from "effect";
import type { Project, ProjectEntry, Projects } from "./domain";
import { ProjectRegistryService } from "./project-registry";
import { normalizePath } from "./paths";

function isGwtLeaf(projectPath: string): boolean {
  try {
    const stat = fs.statSync(path.join(projectPath, ".git"));
    return !stat.isDirectory();
  } catch {
    return false;
  }
}

export class ProjectService {
  constructor(private readonly registry = new ProjectRegistryService()) {}

  private listProjectsExpanded(): Effect.Effect<Map<string, Project>, Error, never> {
    return Effect.gen(this, function* () {
      const base = yield* this.registry.load();
      const out = new Map<string, Project>();

      for (const [name, project] of Object.entries(base)) {
        if (!project.git_work_tree) {
          out.set(name, { ...project, name });
          continue;
        }

        if (isGwtLeaf(project.path)) {
          out.set(name, { ...project, name });
          continue;
        }

        const entries = yield* Effect.tryPromise({
          try: () => fs.readdir(project.path, { withFileTypes: true }),
          catch: (error) => new Error(`error reading GWT path ${project.path}: ${String(error)}`),
        });

        for (const entry of entries) {
          if (!entry.isDirectory()) {
            continue;
          }
          const subName = `${name}/${entry.name}`;
          out.set(subName, {
            name: subName,
            path: path.join(project.path, entry.name),
            git_work_tree: false,
            tags: [],
          });
        }
      }

      return out;
    });
  }

  sortedProjectEntries(): Effect.Effect<ProjectEntry[], Error, never> {
    return Effect.gen(this, function* () {
      const expanded = yield* this.listProjectsExpanded();
      return [...expanded.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, project]) => ({ project: { ...project, name }, isGwt: name.includes("/") || isGwtLeaf(project.path) }));
    });
  }

  findProjectEntry(name: string): Effect.Effect<ProjectEntry, Error, never> {
    return Effect.gen(this, function* () {
      if (!name.trim()) {
        return yield* Effect.fail(new Error("project name cannot be empty"));
      }

      const expanded = yield* this.listProjectsExpanded();
      const project = expanded.get(name);
      if (!project) {
        return yield* Effect.fail(new Error(`project \"${name}\" not found`));
      }

      return {
        project: { ...project, name },
        isGwt: name.includes("/") || isGwtLeaf(project.path),
      };
    });
  }

  addProject(name: string, gwt: boolean, projectPath?: string): Effect.Effect<void, Error, never> {
    return Effect.gen(this, function* () {
      const resolvedPath = yield* Effect.tryPromise({
        try: () => normalizePath(projectPath ?? process.cwd()),
        catch: (error) => new Error(`failed to resolve project path: ${String(error)}`),
      });

      const projects = yield* this.registry.load().pipe(Effect.orElseSucceed(() => ({} as Projects)));
      projects[name] = {
        name,
        path: resolvedPath,
        git_work_tree: gwt,
        tags: projects[name]?.tags ?? [],
      };

      yield* this.registry.save(projects);
    });
  }

  async enterProjectDir(projectPath: string): Promise<void> {
    process.chdir(projectPath);
  }

  async resolveWorktreeLeaf(name: string): Promise<string> {
    const cwd = process.cwd();
    const candidate1 = path.join(cwd, "..", name);
    const candidate2 = path.join(cwd, "..", name.replaceAll("/", "-"));
    if (await fs.pathExists(candidate1)) {
      return candidate1;
    }
    if (await fs.pathExists(candidate2)) {
      return candidate2;
    }
    throw new Error(`worktree \"${name}\" not found`);
  }
}
