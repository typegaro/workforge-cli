import fs from "fs-extra";
import path from "node:path";
import { Effect } from "effect";
import { ProjectsSchema, type Projects } from "./domain";
import { registryPath } from "./paths";

export class ProjectRegistryService {
  private readonly path = registryPath();

  private ensure = Effect.tryPromise({
    try: async () => {
      await fs.ensureDir(path.dirname(this.path));
      if (!(await fs.pathExists(this.path))) {
        await fs.writeFile(this.path, "{}", "utf8");
      }
      return this.path;
    },
    catch: (error) => new Error(`failed to initialize registry: ${String(error)}`),
  });

  load(): Effect.Effect<Projects, Error> {
    return Effect.gen(this, function* () {
      const regPath = yield* this.ensure;
      const raw = yield* Effect.tryPromise({
        try: () => fs.readFile(regPath, "utf8"),
        catch: (error) => new Error(`failed to read registry: ${String(error)}`),
      });

      if (!raw.trim()) {
        return {};
      }

      const parsed = yield* Effect.try({
        try: () => JSON.parse(raw),
        catch: (error) => new Error(`registry has invalid JSON: ${String(error)}`),
      });

      return yield* Effect.try({
        try: () => ProjectsSchema.parse(parsed),
        catch: (error) => new Error(`registry schema validation failed: ${String(error)}`),
      });
    });
  }

  save(projects: Projects): Effect.Effect<void, Error> {
    return Effect.gen(this, function* () {
      const regPath = yield* this.ensure;
      const json = JSON.stringify(projects, null, 2);
      yield* Effect.tryPromise({
        try: () => fs.writeFile(regPath, json, "utf8"),
        catch: (error) => new Error(`failed to save registry: ${String(error)}`),
      });
    });
  }
}
