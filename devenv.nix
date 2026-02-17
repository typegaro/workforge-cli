{ pkgs, ... }: {
  name = "workforge-ts";

  packages = [
    pkgs.bun
    pkgs.nodejs_22
    pkgs.git
    pkgs.tmux
    pkgs.gnumake
  ];
}
