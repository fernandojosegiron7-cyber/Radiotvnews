const { validPassword, createSessionCookie } = require("./_lib/auth");

const attempts = new Map();

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const current = attempts.get(ip) || { count: 0, reset: now + 10 * 60 * 1000 };
  if (now > current.reset) {
    current.count = 0;
    current.reset = now + 10 * 60 * 1000;
  }
  if (current.count >= 8) {
    return res.status(429).json({ error: "Demasiados intentos" });
  }

  try {
    if (!validPassword(req.body?.password)) {
      current.count++;
      attempts.set(ip, current);
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }
    attempts.delete(ip);
    res.setHeader("Set-Cookie", createSessionCookie());
    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error(e);
    return res.status(500).json({ error: "El servidor no está configurado correctamente" });
  }
};
