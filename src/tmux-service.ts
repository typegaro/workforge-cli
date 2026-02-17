export class TmuxService {
  async newSession(sessionName: string, attach: boolean, windows: string[]): Promise<void> {
    if (windows.length === 0) {
      return;
    }

    await Bun.$`tmux new-session -s ${sessionName} -d`;
    await Bun.$`tmux send-keys -t ${sessionName} ${windows[0]} C-m`;

    for (const windowCommand of windows.slice(1)) {
      await Bun.$`tmux new-window -t ${sessionName}`;
      await Bun.$`tmux send-keys -t ${sessionName} ${windowCommand} C-m`;
    }

    if (attach) {
      await Bun.$`tmux attach -t ${sessionName}`;
    }
  }

  async hasSession(sessionName: string): Promise<boolean> {
    try {
      await Bun.$`tmux has-session -t ${sessionName}`;
      return true;
    } catch {
      return false;
    }
  }

  async killSession(sessionName: string): Promise<void> {
    await Bun.$`tmux kill-session -t ${sessionName}`;
  }
}
