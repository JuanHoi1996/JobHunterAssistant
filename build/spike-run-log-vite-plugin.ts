import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Connect, Plugin } from "vite";

const ROUTE = "/__dev/spike-run-log";

async function readRequestBody(req: Connect.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Local-dev only: Workers VFS cannot write project files (cwd=/bundle).
 * Persist spike analyze logs from the Vite Node process instead.
 */
export function spikeRunLogDev(): Plugin {
  let root = process.cwd();

  return {
    name: "spike-run-log-dev",
    apply: "serve",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== ROUTE || req.method !== "POST") {
          next();
          return;
        }

        try {
          const raw = await readRequestBody(req);
          const payload = JSON.parse(raw) as Record<string, unknown>;
          const dir = path.join(root, "outputs", "spike-runs");
          await mkdir(dir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/gu, "-");
          const ok = payload.ok === true;
          const kind = payload.kind === "rank" ? "rank" : "resume";
          const fileName = `${stamp}-${kind}-${ok ? "ok" : "fail"}.json`;
          const filePath = path.join(dir, fileName);
          const body = {
            savedAt: new Date().toISOString(),
            ...payload,
          };
          await writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
          const relativePath = path.join("outputs", "spike-runs", fileName).replace(/\\/gu, "/");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ relativePath, fileName }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to write spike run log",
          }));
        }
      });
    },
  };
}
