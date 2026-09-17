import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
}

const publicVars = [
  ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
  [
    "NEXT_PUBLIC_SITE_URL",
    "https://invofin-gede-hadrians-projects.vercel.app",
  ],
];
const targets = ["production", "preview", "development"];

function run(args, input) {
  return spawnSync("npx", ["vercel", ...args], {
    encoding: "utf8",
    input,
    shell: true,
  });
}

for (const [name, value] of publicVars) {
  for (const target of targets) {
    run(["env", "rm", name, target, "--yes"]);
  }
  const added = run(
    ["env", "add", name, "production", "preview", "development", "--yes", "--type", "config"],
    `${value}\n`,
  );
  if (added.status === 0) {
    console.log(`added ${name} all envs as config`);
    continue;
  }
  let ok = true;
  for (const target of targets) {
    const one = run(
      ["env", "add", name, target, "--yes", "--type", "config"],
      `${value}\n`,
    );
    if (one.status === 0) console.log(`added ${name} ${target} as config`);
    else {
      ok = false;
      console.log(`FAIL add ${name} ${target}`);
      console.log((one.stderr || "").slice(0, 300));
    }
  }
  if (!ok) process.exitCode = 1;
}

const role = run(
  ["env", "update", "SUPABASE_SERVICE_ROLE_KEY", "production", "--yes", "--type", "secret"],
  `${env.SUPABASE_SERVICE_ROLE_KEY}\n`,
);
console.log(role.status === 0 ? "service role production ok" : "service role production fail");
