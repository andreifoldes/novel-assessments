import esbuild from "rollup-plugin-esbuild";
import nodeResolve from "@rollup/plugin-node-resolve";
import { copyAssets } from "@m2c2kit/build-helpers";
import copy from "rollup-plugin-copy";

export default [
  {
    input: "./src/runner.ts",
    output: [
      {
        file: "./build/index.js",
        format: "es",
        sourcemap: false,
      },
    ],
    plugins: [
      nodeResolve(),
      esbuild({
        tsconfig: "tsconfig.runner.json",
        minify: true,
      }),
      copyAssets({ id: "affective-slider", outputFolder: "./build" }),
      copy({
        targets: [
          { src: "./index.html", dest: "./build" },
          {
            src: "./fonts/Roboto-Regular.woff2",
            dest: "./build/assets/affective-slider/fonts",
          },
        ],
        hook: "buildEnd",
      }),
    ],
  },
];
