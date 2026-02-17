# workforge-ts

TypeScript + Bun port of `workforge`, focused on core project/worktree management.

Plugin runtime is intentionally excluded for now.

## Stack

- Runtime: Bun
- CLI parser: Commander
- Validation: Zod
- Effect system: Effect
- Git wrapper: simple-git
- YAML parser: js-yaml

## Commands

- `wf init [url] --gwt`
- `wf list`
- `wf open <project-name> --profile <name>`
- `wf close <project-name> --profile <name>`
- `wf add [worktree|project] <branch> -c --base main`
- `wf rm <name>`

## Run

```bash
bun install
bun run dev -- --help
```

## Typecheck

```bash
bun run typecheck
```
