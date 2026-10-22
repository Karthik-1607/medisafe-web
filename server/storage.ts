// Preconfigured storage helpers for MediSafe
// Uploads via Forge Server presigned URL to S3 if available, or local disk storage fallback.

import fs from "fs";
import path from "path";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), "uploads", "patient-records");

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  const key = appendHashSuffix(normalizeKey(relKey));

  // If Forge S3 credentials exist, try uploading to Forge S3
  if (forgeUrl && forgeKey) {
    try {
      const presignUrl = new URL("v1/storage/presign/put", forgeUrl.replace(/\/+$/, "") + "/");
      presignUrl.searchParams.set("path", key);

      const presignResp = await fetch(presignUrl, {
        headers: { Authorization: `Bearer ${forgeKey}` },
      });

      if (presignResp.ok) {
        const { url: s3Url } = (await presignResp.json()) as { url: string };
        if (s3Url) {
          const blob =
            typeof data === "string"
              ? new Blob([data], { type: contentType })
              : new Blob([data as any], { type: contentType });

          const uploadResp = await fetch(s3Url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: blob,
          });

          if (uploadResp.ok) {
            return { key, url: `/manus-storage/${key}` };
          }
        }
      }
    } catch (err) {
      console.warn("[Storage] Forge S3 upload failed, falling back to local disk storage:", err);
    }
  }

  // Local disk storage fallback
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  const targetDir = path.dirname(filePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  let buffer: Buffer;

  if (typeof data === "string") {
    // If it's a base64 string
    if (data.startsWith("data:")) {
      const base64Data = data.split(";base64,").pop() || "";
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.from(data, "utf-8");
    }
  } else {
    buffer = Buffer.from(data);
  }

  fs.writeFileSync(filePath, buffer);
  return { key, url: `/api/records/file/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const localFile = path.join(LOCAL_STORAGE_DIR, key);
  if (fs.existsSync(localFile)) {
    return { key, url: `/api/records/file/${key}` };
  }
  return { key, url: `/manus-storage/${key}` };
}
