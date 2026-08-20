const API_VERSION = "2022-11-28";

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function repository() {
  const owner = env("GITHUB_OWNER");
  const repo = env("GITHUB_REPO");
  const token = env("GITHUB_TOKEN");
  const branch = env("GITHUB_BRANCH", "main");
  if (!owner || !repo || !token) {
    throw new Error("Faltan GITHUB_OWNER, GITHUB_REPO o GITHUB_TOKEN");
  }
  return { owner, repo, token, branch };
}

function headers(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "FG-Radio-TV-Admin"
  };
}

async function getFile(path) {
  const { owner, repo, token, branch } = repository();
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: headers(token) });
  if (r.status === 404) return null;
  const body = await r.json();
  if (!r.ok) throw new Error(body.message || `GitHub GET ${r.status}`);
  if (Array.isArray(body) || body.type !== "file") throw new Error("La ruta de GitHub no es un archivo");
  return {
    sha: body.sha,
    content: Buffer.from(String(body.content || "").replace(/\n/g, ""), "base64")
  };
}

async function putFile(path, content, message) {
  const { owner, repo, token, branch } = repository();
  const current = await getFile(path);
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const payload = {
    message,
    content: Buffer.isBuffer(content) ? content.toString("base64") : Buffer.from(String(content)).toString("base64"),
    branch
  };
  if (current?.sha) payload.sha = current.sha;

  const r = await fetch(url, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.message || `GitHub PUT ${r.status}`);
  return {
    commitSha: body.commit?.sha || "",
    htmlUrl: body.commit?.html_url || "",
    contentPath: body.content?.path || path
  };
}

module.exports = { getFile, putFile };
