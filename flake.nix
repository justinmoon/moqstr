{
  description = "Development environment for js-api-meet with MoQ relay";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    moqrs.url = "github:kixelated/moq?dir=rs";
  };

  outputs = { self, nixpkgs, flake-utils, moqrs, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        moqPkgs = moqrs.packages.${system};
      in
      {
        packages = {
          inherit (moqPkgs) moq-relay;
          default = moqPkgs.moq-relay;
          ci = pkgs.writeShellApplication {
            name = "ci";
            runtimeInputs = [
              pkgs.bash
              pkgs.coreutils
              pkgs.findutils
              pkgs.gnugrep
              pkgs.gnused
              pkgs.git
              pkgs.nodejs_22
              pkgs.bun
              moqPkgs.moq-relay
            ];
            text = builtins.readFile ./scripts/ci.sh;
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.bun
            pkgs.nodejs_22
            pkgs.git
            moqPkgs.moq-relay
          ];
        };
      }
    );
}
