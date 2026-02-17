export function repoUrlToName(repoUrl: string): string {
  try {
    const parsed = new URL(repoUrl);
    const base = parsed.pathname.split("/").filter(Boolean).at(-1) ?? repoUrl;
    return base.replace(/\.git$/, "");
  } catch {
    const base = repoUrl.split("/").filter(Boolean).at(-1) ?? repoUrl;
    return base.replace(/\.git$/, "");
  }
}

export function worktreeLeafName(name: string): string {
  const cleaned = name.trim().replace(/^\/+|\/+$/g, "");
  const sanitized = cleaned.replaceAll("/", "-").split(/\s+/).filter(Boolean).join("-");
  return sanitized || "worktree";
}
