import { z } from "zod";

export const CONFIG_FILE_NAME = ".wfconfig.yml";
export const REGISTRY_FILE_NAME = "workforge.json";
export const DEFAULT_PROFILE = "default";

export const ExampleConfigYAML = `
default:
  log_level: "DEBUG"
  hooks:
    on_load:
      - 'echo "Welcome in your project!"'
    on_shell_run_in:
      - 'echo "Starting shell session..."'
    on_shell_run_out:
      - 'echo "Shell session ended."'
  tmux:
    attach: false
    session_name: "test_prj"
    windows:
      - "nvim ."
      - "htop"
`;

export const HookType = {
  OnLoad: "on_load",
  OnClose: "on_close",
  OnDelete: "on_delete",
  OnShellRunIn: "on_shell_run_in",
  OnShellRunOut: "on_shell_run_out",
} as const;

export type HookType = (typeof HookType)[keyof typeof HookType];

export const ProjectSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  git_work_tree: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

export const ProjectsSchema = z.record(z.string(), ProjectSchema);

export type Project = z.infer<typeof ProjectSchema>;
export type Projects = z.infer<typeof ProjectsSchema>;

export type ProjectEntry = {
  project: Project;
  isGwt: boolean;
};

export const TemplateSchema = z
  .object({
    log_level: z.string().optional(),
    foreground: z.string().optional(),
    hooks: z
      .object({
        on_create: z.array(z.string()).optional(),
        on_load: z.array(z.string()).optional(),
        on_close: z.array(z.string()).optional(),
        on_delete: z.array(z.string()).optional(),
        on_shell_run_in: z.array(z.string()).optional(),
        on_shell_run_out: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
    tmux: z
      .object({
        attach: z.boolean().default(false),
        session_name: z.string().optional(),
        windows: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .catchall(z.unknown());

export const ConfigSchema = z.record(z.string(), TemplateSchema);

export type Config = z.infer<typeof ConfigSchema>;
export type Template = z.infer<typeof TemplateSchema>;
