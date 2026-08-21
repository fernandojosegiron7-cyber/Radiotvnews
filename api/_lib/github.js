const API_VERSION="2022-11-28";

function repoEnv(){
  const owner=process.env.GITHUB_OWNER;
  const repo=process.env.GITHUB_REPO;
  const token=process.env.GITHUB_TOKEN;
  const branch=process.env.GITHUB_BRANCH||"main";
  if(!owner||!repo||!token)throw new Error("Faltan GITHUB_OWNER, GITHUB_REPO o GITHUB_TOKEN");
  return {owner,repo,token,branch};
}

function headers(token){
  return {
    "Accept":"application/vnd.github+json",
    "Authorization":`Bearer ${token}`,
    "X-GitHub-Api-Version":API_VERSION,
    "User-Agent":"RadioTV-PWA-Admin"
  };
}

async function getFile(path){
  const {owner,repo,token,branch}=repoEnv();
  const encoded=path.split("/").map(encodeURIComponent).join("/");
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}?ref=${encodeURIComponent(branch)}`;
  const r=await fetch(url,{headers:headers(token)});
  if(r.status===404)return null;

  const body=await r.json();
  if(!r.ok)throw new Error(body.message||`GET ${r.status}`);

  let content=Buffer.alloc(0);

  // GitHub entrega "content" directamente para archivos pequeños.
  if(body.content && body.encoding==="base64"){
    content=Buffer.from(String(body.content).replace(/\n/g,""),"base64");
  }
  // Para imágenes/archivos mayores, Contents API puede omitir "content".
  // En ese caso leemos el blob real usando git_url.
  else if(body.git_url){
    const br=await fetch(body.git_url,{headers:headers(token)});
    const blob=await br.json();
    if(!br.ok)throw new Error(blob.message||`GET BLOB ${br.status}`);
    content=Buffer.from(String(blob.content||"").replace(/\n/g,""),"base64");
  }

  return {sha:body.sha,content};
}

async function putFile(path,content,message){
  const {owner,repo,token,branch}=repoEnv();
  const current=await getFile(path);
  const encoded=path.split("/").map(encodeURIComponent).join("/");
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encoded}`;
  const payload={
    message,
    content:Buffer.isBuffer(content)?content.toString("base64"):Buffer.from(String(content)).toString("base64"),
    branch
  };
  if(current?.sha)payload.sha=current.sha;

  const r=await fetch(url,{
    method:"PUT",
    headers:{...headers(token),"Content-Type":"application/json"},
    body:JSON.stringify(payload)
  });
  const body=await r.json();
  if(!r.ok)throw new Error(body.message||`GitHub PUT ${r.status}`);
  return {commitSha:body.commit?.sha||"",contentPath:body.content?.path||path};
}

module.exports={getFile,putFile};
