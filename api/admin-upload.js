const path = require("path");
const crypto = require("crypto");
const { requireAuth } = require("./_lib/auth");
const { putFile } = require("./_lib/github");

const ALLOWED = new Set(["image/png","image/jpeg","image/webp","image/svg+xml"]);
const MAX_BYTES = 2.5 * 1024 * 1024;

function safeFolder(value) {
  const x = String(value || "misc").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return x || "misc";
}

function extFor(mime, original) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg"
  };
  return map[mime] || path.extname(original || "").toLowerCase() || ".bin";
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const { dataUrl, filename, folder, mime } = req.body || {};
    if (!ALLOWED.has(mime)) return res.status(400).json({ error: "Formato de imagen no permitido" });

    const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Archivo inválido" });

    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(400).json({ error: "La imagen debe pesar menos de 2.5 MB" });
    }

    const cleanFolder = safeFolder(folder);
    const ext = extFor(mime, filename);
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const repoPath = `assets/uploads/${cleanFolder}/${name}`;

    const result = await putFile(repoPath, buffer, `Admin: subir imagen ${cleanFolder}`);
    return res.status(200).json({
      ok: true,
      path: `/${repoPath}`,
      commit: result.commitSha
    });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "No se pudo subir la imagen" });
  }
};
