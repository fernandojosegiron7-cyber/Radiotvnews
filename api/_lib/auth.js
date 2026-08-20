const crypto=require("crypto");
const COOKIE_NAME="fg_radio_admin";
const MAX_AGE_SECONDS=60*60*12;

function secret(){
  const value=process.env.SESSION_SECRET;
  if(!value||value.length<24)throw new Error("SESSION_SECRET no configurado o demasiado corto");
  return value;
}

function sign(value){
  return crypto.createHmac("sha256",secret()).update(value).digest("hex");
}

function safeEqual(a,b){
  const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));
  if(aa.length!==bb.length)return false;
  return crypto.timingSafeEqual(aa,bb);
}

function validPassword(input){
  const expected=process.env.ADMIN_PASSWORD||"";
  if(!expected)throw new Error("ADMIN_PASSWORD no configurado");
  return safeEqual(
    crypto.createHash("sha256").update(String(input||"")).digest("hex"),
    crypto.createHash("sha256").update(expected).digest("hex")
  );
}

function createSessionCookie(){
  const expires=Math.floor(Date.now()/1000)+MAX_AGE_SECONDS;
  const value=`${expires}.${sign(String(expires))}`;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie(){
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function getCookie(req,name){
  const header=req.headers.cookie||"";
  const found=header.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));
  return found?found.slice(name.length+1):"";
}

function isAuthenticated(req){
  try{
    const value=getCookie(req,COOKIE_NAME);
    if(!value)return false;
    const [expires,signature]=value.split(".");
    if(!expires||!signature)return false;
    if(Number(expires)<Math.floor(Date.now()/1000))return false;
    return safeEqual(signature,sign(expires));
  }catch{return false}
}

function requireAuth(req,res){
  if(!isAuthenticated(req)){res.status(401).json({error:"No autorizado"});return false}
  return true;
}

module.exports={validPassword,createSessionCookie,clearSessionCookie,isAuthenticated,requireAuth};
