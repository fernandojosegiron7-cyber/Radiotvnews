(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let settings={};

  async function api(url,options={}){
    const r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const err=new Error(data.error||"Error del servidor");err.status=r.status;throw err}
    return data;
  }

  function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2300)}
  function status(msg){$("#saveStatus").textContent=msg}

  async function boot(){
    try{const s=await api("/api/session");if(s.authenticated)return enterDashboard()}catch{}
    $("#loginView").hidden=false;
  }

  $("#loginForm").onsubmit=async e=>{
    e.preventDefault();
    $("#loginMsg").textContent="";
    try{
      await api("/api/login",{method:"POST",body:JSON.stringify({password:$("#loginPassword").value})});
      $("#loginPassword").value="";
      await enterDashboard();
    }catch(err){$("#loginMsg").textContent=err.status===429?"Demasiados intentos.":"Contraseña incorrecta."}
  };

  $("#logoutBtn").onclick=async()=>{try{await api("/api/logout",{method:"POST",body:"{}"})}catch{}location.reload()};

  async function enterDashboard(){
    $("#loginView").hidden=true;
    $("#dashboard").hidden=false;
    await loadSettings();
  }

  async function loadSettings(){
    try{
      status("Cargando...");
      const data=await api("/api/admin-config");
      settings=data.settings||{};
      fill();
      status("Configuración cargada");
    }catch(err){
      status("No se pudo cargar");
      toast(err.message);
    }
  }

  function fill(){
    $("#stationNameInput").value=settings.stationName||"";
    $("#shortName").value=settings.shortName||"";
    $("#slogan").value=settings.slogan||"";
    $("#accent").value=settings.accent||"#6D5EF9";
    $("#accent2").value=settings.accent2||"#14B8A6";
    $("#logo").value=settings.logo||"";
    $("#adminStation").textContent=settings.stationName||"Radio & TV";

    $("#radioName").value=settings.radio?.name||"";
    $("#radioStream").value=settings.radio?.streamUrl||"";
    $("#metadataUrl").value=settings.radio?.metadataUrl||"";
    $("#radioArtwork").value=settings.radio?.fallbackArtwork||"";

    $("#tvNameInput").value=settings.tv?.name||"";
    $("#tvStream").value=settings.tv?.streamUrl||"";
    $("#tvPoster").value=settings.tv?.poster||"";

    $("#defaultTheme").value=settings.appearance?.defaultTheme||"auto";
    $("#darkBackground").value=settings.appearance?.darkBackground||"";
    $("#lightBackground").value=settings.appearance?.lightBackground||"";

    for(const k of ["facebook","instagram","tiktok","youtube","whatsapp"]) $("#"+k).value=settings.socials?.[k]||"";

    renderSchedule();
    renderNews();
  }

  function read(){
    settings.stationName=$("#stationNameInput").value.trim();
    settings.shortName=$("#shortName").value.trim();
    settings.slogan=$("#slogan").value.trim();
    settings.accent=$("#accent").value;
    settings.accent2=$("#accent2").value;
    settings.logo=$("#logo").value.trim();

    settings.radio={name:$("#radioName").value.trim(),streamUrl:$("#radioStream").value.trim(),metadataUrl:$("#metadataUrl").value.trim(),fallbackArtwork:$("#radioArtwork").value.trim()};
    settings.tv={name:$("#tvNameInput").value.trim(),streamUrl:$("#tvStream").value.trim(),poster:$("#tvPoster").value.trim()};
    settings.appearance={defaultTheme:$("#defaultTheme").value,darkBackground:$("#darkBackground").value.trim(),lightBackground:$("#lightBackground").value.trim()};
    settings.socials={};
    for(const k of ["facebook","instagram","tiktok","youtube","whatsapp"]) settings.socials[k]=$("#"+k).value.trim();

    settings.schedule=$$("#scheduleEditor .repeat-item").map(item=>({
      time:item.querySelector('[data-field="time"]').value.trim(),
      title:item.querySelector('[data-field="title"]').value.trim(),
      host:item.querySelector('[data-field="host"]').value.trim()
    })).filter(x=>x.time||x.title||x.host);

    settings.news=$$("#newsEditor .repeat-item").map((item,i)=>({
      id:item.dataset.id||`news-${Date.now()}-${i}`,
      date:item.querySelector('[data-field="date"]').value.trim(),
      category:item.querySelector('[data-field="category"]').value.trim()||"Noticias",
      title:item.querySelector('[data-field="title"]').value.trim(),
      image:item.querySelector('[data-field="image"]').value.trim(),
      excerpt:item.querySelector('[data-field="excerpt"]').value.trim(),
      body:item.querySelector('[data-field="body"]').value.trim(),
      featured:item.querySelector('[data-field="featured"]').checked
    })).filter(x=>x.title||x.excerpt||x.body);
  }

  $("#saveBtn").onclick=async()=>{
    read();
    status("Guardando en GitHub...");
    $("#saveBtn").disabled=true;
    try{
      const result=await api("/api/admin-config",{method:"POST",body:JSON.stringify({settings})});
      $("#adminStation").textContent=settings.stationName||"Radio & TV";
      status("Guardado en GitHub");
      toast(result.message||"Guardado");
    }catch(err){status("Error");toast(err.message)}
    finally{$("#saveBtn").disabled=false}
  };

  $$(".tab").forEach(btn=>btn.onclick=()=>{
    $$(".tab").forEach(x=>x.classList.toggle("active",x===btn));
    $$(".panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===btn.dataset.tab));
  });

  function renderSchedule(){
    $("#scheduleEditor").innerHTML="";
    (settings.schedule||[]).forEach(addSchedule);
    if(!(settings.schedule||[]).length)addSchedule({});
  }

  function addSchedule(item={}){
    const div=document.createElement("div");
    div.className="repeat-item";
    div.innerHTML=`<div class="repeat-head"><strong>Programa</strong><button class="danger">Eliminar</button></div>
      <div class="row3"><input data-field="time" value="${attr(item.time||"")}" placeholder="08:00 AM"><input data-field="title" value="${attr(item.title||"")}" placeholder="Programa"><input data-field="host" value="${attr(item.host||"")}" placeholder="Locutor"></div>`;
    div.querySelector(".danger").onclick=()=>div.remove();
    $("#scheduleEditor").appendChild(div);
  }
  $("#addSchedule").onclick=()=>addSchedule({});

  function renderNews(){
    $("#newsEditor").innerHTML="";
    (settings.news||[]).forEach(addNews);
    if(!(settings.news||[]).length)addNews({});
  }

  function addNews(item={}){
    const div=document.createElement("div");
    div.className="repeat-item";
    div.dataset.id=item.id||`news-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    div.innerHTML=`<div class="repeat-head"><strong>Noticia</strong><button class="danger">Eliminar</button></div>
      <div class="news-fields">
        <input data-field="date" value="${attr(item.date||"")}" placeholder="Hoy">
        <input data-field="category" value="${attr(item.category||"Noticias")}" placeholder="Categoría">
        <input data-field="title" value="${attr(item.title||"")}" placeholder="Titular">
        <input data-field="image" value="${attr(item.image||"")}" placeholder="Imagen">
        <textarea data-field="excerpt" placeholder="Resumen">${attr(item.excerpt||"")}</textarea>
        <textarea data-field="body" placeholder="Texto completo">${attr(item.body||"")}</textarea>
        <label><input data-field="featured" type="checkbox" ${item.featured?"checked":""} style="width:auto"> Destacada</label>
        <div class="upload-row"><input data-news-file type="file" accept="image/*"><button class="secondary" data-upload-news>Subir imagen</button></div>
      </div>`;
    div.querySelector(".danger").onclick=()=>div.remove();
    div.querySelector("[data-upload-news]").onclick=()=>uploadNews(div);
    $("#newsEditor").appendChild(div);
  }
  $("#addNews").onclick=()=>addNews({});

  async function uploadNews(div){
    const file=div.querySelector("[data-news-file]").files?.[0];
    if(!file)return toast("Selecciona una imagen");
    const result=await uploadFile(file,"news");
    div.querySelector('[data-field="image"]').value=result.path;
    toast("Imagen subida");
  }

  async function uploadFile(file,folder){
    if(file.size>2.5*1024*1024)throw new Error("La imagen debe pesar menos de 2.5 MB");
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    return api("/api/admin-upload",{method:"POST",body:JSON.stringify({filename:file.name,folder,mime:file.type,dataUrl})});
  }

  async function bindUpload(fileSel,targetSel,folder){
    const file=$(fileSel).files?.[0];
    if(!file)return toast("Selecciona una imagen");
    try{status("Subiendo imagen...");const result=await uploadFile(file,folder);$(targetSel).value=result.path;status("Imagen subida; guarda los cambios");toast("Imagen subida")}catch(err){toast(err.message)}
  }

  $("#uploadLogoBtn").onclick=()=>bindUpload("#logoFile","#logo","logo");
  $("#uploadRadioArtworkBtn").onclick=()=>bindUpload("#radioArtworkFile","#radioArtwork","radio");
  $("#uploadTvPosterBtn").onclick=()=>bindUpload("#tvPosterFile","#tvPoster","tv");
  $("#uploadDarkBgBtn").onclick=()=>bindUpload("#darkBackgroundFile","#darkBackground","background");
  $("#uploadLightBgBtn").onclick=()=>bindUpload("#lightBackgroundFile","#lightBackground","background");

  function attr(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  boot();
})();
