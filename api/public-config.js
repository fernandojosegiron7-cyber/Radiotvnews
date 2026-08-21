const {getFile}=require("./_lib/github");

module.exports=async(req,res)=>{
  if(req.method!=="GET")return res.status(405).json({error:"Método no permitido"});

  // Cache muy corto compartido entre visitantes: permite actualización rápida sin sobrecargar el origen.
  res.setHeader("Cache-Control","public, max-age=0, s-maxage=6, stale-while-revalidate=6");

  try{
    const file=await getFile("data/config.json");
    if(!file)return res.status(404).json({error:"No existe data/config.json"});
    return res.status(200).json(JSON.parse(file.content.toString("utf8")));
  }catch(e){
    console.error("public-config:",e);
    return res.status(500).json({error:e.message||"No se pudo leer la configuración"});
  }
};
