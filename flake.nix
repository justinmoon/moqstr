{
  description = "Development environment for js-api-meet with MoQ relay";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    moq.url = "github:kixelated/moq";
  };

  outputs = { self, nixpkgs, flake-utils, moq, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        moqPkgs = moq.packages.${system};
      in
      {
        packages = {
          inherit (moqPkgs) moq-relay;
          default = moqPkgs.moq-relay;
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
