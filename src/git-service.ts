import { simpleGit } from "simple-git";
import { worktreeLeafName } from "./repo";

function worktreeFolderName(name: string): string {
  return `../${worktreeLeafName(name)}`;
}

export class GitService {
  async clone(repoUrl: string, destination?: string): Promise<void> {
    const git = simpleGit();
    if (destination) {
      await git.clone(repoUrl, destination);
      return;
    }
    await git.clone(repoUrl);
  }

  async currentBranch(repoPath?: string): Promise<string> {
    const git = repoPath ? simpleGit(repoPath) : simpleGit();
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    return branch.trim();
  }

  async addWorktree(worktreePath: string, branch: string, createBranch: boolean, baseBranch: string): Promise<void> {
    const git = simpleGit(worktreePath);
    const branchRef = branch.trim().replace(/^\/+|\/+$/g, "") || branch;
    const folderName = worktreeFolderName(branchRef);

    if (!createBranch) {
      await git.raw(["worktree", "add", folderName, branchRef]);
      return;
    }

    const exists = await this.branchExists(worktreePath, branchRef);
    if (exists) {
      await git.raw(["worktree", "add", folderName, branchRef]);
      return;
    }

    const base = baseBranch.trim() || "main";
    await git.raw(["worktree", "add", folderName, "-b", branchRef, base]);
  }

  async removeWorktree(leafPath: string): Promise<void> {
    const git = simpleGit();
    await git.raw(["worktree", "remove", leafPath]);
  }

  private async branchExists(worktreePath: string, branch: string): Promise<boolean> {
    const git = simpleGit(worktreePath);
    const local = await git.branchLocal();
    return local.all.includes(branch);
  }
}
