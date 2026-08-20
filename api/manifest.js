const {getFile}=require("./_lib/github");

module.exports=async(req,res)=>{
  if(req.method!=="GET")return res.status(405).json({error:"Método no permitido"});

  res.setHeader("Content-Type","application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");

  try{
    const file=await getFile("data/config.json");
    const cfg=file?JSON.parse(file.content.toString("utf8")):{};
    const logo=String(cfg.logo||"").trim();

    let icon="/icons/icon.svg";
    if(logo.startsWith("/assets/uploads/")){
      icon=`/api/public-asset?path=${encodeURIComponent(logo.slice(1))}`;
    }else if(/^https?:\/\//i.test(logo)){
      icon=logo;
    }

    const manifest={
      name:cfg.stationName||"Radio & TV",
      short_name:cfg.shortName||cfg.stationName||"Radio TV",
      description:cfg.slogan||"Radio, TV y noticias",
      start_url:"/",
      scope:"/",
      display:"standalone",
      background_color:"#0b1018",
      theme_color:cfg.accent||"#6d5ef9",
      orientation:"portrait-primary",
      icons:[
        {src:icon,sizes:"192x192",type:"image/png",purpose:"any maskable"},
        {src:icon,sizes:"512x512",type:"image/png",purpose:"any maskable"}
      ]
    };

    return res.status(200).send(JSON.stringify(manifest));
  }catch(e){
    console.error("manifest:",e);
    return res.status(500).json({error:e.message||"No se pudo generar el manifest"});
  }
};
