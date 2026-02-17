import fs from "fs-extra";
import path from "node:path";
import yaml from "js-yaml";
import { Effect } from "effect";
import { ConfigSchema, DEFAULT_PROFILE, ExampleConfigYAML, CONFIG_FILE_NAME, type Config } from "./domain";

export class ConfigService {
  resolveConfigPath(projectPath: string, isGwt: boolean): string {
    return isGwt ? path.join(projectPath, "..", CONFIG_FILE_NAME) : path.join(projectPath, CONFIG_FILE_NAME);
  }

  loadConfig(projectPath: string, isGwt: boolean): Effect.Effect<Config, Error> {
    return Effect.gen(this, function* () {
      const cfgPath = this.resolveConfigPath(projectPath, isGwt);
      const raw = yield* Effect.tryPromise({
        try: () => fs.readFile(cfgPath, "utf8"),
        catch: (error) => new Error(`failed reading ${cfgPath}: ${String(error)}`),
      });

      const parsed = yield* Effect.try({
        try: () => (yaml.load(raw) ?? {}) as unknown,
        catch: (error) => new Error(`invalid YAML in ${cfgPath}: ${String(error)}`),
      });

      return yield* Effect.try({
        try: () => ConfigSchema.parse(parsed),
        catch: (error) => new Error(`invalid config schema: ${String(error)}`),
      });
    });
  }

  async writeExampleConfig(projectPath?: string): Promise<void> {
    const destination = projectPath ? path.join(projectPath, CONFIG_FILE_NAME) : CONFIG_FILE_NAME;
    await fs.writeFile(destination, ExampleConfigYAML, "utf8");
  }

  selectProfile(config: Config, requested?: string): string {
    if (requested?.trim()) {
      if (!config[requested]) {
        throw new Error(`profile \"${requested}\" not found`);
      }
      return requested;
    }

    const keys = Object.keys(config);
    if (keys.length === 0) {
      throw new Error("no profiles defined in config");
    }
    if (keys.length === 1) {
      return keys[0] as string;
    }
    if (config[DEFAULT_PROFILE]) {
      return DEFAULT_PROFILE;
    }
    throw new Error("multiple profiles defined; specify --profile");
  }
}
