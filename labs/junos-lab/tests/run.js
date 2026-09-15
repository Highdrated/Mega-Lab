#!/usr/bin/env node
/* Headless test runner: evaluates the app's js/ files (in index.html order)
   inside a vm context with a minimal DOM shim, then runs the test suite.
   Usage: node tests/run.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const order = ["core.js", "sound.js", "grammar.js", "cli.js", "engine.js", "ui.js", "planner.js", "juno.js", "scenarios.js", "protocols.js", "course.js", "mockexam.js"];

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, "shim.js"), "utf8"), ctx, { filename: "shim.js" });
for(const f of order)
  vm.runInContext(fs.readFileSync(path.join(root, "js", f), "utf8"), ctx, { filename: f });
vm.runInContext(fs.readFileSync(path.join(__dirname, "tests.js"), "utf8"), ctx, { filename: "tests.js" });

const fails = vm.runInContext("__FAIL", ctx);
process.exit(fails ? 1 : 0);
