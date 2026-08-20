const path=require("path");
const {getFile}=require("./_lib/github");

const TYPES={
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".webp":"image/webp",
  ".gif":"image/gif",
  ".svg":"image/svg+xml"
};

module.exports=async(req,res)=>{
  if(req.method!=="GET"){
    return res.status(405).json({error:"Método no permitido"});
  }

  try{
    const requested=String(req.query?.path||"").replace(/^\/+/,"");

    if(!requested.startsWith("assets/uploads/") || requested.includes("..")){
      return res.status(400).json({error:"Ruta no permitida"});
    }

    const file=await getFile(requested);
    if(!file){
      return res.status(404).end();
    }

    const type=TYPES[path.extname(requested).toLowerCase()]||"application/octet-stream";

    res.setHeader("Content-Type",type);
    res.setHeader("Cache-Control","public, max-age=60, s-maxage=60");
    res.setHeader("Content-Length",String(file.content.length));

    return res.status(200).send(file.content);
  }catch(e){
    console.error("public-asset:",e);
    return res.status(500).json({
      error:e.message||"No se pudo cargar la imagen"
    });
  }
};
