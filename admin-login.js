(() => {
  const $=s=>document.querySelector(s);

  async function api(url,options={}){
    const r=await fetch(url,{
      credentials:"same-origin",
      headers:{"Content-Type":"application/json",...(options.headers||{})},
      ...options
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      const err=new Error(data.error||"Error del servidor");
      err.status=r.status;
      throw err;
    }
    return data;
  }

  async function checkSession(){
    try{
      const session=await api("/api/session");
      if(session.authenticated){
        location.replace("/dashboard.html");
      }
    }catch{}
  }

  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault();

    const msg=$("#loginMsg");
    const btn=$("#loginBtn");
    msg.textContent="";
    btn.disabled=true;
    btn.textContent="Ingresando...";

    try{
      await api("/api/login",{
        method:"POST",
        body:JSON.stringify({password:$("#loginPassword").value})
      });

      $("#loginPassword").value="";
      location.replace("/dashboard.html");
    }catch(err){
      msg.textContent=err.status===429
        ?"Demasiados intentos. Intenta nuevamente más tarde."
        :"Contraseña incorrecta.";
      btn.disabled=false;
      btn.textContent="Iniciar sesión";
    }
  });

  checkSession();
})();
