(async () => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fallback = window.APP_CONFIG || {};

  async function loadConfig(){
    try{
      const r = await fetch(`/data/config.json?v=${Date.now()}`, {cache:"no-store"});
      if(!r.ok) throw new Error("config");
      return deepMerge(fallback, await r.json());
    }catch(e){ return fallback; }
  }
  function deepMerge(base, remote){
    if(!remote || typeof remote!=="object") return base;
    const out = Array.isArray(base) ? [...base] : {...base};
    for(const [k,v] of Object.entries(remote)){
      if(v && typeof v==="object" && !Array.isArray(v) && base?.[k] && typeof base[k]==="object" && !Array.isArray(base[k]))
        out[k]=deepMerge(base[k],v);
      else out[k]=v;
    }
    return out;
  }
  const cfg = await loadConfig();
  const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

  // Theme: auto / light / dark + manual cycle
  const saved = localStorage.getItem("fg-theme");
  const defaultTheme = cfg.appearance?.defaultTheme || "auto";
  let themeMode = saved || defaultTheme;
  function resolvedTheme(mode){
    if(mode==="auto") return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    return mode;
  }
  function applyTheme(){
    const t = resolvedTheme(themeMode);
    document.documentElement.dataset.theme = t;
    $("#themeColorMeta").setAttribute("content", t==="light" ? "#f4f7fb" : "#0b1018");
    const bg = t==="light" ? cfg.appearance?.lightBackground : cfg.appearance?.darkBackground;
    $("#appBackground").style.backgroundImage = bg ? `url("${bg}")` : "";
    $("#themeBtn").textContent = themeMode==="auto" ? "◐" : (t==="light" ? "☀" : "☾");
    $("#themeBtn").title = `Tema: ${themeMode}`;
  }
  applyTheme();
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{ if(themeMode==="auto") applyTheme(); });
  $("#themeBtn").onclick = () => {
    themeMode = themeMode==="auto" ? "light" : themeMode==="light" ? "dark" : "auto";
    localStorage.setItem("fg-theme", themeMode);
    applyTheme();
  };

  document.documentElement.style.setProperty("--accent",cfg.accent||"#6D5EF9");
  document.documentElement.style.setProperty("--accent2",cfg.accent2||"#14B8A6");
  document.title=cfg.stationName||"Radio & TV";
  $("#stationName").textContent=cfg.stationName||"Radio & TV";
  $("#stationSlogan").textContent=cfg.slogan||"";
  $("#heroTitle").textContent=cfg.stationName||"Radio & TV";
  $("#heroText").textContent=cfg.slogan||"";
  $("#tvName").textContent=cfg.tv?.name||"TV en vivo";
  $("#homeTvName").textContent=cfg.tv?.name||"TV en vivo";
  $("#radioStationName").textContent=cfg.radio?.name||cfg.stationName||"Radio";
  if(cfg.logo){const i=new Image();i.src=cfg.logo;i.alt="Logo";$("#brandLogo").replaceChildren(i)}

  const views={home:$("#homeView"),radio:$("#radioView"),tv:$("#tvView"),news:$("#newsView"),more:$("#moreView")};
  function go(n){Object.entries(views).forEach(([k,v])=>v.classList.toggle("active",k===n));scrollTo({top:0,behavior:"smooth"})}
  $$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

  // Schedule
  $("#scheduleList").innerHTML=(cfg.schedule||[]).map(x=>`<article><time>${esc(x.time)}</time><div><strong>${esc(x.title)}</strong><small>${esc(x.host)}</small></div></article>`).join("")||"<p>Sin programación configurada.</p>";

  // News
  const allNews = (cfg.news||[]).map((n,i)=>({...n,id:n.id||`news-${i}`}));
  let currentCategory="Todas";
  function newsCard(n){
    return `<article data-news-id="${esc(n.id)}">
      <div class="newsimg">${n.image?`<img src="${esc(n.image)}" alt="">`:"▣"}</div>
      <div class="newsbody">
        <span class="news-category">${esc(n.category||"Noticias")}</span>
        <h3>${esc(n.title)}</h3>
        <time>${esc(n.date||"")}</time>
        <p>${esc(n.excerpt||"")}</p>
      </div>
    </article>`;
  }
  function bindNewsClicks(){
    $$("[data-news-id]").forEach(el=>el.onclick=()=>openNews(el.dataset.newsId));
  }
  function openNews(id){
    const n=allNews.find(x=>x.id===id); if(!n)return;
    $("#dialogTitle").textContent=n.title||"";
    $("#dialogDate").textContent=n.date||"";
    $("#dialogCategory").textContent=n.category||"Noticias";
    $("#dialogBody").textContent=n.body||n.excerpt||"";
    $("#dialogImage").hidden=!n.image;
    if(n.image) $("#dialogImage").src=n.image;
    $("#newsDialog").showModal();
  }
  $("#closeNews").onclick=()=>$("#newsDialog").close();

  const featured=allNews.filter(n=>n.featured);
  const hero=featured[0]||allNews[0];
  const secondary=featured[1]||allNews[1];
  $("#featuredNews").innerHTML = hero ? `
    <article class="featured-main" data-news-id="${esc(hero.id)}">
      <div class="news-bg" style="${hero.image?`background-image:url('${esc(hero.image)}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div>
      <div class="news-content"><span class="news-category">${esc(hero.category||"Noticias")}</span><h3>${esc(hero.title)}</h3><small>${esc(hero.date||"")}</small></div>
    </article>
    ${secondary?`<article class="featured-side" data-news-id="${esc(secondary.id)}"><span class="news-category">${esc(secondary.category||"Noticias")}</span><h3>${esc(secondary.title)}</h3><p>${esc(secondary.excerpt||"")}</p><small>${esc(secondary.date||"")}</small></article>`:""}
  ` : "<p>Sin noticias destacadas.</p>";
  $("#homeNewsGrid").innerHTML = allNews.slice(0,6).map(newsCard).join("");
  bindNewsClicks();

  const cats=["Todas",...new Set(allNews.map(n=>n.category||"Noticias"))];
  $("#newsCategories").innerHTML=cats.map(c=>`<button class="${c==="Todas"?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  function renderNewsPage(){
    const list=currentCategory==="Todas"?allNews:allNews.filter(n=>(n.category||"Noticias")===currentCategory);
    const h=list.find(n=>n.featured)||list[0];
    $("#newsHero").innerHTML=h?`<article class="news-hero-card" data-news-id="${esc(h.id)}"><div class="bg" style="${h.image?`background-image:url('${esc(h.image)}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div><div class="content"><span class="news-category">${esc(h.category||"Noticias")}</span><h2>${esc(h.title)}</h2><small>${esc(h.date||"")}</small></div></article>`:"";
    $("#newsGrid").innerHTML=list.map(newsCard).join("")||"<p>No hay noticias en esta categoría.</p>";
    bindNewsClicks();
  }
  renderNewsPage();
  $$("#newsCategories button").forEach(b=>b.onclick=()=>{
    currentCategory=b.dataset.cat;
    $$("#newsCategories button").forEach(x=>x.classList.toggle("active",x===b));
    renderNewsPage();
  });

  // Socials
  const names={facebook:"Facebook",instagram:"Instagram",tiktok:"TikTok",youtube:"YouTube",whatsapp:"WhatsApp"};
  $("#socialLinks").innerHTML=Object.entries(cfg.socials||{}).filter(([,u])=>u).map(([k,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${names[k]||k}</a>`).join("")||"<span style='color:var(--muted);font-size:13px'>Redes no configuradas.</span>";

  // Radio
  const audio=$("#radioAudio"),url=cfg.radio?.streamUrl||"";
  if(url)audio.src=url;
  audio.volume=.8;
  const buttons=[$("#radioPlay"),$("#miniPlay")];

  function radioUI(p){
    document.body.classList.toggle("playing",p);
    buttons.forEach(b=>b.textContent=p?"❚❚":"▶");
    $("#radioStatus").textContent=p?"REPRODUCIENDO EN VIVO":"RADIO EN VIVO";
    $("#miniStatus").textContent=p?"Reproduciendo":(cfg.radio?.name||"Radio en vivo");
    $("#radioConnection").textContent=p?"CONECTADA":"LISTA";
    $("#radioState").textContent=p?"Transmitiendo":"Disponible";
  }
  async function toggle(){
    if(!url)return toast("Agrega la URL de tu radio desde Administración");
    try{
      if(audio.paused){$("#radioConnection").textContent="CONECTANDO";await audio.play();radioUI(true)}
      else{audio.pause();radioUI(false)}
    }catch(e){console.error(e);$("#radioConnection").textContent="ERROR";toast("No se pudo reproducir el stream")}
  }
  buttons.forEach(b=>b.onclick=toggle);
  $("#volume").oninput=e=>audio.volume=+e.target.value;
  audio.onplaying=()=>radioUI(true);
  audio.onpause=()=>radioUI(false);
  audio.onerror=()=>{$("#radioConnection").textContent="ERROR";$("#radioState").textContent="Sin señal";radioUI(false);toast("Error en el stream de radio")};

  function meta(title,artist,art){
    $("#radioTitle").textContent=title;
    $("#radioArtist").textContent=artist;
    $("#miniTitle").textContent=title;
    $("#miniArtist").textContent=artist;
    if(art){const h=`<img src="${esc(art)}" alt="">`;$("#radioArtwork").innerHTML=h;$("#miniArtwork").innerHTML=h}
    if("mediaSession"in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title,artist,album:cfg.stationName||"",artwork:art?[{src:art}]:[]})}catch{}}
  }
  async function refreshMetadata(){
    const u=cfg.radio?.metadataUrl;if(!u)return;
    try{const r=await fetch(u,{cache:"no-store"});if(!r.ok)return;const d=await r.json();meta(d.title||d.song||d.track?.title||"En vivo",d.artist||d.track?.artist||cfg.stationName||"",d.artwork||d.cover||d.track?.artwork||cfg.radio?.fallbackArtwork||"")}catch{}
  }
  if(cfg.radio?.fallbackArtwork)meta("Listo para reproducir",cfg.stationName||"",cfg.radio.fallbackArtwork);
  refreshMetadata();setInterval(refreshMetadata,15000);

  // TV HLS
  const video=$("#tvVideo"),tv=cfg.tv?.streamUrl||"";
  if(cfg.tv?.poster)video.poster=cfg.tv.poster;
  if(tv){
    $("#tvEmpty").style.display="none";
    if(video.canPlayType("application/vnd.apple.mpegurl"))video.src=tv;
    else if(window.Hls&&Hls.isSupported()){const h=new Hls({enableWorker:true,lowLatencyMode:true});h.loadSource(tv);h.attachMedia(video);h.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal)toast("Error en la señal de TV")})}
    else video.src=tv;
  }

  // Install
  let deferred;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});
  $("#installBtn").onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("#installBtn").hidden=true};

  if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
  function toast(m){const e=$("#toast");e.textContent=m;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2200)}
})();
