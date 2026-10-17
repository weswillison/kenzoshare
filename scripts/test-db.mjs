import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { selectContainerHost } from "./container-runtime.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Preserve an explicit runtime choice and prefer a responding Docker API.
// A socket file alone does not prove the current user can use the daemon.
if (!process.env.DOCKER_HOST && process.platform === "linux") {
  const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid()}`;
  const host = await selectContainerHost({
    dockerSocket: "/var/run/docker.sock",
    podmanSocket: join(runtimeDir, "podman", "podman.sock"),
  });
  if (host) {
    process.env.DOCKER_HOST = host;
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
