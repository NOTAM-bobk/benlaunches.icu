/**
 * Runs the `api/` functions inside `vite dev`, so the checkout can be tried
 * locally against PayPal's sandbox instead of only on a deployment.
 *
 * Vite's dev server does not execute Vercel functions, and without this the
 * checkout page would fall back to "checkout is not switched on yet" on every
 * local run. The plugin loads the very same handler modules the deployment
 * uses — nothing is duplicated — and pulls `PAYPAL_*` values out of `.env.local`
 * (never the client bundle, since none of them are `VITE_` prefixed).
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv, type Plugin } from "vite";

/** Route → the handler file that answers it. */
const ROUTES = new Map<string, string>([
  ["/api/paypal/config", "api/paypal/config.js"],
  ["/api/paypal/create-order", "api/paypal/create-order.js"],
  ["/api/paypal/capture-order", "api/paypal/capture-order.js"],
]);

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

/** The handlers expect `req.body` to be parsed, the way Vercel hands it over. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 20_000) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",

    configureServer(server) {
      const root = server.config.root;
      const env = loadEnv(server.config.mode, root, "PAYPAL_");
      for (const [key, value] of Object.entries(env)) {
        if (!process.env[key]) process.env[key] = value;
      }
      console.log(
        `[dev-api] checkout functions mounted · client id ${
          process.env.PAYPAL_CLIENT_ID ? "set" : "missing"
        } · environment ${process.env.PAYPAL_ENV ?? "sandbox"}`,
      );

      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0].replace(/\/+$/, "");
        const file = ROUTES.get(url);
        if (!file) {
          next();
          return;
        }

        void (async () => {
          try {
            if (req.method === "POST") {
              (req as IncomingMessage & { body?: unknown }).body = await readJsonBody(req);
            }
            const module = (await import(pathToFileURL(path.resolve(root, file)).href)) as {
              default: Handler;
            };
            await module.default(req, res);
          } catch (error) {
            console.error(`[dev-api] ${url} failed`, error);
            res.statusCode = 500;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "dev_api_failed" }));
          }
        })();
      });
    },
  };
}
