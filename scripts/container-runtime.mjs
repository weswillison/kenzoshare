import { get } from "node:http";

function responds(socketPath) {
  return new Promise((resolve) => {
    const request = get({ socketPath, path: "/_ping" }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => request.destroy(new Error("Container API timed out")));
  });
}

export async function selectContainerHost({ explicitHost, dockerSocket, podmanSocket }) {
  if (explicitHost) return explicitHost;
  // Preserve the CLI's Docker default only when the API is actually accessible.
  if (await responds(dockerSocket)) return undefined;
  if (await responds(podmanSocket)) return `unix://${podmanSocket}`;
  return undefined;
}
