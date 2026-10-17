import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Preserve an explicit runtime choice. Otherwise use an available rootless
// Podman socket on Linux; the Supabase CLI handles its normal Docker default.
if (!process.env.DOCKER_HOST && process.platform === "linux") {
  const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`;
  const socket = join(runtimeDir, "podman", "podman.sock");
  if (existsSync(socket) && statSync(socket).isSocket()) {
    process.env.DOCKER_HOST = `unix://${socket}`;
    console.log("Using the rootless Podman socket for database tests.");
  }
}

// Always test this checkout's SQL, even when a separate stack config is selected.
const result = spawnSync("supabase", ["test", "db", resolve("supabase/tests"), ...process.argv.slice(2)], {
  env: process.env,
  stdio: "inherit",
});
if (result.error) {
  console.error("Could not run the Supabase CLI. Check that 'supabase' is installed and on PATH.");
}
process.exitCode = result.status ?? 1;
