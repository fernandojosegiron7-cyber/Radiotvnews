(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  let settings={};

  function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2400)}
  function setStatus(text,changed=false){$("#saveStatus").textContent=text}
  async function api(url,options={}){const r=await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});const data=await r.json().catch(()=>({}));if(!r.ok){const err=new Error(data.error||"Error del servidor");err.status=r.status;throw err}return data}

  async function boot(){try{const s=await api("/api/session");if(s.authenticated)return enterDashboard()}catch{}$("#loginView").hidden=false}
  $("#loginForm").addEventListener("submit",async e=>{e.preventDefault();$("#loginMsg").textContent="";try{await api("/api/login",{method:"POST",body:JSON.stringify({password:$("#loginPassword").value})});$("#loginPassword").value="";await enterDashboard()}catch(e){$("#loginMsg").textContent=e.status===429?"Demasiados intentos. Intenta más tarde.":"Contraseña incorrecta."}});
  $("#logoutBtn").onclick=async()=>{try{await api("/api/logout",{method:"POST",body:"{}"})}catch{}location.reload()};
  async function enterDashboard(){$("#loginView").hidden=true;$("#dashboard").hidden=false;await loadSettings()}
  async function loadSettings(){try{setStatus("Cargando configuración...");const data=await api("/api/admin-config");settings=data.settings||{};fillForm();setStatus("Configuración cargada")}catch(e){if(e.status===401)return location.reload();setStatus("No se pudo cargar");toast(e.message)}}

  function fillForm(){
    $("#stationName").value=settings.stationName||"";$("#shortName").value=settings.shortName||"";$("#slogan").value=settings.slogan||"";
    $("#accent").value=settings.accent||"#6D5EF9";$("#accent2").value=settings.accent2||"#14B8A6";$("#logo").value=settings.logo||"";
    $("#adminStation").textContent=settings.stationName||"Radio & TV";
    $("#radioName").value=settings.radio?.name||"";$("#radioStream").value=settings.radio?.streamUrl||"";$("#metadataUrl").value=settings.radio?.metadataUrl||"";$("#radioArtwork").value=settings.radio?.fallbackArtwork||"";
    $("#tvName").value=settings.tv?.name||"";$("#tvStream").value=settings.tv?.streamUrl||"";$("#tvPoster").value=settings.tv?.poster||"";
    for(const k of ["facebook","instagram","tiktok","youtube","whatsapp"])$("#"+k).value=settings.socials?.[k]||"";
    $("#defaultTheme").value=settings.appearance?.defaultTheme||"auto";$("#darkBackground").value=settings.appearance?.darkBackground||"";$("#lightBackground").value=settings.appearance?.lightBackground||"";
    renderSchedule();renderNews();updateLogoPreview()
  }

  function readForm(){
    settings.stationName=$("#stationName").value.trim();settings.shortName=$("#shortName").value.trim();settings.slogan=$("#slogan").value.trim();
    settings.accent=$("#accent").value;settings.accent2=$("#accent2").value;settings.logo=$("#logo").value.trim();
    settings.radio={name:$("#radioName").value.trim(),streamUrl:$("#radioStream").value.trim(),metadataUrl:$("#metadataUrl").value.trim(),fallbackArtwork:$("#radioArtwork").value.trim()};
    settings.tv={name:$("#tvName").value.trim(),streamUrl:$("#tvStream").value.trim(),poster:$("#tvPoster").value.trim()};
    settings.socials={};for(const k of ["facebook","instagram","tiktok","youtube","whatsapp"])settings.socials[k]=$("#"+k).value.trim();
    settings.appearance={defaultTheme:$("#defaultTheme").value,darkBackground:$("#darkBackground").value.trim(),lightBackground:$("#lightBackground").value.trim()};
    settings.schedule=$$("#scheduleEditor .repeat-item").map(item=>({time:item.querySelector('[data-field="time"]').value.trim(),title:item.querySelector('[data-field="title"]').value.trim(),host:item.querySelector('[data-field="host"]').value.trim()})).filter(x=>x.time||x.title||x.host);
    settings.news=$$("#newsEditor .repeat-item").map((item,i)=>({
      id:item.dataset.id||`news-${Date.now()}-${i}`,
      date:item.querySelector('[data-field="date"]').value.trim(),
      category:item.querySelector('[data-field="category"]').value.trim()||"Noticias",
      title:item.querySelector('[data-field="title"]').value.trim(),
      image:item.querySelector('[data-field="image"]').value.trim(),
      excerpt:item.querySelector('[data-field="excerpt"]').value.trim(),
      body:item.querySelector('[data-field="body"]').value.trim(),
      featured:item.querySelector('[data-field="featured"]').checked
    })).filter(x=>x.title||x.excerpt||x.body)
  }

  $("#saveBtn").onclick=async()=>{readForm();$("#saveBtn").disabled=true;setStatus("Guardando commit en GitHub...");try{const result=await api("/api/admin-config",{method:"POST",body:JSON.stringify({settings})});$("#adminStation").textContent=settings.stationName||"Radio & TV";setStatus("Guardado en GitHub");toast(result.message||"Configuración guardada")}catch(e){setStatus("Error al guardar");toast(e.message)}finally{$("#saveBtn").disabled=false}};

  $$(".tab").forEach(btn=>btn.onclick=()=>{$$(".tab").forEach(x=>x.classList.toggle("active",x===btn));$$(".panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===btn.dataset.tab));scrollTo({top:0,behavior:"smooth"})});
  document.addEventListener("input",e=>{if($("#dashboard").contains(e.target))setStatus("Cambios sin guardar");if(e.target.id==="logo")updateLogoPreview()});

  function renderSchedule(){$("#scheduleEditor").innerHTML="";(settings.schedule||[]).forEach(addScheduleRow);if(!(settings.schedule||[]).length)addScheduleRow({})}
  function addScheduleRow(item={}){
    const div=document.createElement("div");div.className="repeat-item";
    div.innerHTML=`<div class="repeat-head"><strong>Programa</strong><button class="danger" type="button">Eliminar</button></div><div class="row3"><input data-field="time" value="${attr(item.time||"")}" placeholder="08:00 AM"><input data-field="title" value="${attr(item.title||"")}" placeholder="Nombre del programa"><input data-field="host" value="${attr(item.host||"")}" placeholder="Locutor / Presentador"></div>`;
    div.querySelector(".danger").onclick=()=>{div.remove();setStatus("Cambios sin guardar")};$("#scheduleEditor").appendChild(div)
  }
  $("#addSchedule").onclick=()=>{addScheduleRow();setStatus("Cambios sin guardar")};

  function renderNews(){$("#newsEditor").innerHTML="";(settings.news||[]).forEach(addNewsRow);if(!(settings.news||[]).length)addNewsRow({})}
  function addNewsRow(item={}){
    const div=document.createElement("div");div.className="repeat-item";div.dataset.id=item.id||`news-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    div.innerHTML=`
      <div class="repeat-head"><strong>Noticia</strong><button class="danger" type="button">Eliminar</button></div>
      <div class="news-fields">
        <input data-field="date" value="${attr(item.date||"")}" placeholder="Hoy">
        <input data-field="category" value="${attr(item.category||"Noticias")}" placeholder="Categoría">
        <input data-field="title" value="${attr(item.title||"")}" placeholder="Titular">
        <input data-field="image" value="${attr(item.image||"")}" placeholder="/assets/uploads/news/...">
        <textarea data-field="excerpt" placeholder="Resumen corto">${attr(item.excerpt||"")}</textarea>
        <textarea data-field="body" placeholder="Texto completo de la noticia">${attr(item.body||"")}</textarea>
        <label style="display:flex;align-items:center;gap:8px"><input data-field="featured" type="checkbox" ${item.featured?"checked":""} style="width:auto"> Destacar noticia</label>
        <div class="upload-row"><input data-news-file type="file" accept="image/png,image/jpeg,image/webp"><button class="secondary" data-upload-news type="button">Subir imagen</button></div>
      </div>`;
    div.querySelector(".danger").onclick=()=>{div.remove();setStatus("Cambios sin guardar")};
    div.querySelector("[data-upload-news]").onclick=()=>uploadNewsImage(div);
    $("#newsEditor").appendChild(div)
  }
  $("#addNews").onclick=()=>{addNewsRow();setStatus("Cambios sin guardar")};

  $("#uploadLogoBtn").onclick=()=>upload("#logoFile","#logo","logo");
  $("#uploadRadioArtworkBtn").onclick=()=>upload("#radioArtworkFile","#radioArtwork","radio");
  $("#uploadTvPosterBtn").onclick=()=>upload("#tvPosterFile","#tvPoster","tv");
  $("#uploadDarkBgBtn").onclick=()=>upload("#darkBackgroundFile","#darkBackground","background");
  $("#uploadLightBgBtn").onclick=()=>upload("#lightBackgroundFile","#lightBackground","background");

  async function uploadNewsImage(div){
    const file=div.querySelector("[data-news-file]").files?.[0];if(!file)return toast("Selecciona una imagen");
    try{setStatus("Subiendo imagen...");const dataUrl=await toDataUrl(file);const result=await api("/api/admin-upload",{method:"POST",body:JSON.stringify({filename:file.name,folder:"news",mime:file.type,dataUrl})});div.querySelector('[data-field="image"]').value=result.path;setStatus("Imagen subida; guarda la configuración");toast("Imagen guardada en GitHub")}catch(e){toast(e.message)}
  }

  async function upload(fileSel,targetSel,folder){
    const file=$(fileSel).files?.[0];if(!file)return toast("Selecciona una imagen");if(file.size>2.5*1024*1024)return toast("La imagen debe pesar menos de 2.5 MB");
    try{setStatus("Subiendo imagen a GitHub...");const dataUrl=await toDataUrl(file);const result=await api("/api/admin-upload",{method:"POST",body:JSON.stringify({filename:file.name,folder,mime:file.type,dataUrl})});$(targetSel).value=result.path;if(targetSel==="#logo")updateLogoPreview();setStatus("Imagen subida; guarda la configuración");toast("Imagen guardada en GitHub")}catch(e){toast(e.message)}
  }
  function toDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
  function updateLogoPreview(){const u=$("#logo").value.trim();$("#logoPreview").hidden=!u;if(u)$("#logoPreview").src=u}
  function attr(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  boot()
})();
