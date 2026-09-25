import { requireAdmin } from "@/lib/admin";
import { csrfError, hasValidMutationOrigin } from "@/lib/csrf";

const MAX_FILES = 250;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_BYTES = 45 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 55 * 1024 * 1024;
const MAX_REQUEST_BYTES = 105 * 1024 * 1024;
const UPLOAD_BATCH_SIZE = 10;

const allowedExtensions = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".txt", ".md", ".xml", ".csv",
  ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".ico",
  ".woff", ".woff2", ".ttf", ".otf",
  ".mp3", ".wav", ".ogg", ".mp4", ".webm",
  ".glb", ".gltf", ".obj", ".mtl", ".wasm", ".map", ".pdf",
]);

const contentTypes: Record<string, string> = {
  ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".cjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".wasm": "application/wasm", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "video/webm",
  ".xml": "application/xml", ".csv": "text/csv", ".txt": "text/plain", ".md": "text/plain",
};
const textExtensions = new Set([".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx", ".json", ".txt", ".md", ".xml", ".csv", ".svg", ".gltf", ".obj", ".mtl", ".map"]);
const embeddedSecretPatterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bsk-[A-Za-z0-9_-]{20,}\b/, /\bAKIA[0-9A-Z]{16}\b/, /\bAIza[0-9A-Za-z_-]{30,}\b/];

async function hasExpectedSignature(file: File, extension: string) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  if (extension === ".png") return bytes[0] === 0x89 && text.slice(1, 8) === "PNG\r\n\x1a\n";
  if (extension === ".jpg" || extension === ".jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === ".webp") return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (extension === ".gif") return text.startsWith("GIF87a") || text.startsWith("GIF89a");
  if (extension === ".avif") return text.slice(4, 8) === "ftyp" && /^(avif|avis)$/.test(text.slice(8, 12));
  if (extension === ".ico") return bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  if (extension === ".pdf") return text.startsWith("%PDF-");
  if (extension === ".wasm") return text.startsWith("\0asm");
  return true;
}

function safeSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._ -]+/g, "-").replace(/^\.+$/, "-").slice(0, 100) || "file";
}

function safeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length || segments.length > 20 || normalized.length > 500 || segments.some((segment) => segment === "." || segment === "..")) return null;
  const lowerSegments = segments.map((segment) => segment.toLowerCase());
  if (lowerSegments.includes("node_modules") || lowerSegments.includes(".git") || lowerSegments.some((segment) => segment === ".env" || segment.startsWith(".env."))) return null;
  return segments.map(safeSegment).join("/");
}

function extensionOf(path: string) {
  return path.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
}

function publicFileUrl(key: string) {
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function POST(request: Request) {
  if (!hasValidMutationOrigin(request)) return csrfError();
  const admin = await requireAdmin("uploads.create");
  if (!admin) return Response.json({ message: "Administrator access required." }, { status: 403 });

  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) return Response.json({ message: "Upload size is required." }, { status: 411 });
  if (contentLength > MAX_REQUEST_BYTES) return Response.json({ message: "This bundle is too large. Keep the complete upload under 100 MB." }, { status: 413 });

  const form = await request.formData();
  const sourceFiles = form.getAll("files");
  const sourcePaths = form.getAll("paths");
  const archive = form.get("archive");
  const rawBundleName = form.get("bundleName");

  if (!sourceFiles.length || sourceFiles.length > MAX_FILES || sourceFiles.length !== sourcePaths.length) {
    return Response.json({ message: `Choose between 1 and ${MAX_FILES} valid project files.` }, { status: 400 });
  }
  if (!(archive instanceof File) || archive.size === 0 || archive.size > MAX_ARCHIVE_BYTES || extensionOf(archive.name) !== ".zip") {
    return Response.json({ message: "The generated ZIP archive is missing or too large." }, { status: 400 });
  }
  const archiveSignature = new Uint8Array(await archive.slice(0, 4).arrayBuffer());
  if (archiveSignature[0] !== 0x50 || archiveSignature[1] !== 0x4b || archiveSignature[2] !== 0x03 || archiveSignature[3] !== 0x04) {
    return Response.json({ message: "The ZIP archive is invalid." }, { status: 400 });
  }

  const files: { file: File; path: string; size: number; type: string }[] = [];
  const uniquePaths = new Set<string>();
  let totalBytes = 0;

  for (let index = 0; index < sourceFiles.length; index += 1) {
    const file = sourceFiles[index];
    const rawPath = sourcePaths[index];
    if (!(file instanceof File) || typeof rawPath !== "string" || file.size === 0 || file.size > MAX_FILE_BYTES) {
      return Response.json({ message: "One or more files are empty or exceed the 20 MB per-file limit." }, { status: 400 });
    }
    const path = safeRelativePath(rawPath);
    const extension = path ? extensionOf(path) : undefined;
    if (!path || !extension || !allowedExtensions.has(extension) || !(await hasExpectedSignature(file, extension))) {
      return Response.json({ message: "One or more files are not allowed website assets." }, { status: 400 });
    }
    if (textExtensions.has(extension)) {
      const textContent = await file.text();
      if (embeddedSecretPatterns.some((pattern) => pattern.test(textContent))) {
        return Response.json({ message: "Remove private credentials from project files before uploading." }, { status: 400 });
      }
    }
    if (uniquePaths.has(path.toLowerCase())) return Response.json({ message: `The path “${path}” is duplicated.` }, { status: 400 });
    uniquePaths.add(path.toLowerCase());
    totalBytes += file.size;
    files.push({ file, path, size: file.size, type: contentTypes[extension] || "application/octet-stream" });
  }

  if (totalBytes > MAX_SOURCE_BYTES) return Response.json({ message: "Project files must total 45 MB or less." }, { status: 413 });

  const previewFile = files
    .filter((item) => /(^|\/)index\.html?$/i.test(item.path))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length)[0]
    ?? files.find((item) => /\.html?$/i.test(item.path));
  if (!previewFile) return Response.json({ message: "Add an index.html file so the project can be previewed." }, { status: 400 });

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const bucket = env.MEDIA as R2Bucket;
    const bundleId = crypto.randomUUID();
    const prefix = `episode-bundles/${bundleId}`;
    const bundleName = safeSegment(typeof rawBundleName === "string" ? rawBundleName : "project-files").replace(/\s+/g, "-");

    for (let offset = 0; offset < files.length; offset += UPLOAD_BATCH_SIZE) {
      const batch = files.slice(offset, offset + UPLOAD_BATCH_SIZE);
      await Promise.all(batch.map(async ({ file, path, type }) => bucket.put(`${prefix}/files/${path}`, await file.arrayBuffer(), {
        httpMetadata: { contentType: type },
        customMetadata: { uploadedBy: admin.id, bundleId },
      })));
    }

    const archiveKey = `${prefix}/${bundleName}.zip`;
    await bucket.put(archiveKey, await archive.arrayBuffer(), {
      httpMetadata: { contentType: "application/zip", contentDisposition: `attachment; filename="${bundleName}.zip"` },
      customMetadata: { uploadedBy: admin.id, bundleId, fileCount: String(files.length) },
    });

    return Response.json({
      bundleId,
      previewUrl: publicFileUrl(`${prefix}/files/${previewFile.path}`),
      downloadUrl: `${publicFileUrl(archiveKey)}?download=1`,
      fileCount: files.length,
      totalBytes,
      files: files.map(({ path, size, type }) => ({ path, size, type })),
    }, { status: 201 });
  } catch (error) {
    console.error("Episode bundle upload failed", error);
    return Response.json({ message: "R2 storage is not configured for this environment." }, { status: 503 });
  }
}
