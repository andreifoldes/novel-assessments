import esbuild from "rollup-plugin-esbuild";
import nodeResolve from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import { copyAssets } from "@m2c2kit/build-helpers";
import copy from "rollup-plugin-copy";

export default (commandLineArgs) => {
  const port = commandLineArgs.configPort || 3001;

  return [
    {
      input: "./src/runner.ts",
      output: [
        {
          file: "./build/index.js",
          format: "es",
          sourcemap: true,
        },
      ],
      plugins: [
        nodeResolve(),
        esbuild({
          tsconfig: "tsconfig.runner.json",
        }),
        // Copies canvaskit-wasm, fonts, and registered image assets into build/
        // (face SVGs registered in GameOptions.images are copied automatically)
        copyAssets({ id: "affective-slider", outputFolder: "./build" }),
        // Copy the HTML entry point into build/
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
        serve({
          open: commandLineArgs.configOpen && true,
          verbose: true,
          contentBase: ["./build"],
          historyApiFallback: true,
          host: "localhost",
          port,
        }),
        livereload({ watch: "build", delay: 300 }),
      ],
    },
  ];
};
