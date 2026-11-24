import { spawnSync } from "node:child_process";

function run(cmd, args, inherit = false) {
  const r = spawnSync(cmd, args, {
    stdio: inherit ? "inherit" : "pipe",
    env: process.env,
    encoding: "utf8",
  });
  if (!inherit) {
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
  return r;
}

const deploy = run("npx", ["prisma", "migrate", "deploy"]);
if (deploy.status === 0) process.exit(0);

const out = `${deploy.stdout || ""}${deploy.stderr || ""}`;
if (out.includes("P3005")) {
  console.log("Detected P3005: baselining existing migrations...");
  const resolve = run("npx", ["prisma", "migrate", "resolve", "--applied", "0001_init"], true);
  if (resolve.status !== 0) process.exit(resolve.status ?? 1);
  const deploy2 = run("npx", ["prisma", "migrate", "deploy"], true);
  process.exit(deploy2.status ?? 1);
}

process.exit(deploy.status ?? 1);
