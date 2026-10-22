import "dotenv/config";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { companionRequestSchema, generateCompanionReply, generateCompanionReplyStream } from "../companion";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // File serving route for uploaded patient records with directory traversal protection
  app.get("/api/records/file/*", (req, res) => {
    const rawKey = (req.params as Record<string | number, string>)[0];
    if (!rawKey) {
      return res.status(400).send("Missing file key");
    }
    const safeKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, "");
    const allowedBase = path.resolve(process.cwd(), "uploads", "patient-records");
    const filePath = path.resolve(allowedBase, safeKey);

    if (!filePath.startsWith(allowedBase)) {
      return res.status(403).send("Forbidden");
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const ext = path.extname(safeKey).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(safeKey)}"`);
    res.sendFile(filePath);
  });

  app.post("/api/chat", async (req, res) => {
    const parsed = companionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please send a valid chat message." });
      return;
    }
    try {
      const text = await generateCompanionReply(parsed.data);
      res.json({ text });
    } catch (error) {
      console.error("[MindSafe chat] request failed", error);
      res.status(503).json({ error: "The companion is temporarily unavailable." });
    }
  });

  app.post("/api/chat/stream", async (req, res) => {
    const parsed = companionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please send a valid chat message." });
      return;
    }

    const controller = new AbortController();
    let finished = false;
    const sendEvent = (event: Record<string, unknown>) => {
      if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.on("close", () => {
      if (!finished && !res.writableEnded) controller.abort();
    });

    try {
      const result = await generateCompanionReplyStream(
        parsed.data,
        text => sendEvent({ type: "token", text }),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      finished = true;
      sendEvent({ type: "done", ...result });
      res.end();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error("[MindSafe chat] streaming request failed", error);
      finished = true;
      sendEvent({ type: "error", message: "I couldn’t finish that reply. Your message is still here—please try again." });
      res.end();
    }
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
