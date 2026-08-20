const crypto=require("crypto");
const path=require("path");
const {requireAuth}=require("./_lib/auth");
const {putFile}=require("./_lib/github");

const ALLOWED=new Set(["image/png","image/jpeg","image/webp","image/svg+xml"]);
const MAX=2.5*1024*1024;

module.exports=async(req,res)=>{
  if(!requireAuth(req,res))return;
  if(req.method!=="POST")return res.status(405).json({error:"Método no permitido"});

  try{
    const {dataUrl,filename,folder,mime}=req.body||{};
    if(!ALLOWED.has(mime))return res.status(400).json({error:"Formato no permitido"});

    const match=String(dataUrl||"").match(/^data:([^;]+);base64,(.+)$/);
    if(!match)return res.status(400).json({error:"Archivo inválido"});

    const buffer=Buffer.from(match[2],"base64");
    if(!buffer.length||buffer.length>MAX)return res.status(400).json({error:"La imagen debe pesar menos de 2.5 MB"});

    const safeFolder=String(folder||"misc").replace(/[^a-z0-9_-]/gi,"").toLowerCase()||"misc";
    const extMap={"image/png":".png","image/jpeg":".jpg","image/webp":".webp","image/svg+xml":".svg"};
    const ext=extMap[mime]||path.extname(filename||"")||".bin";
    const name=`${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const repoPath=`assets/uploads/${safeFolder}/${name}`;

    const result=await putFile(repoPath,buffer,`Admin: subir imagen ${safeFolder}`);
    return res.status(200).json({ok:true,path:`/${repoPath}`,commit:result.commitSha});
  }catch(e){console.error(e);return res.status(500).json({error:"No se pudo subir la imagen"})}
};
