const {validPassword,createSessionCookie}=require("./_lib/auth");
module.exports=async(req,res)=>{
  if(req.method!=="POST")return res.status(405).json({error:"Método no permitido"});
  try{
    if(!validPassword(req.body?.password))return res.status(401).json({error:"Credenciales incorrectas"});
    res.setHeader("Set-Cookie",createSessionCookie());
    return res.status(200).json({ok:true});
  }catch(e){console.error(e);return res.status(500).json({error:e.message||"Error de configuración"})}
};
