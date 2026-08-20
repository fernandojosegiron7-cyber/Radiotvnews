const { requireAuth } = require("./_lib/auth");
const { getFile, putFile } = require("./_lib/github");

const CONFIG_PATH = "data/config.json";

function validateSettings(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) throw new Error("Configuración inválida");
  if (String(x.stationName || "").length > 100) throw new Error("Nombre demasiado largo");
  if ((x.schedule || []).length > 100) throw new Error("Demasiados programas");
  if ((x.news || []).length > 100) throw new Error("Demasiadas noticias");
  for (const n of (x.news || [])) {
    if (String(n.title || "").length > 180) throw new Error("Titular demasiado largo");
    if (String(n.body || "").length > 12000) throw new Error("Una noticia supera el límite permitido");
  }
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const file = await getFile(CONFIG_PATH);
      if (!file) return res.status(404).json({ error: "No existe data/config.json en GitHub" });
      return res.status(200).json({ settings: JSON.parse(file.content.toString("utf8")) });
    }

    if (req.method === "POST") {
      validateSettings(req.body?.settings);
      const json = JSON.stringify(req.body.settings, null, 2) + "\n";
      const result = await putFile(
        CONFIG_PATH,
        Buffer.from(json, "utf8"),
        `Admin: actualizar configuración de Radio & TV`
      );
      return res.status(200).json({
        ok: true,
        message: "Cambios guardados en GitHub",
        commit: result.commitSha,
        commitUrl: result.htmlUrl
      });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Error al trabajar con GitHub" });
  }
};
