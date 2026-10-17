import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { selectContainerHost } from "./container-runtime.mjs";

async function sockets(t) {
  const dir = await mkdtemp(join(tmpdir(), "kenzoshare-runtime-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dockerSocket: join(dir, "docker.sock"), podmanSocket: join(dir, "podman.sock") };
}

async function serve(t, socketPath, status) {
  const server = createServer((request, response) => {
    assert.equal(request.url, "/_ping");
    if (status !== undefined) response.writeHead(status).end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
}

test("an explicit container host is preserved without probing defaults", async () => {
  assert.equal(await selectContainerHost({ explicitHost: "tcp://127.0.0.1:2376" }), "tcp://127.0.0.1:2376");
});

test("a responding Docker API takes priority over Podman", async (t) => {
  const paths = await sockets(t);
  await serve(t, paths.dockerSocket, 200);
  await serve(t, paths.podmanSocket, 200);
  assert.equal(await selectContainerHost(paths), undefined);
});

test("an existing Docker socket that rejects access falls back to Podman", async (t) => {
  const paths = await sockets(t);
  await serve(t, paths.dockerSocket, 403);
  await serve(t, paths.podmanSocket, 200);
  assert.equal(await selectContainerHost(paths), `unix://${paths.podmanSocket}`);
});

test("an unresponsive Docker socket falls back to Podman", async (t) => {
  const paths = await sockets(t);
  await serve(t, paths.dockerSocket);
  await serve(t, paths.podmanSocket, 200);
  assert.equal(await selectContainerHost(paths), `unix://${paths.podmanSocket}`);
});

test("a missing Docker socket falls back to Podman", async (t) => {
  const paths = await sockets(t);
  await serve(t, paths.podmanSocket, 200);
  assert.equal(await selectContainerHost(paths), `unix://${paths.podmanSocket}`);
});

test("unavailable runtimes leave the CLI default unchanged", async (t) => {
  assert.equal(await selectContainerHost(await sockets(t)), undefined);
});
