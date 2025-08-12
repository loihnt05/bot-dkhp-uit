#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program.name("sex").description("sex tool").version("1.0.0");


import { spawn } from "child_process";

program
  .command("run")
  .description("run multi argument")
  .argument("<values...>", "multiple arguments")
  .action((values) => {
    for (const cfg of values) {
      const child = spawn(
        process.execPath,
        [require("path").resolve(__dirname, "main.ts")],
        {
          stdio: "inherit",
          env: { ...process.env, CONFIG_FILE: cfg },
        }
      );
      child.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Process for ${cfg} exited with code ${code}`);
        }
      });
    }
  });

program.parse(process.argv);
