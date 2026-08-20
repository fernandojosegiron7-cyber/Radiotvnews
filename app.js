(async () => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const fallback = window.APP_CONFIG || {};

  async function loadConfig(){
    const sources=[
      `/api/public-config?v=${Date.now()}`,
      `/data/config.json?v=${Date.now()}`
    ];
    for(const url of sources){
      try{
        const r=await fetch(url,{cache:"no-store",headers:{"Cache-Control":"no-cache"}});
        if(!r.ok) continue;
        return deepMerge(fallback,await r.json());
      }catch(e){
        console.warn("No se pudo cargar",url,e);
      }
    }
    return fallback;
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
  const setText = (sel,val) => { const el=$(sel); if(el) el.textContent=val; };

  // Theme
  const saved = localStorage.getItem("fg-theme");
  let themeMode = saved || cfg.appearance?.defaultTheme || "auto";

  function resolvedTheme(mode){
    if(mode==="auto") return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    return mode;
  }

  function applyTheme(){
    const t = resolvedTheme(themeMode);
    document.documentElement.dataset.theme = t;
    const meta=$("#themeColorMeta");
    if(meta) meta.setAttribute("content", t==="light" ? "#f4f7fb" : "#0b1018");

    const bg = t==="light" ? cfg.appearance?.lightBackground : cfg.appearance?.darkBackground;
    const appBg=$("#appBackground");
    if(appBg) appBg.style.backgroundImage = bg ? `url("${bg}")` : "";

    const btn=$("#themeBtn");
    if(btn){
      btn.textContent = themeMode==="auto" ? "◐" : (t==="light" ? "☀" : "☾");
      btn.title = `Tema: ${themeMode}`;
    }
  }

  applyTheme();
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{ if(themeMode==="auto") applyTheme(); });

  const themeBtn=$("#themeBtn");
  if(themeBtn) themeBtn.onclick=()=>{
    themeMode = themeMode==="auto" ? "light" : themeMode==="light" ? "dark" : "auto";
    localStorage.setItem("fg-theme",themeMode);
    applyTheme();
  };

  document.documentElement.style.setProperty("--accent",cfg.accent||"#6D5EF9");
  document.documentElement.style.setProperty("--accent2",cfg.accent2||"#14B8A6");
  document.title=cfg.stationName||"Radio & TV";

  setText("#stationName",cfg.stationName||"Radio & TV");
  setText("#stationSlogan",cfg.slogan||"");
  setText("#heroTitle",cfg.stationName||"Radio & TV");
  setText("#heroText",cfg.slogan||"");
  setText("#tvName",cfg.tv?.name||"TV en vivo");
  setText("#radioStationName",cfg.radio?.name||cfg.stationName||"Radio");

  if(cfg.logo){
    const img=new Image();
    img.src=cfg.logo;
    img.alt="Logo";
    const brand=$("#brandLogo");
    if(brand) brand.replaceChildren(img);
  }

  // Navigation
  const views={
    home:$("#homeView"),
    radio:$("#radioView"),
    tv:$("#tvView"),
    news:$("#newsView"),
    more:$("#moreView")
  };

  function go(name){
    Object.entries(views).forEach(([key,view])=>{
      if(view) view.classList.toggle("active", key===name);
    });

    $$(".nav button").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.go===name);
    });

    window.scrollTo({top:0,behavior:"smooth"});
  }

  $$("[data-go]").forEach(btn=>{
    btn.addEventListener("click",()=>go(btn.dataset.go));
  });

  // Schedule
  const schedule=$("#scheduleList");
  if(schedule){
    schedule.innerHTML=(cfg.schedule||[]).map(x=>`
      <article>
        <time>${esc(x.time)}</time>
        <div><strong>${esc(x.title)}</strong><small>${esc(x.host)}</small></div>
      </article>
    `).join("") || "<p>Sin programación configurada.</p>";
  }

  // News
  const allNews=(cfg.news||[]).map((n,i)=>({...n,id:n.id||`news-${i}`}));
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
    const n=allNews.find(x=>x.id===id);
    if(!n) return;

    setText("#dialogTitle",n.title||"");
    setText("#dialogDate",n.date||"");
    setText("#dialogCategory",n.category||"Noticias");
    setText("#dialogBody",n.body||n.excerpt||"");

    const img=$("#dialogImage");
    if(img){
      img.hidden=!n.image;
      if(n.image) img.src=n.image;
    }

    const dialog=$("#newsDialog");
    if(dialog?.showModal) dialog.showModal();
  }

  const closeNews=$("#closeNews");
  if(closeNews) closeNews.onclick=()=>$("#newsDialog")?.close();

  const featured=allNews.filter(n=>n.featured);
  const hero=featured[0]||allNews[0];
  const secondary=featured[1]||allNews[1];
  const featuredNews=$("#featuredNews");

  if(featuredNews){
    featuredNews.innerHTML=hero ? `
      <article class="featured-main" data-news-id="${esc(hero.id)}">
        <div class="news-bg" style="${hero.image?`background-image:url('${esc(hero.image)}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div>
        <div class="news-content">
          <span class="news-category">${esc(hero.category||"Noticias")}</span>
          <h3>${esc(hero.title)}</h3>
          <small>${esc(hero.date||"")}</small>
        </div>
      </article>
      ${secondary?`
        <article class="featured-side" data-news-id="${esc(secondary.id)}">
          <span class="news-category">${esc(secondary.category||"Noticias")}</span>
          <h3>${esc(secondary.title)}</h3>
          <p>${esc(secondary.excerpt||"")}</p>
          <small>${esc(secondary.date||"")}</small>
        </article>`:""}
    ` : "<p>Sin noticias destacadas.</p>";
  }

  const homeNews=$("#homeNewsGrid");
  if(homeNews) homeNews.innerHTML=allNews.slice(0,6).map(newsCard).join("");
  bindNewsClicks();

  const cats=["Todas",...new Set(allNews.map(n=>n.category||"Noticias"))];
  const categories=$("#newsCategories");
  if(categories){
    categories.innerHTML=cats.map(c=>`<button class="${c==="Todas"?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  }

  function renderNewsPage(){
    const list=currentCategory==="Todas" ? allNews : allNews.filter(n=>(n.category||"Noticias")===currentCategory);
    const h=list.find(n=>n.featured)||list[0];

    const heroBox=$("#newsHero");
    if(heroBox){
      heroBox.innerHTML=h ? `
        <article class="news-hero-card" data-news-id="${esc(h.id)}">
          <div class="bg" style="${h.image?`background-image:url('${esc(h.image)}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div>
          <div class="content">
            <span class="news-category">${esc(h.category||"Noticias")}</span>
            <h2>${esc(h.title)}</h2>
            <small>${esc(h.date||"")}</small>
          </div>
        </article>` : "";
    }

    const grid=$("#newsGrid");
    if(grid) grid.innerHTML=list.map(newsCard).join("") || "<p>No hay noticias en esta categoría.</p>";
    bindNewsClicks();
  }

  renderNewsPage();

  $$("#newsCategories button").forEach(btn=>{
    btn.onclick=()=>{
      currentCategory=btn.dataset.cat;
      $$("#newsCategories button").forEach(x=>x.classList.toggle("active",x===btn));
      renderNewsPage();
    };
  });

  // Socials
  const socialNames={facebook:"Facebook",instagram:"Instagram",tiktok:"TikTok",youtube:"YouTube",whatsapp:"WhatsApp"};
  const socials=$("#socialLinks");
  if(socials){
    socials.innerHTML=Object.entries(cfg.socials||{})
      .filter(([,url])=>url)
      .map(([key,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener">${socialNames[key]||key}</a>`)
      .join("") || "<span style='color:var(--muted);font-size:13px'>Redes no configuradas.</span>";
  }

  // Radio
  function normalizeZenoAudioUrl(url=""){
    const value=String(url).trim();
    if(!/stream\.zeno\.fm/i.test(value)) return value;
    return value.replace(/\.(m3u8?|pls)(\?.*)?$/i,"$2");
  }

  const audio=$("#radioAudio");
  const radioUrl=normalizeZenoAudioUrl(cfg.radio?.streamUrl||"");
  if(audio){
    if(radioUrl) audio.src=radioUrl;
    audio.volume=.8;
  }

  const playBtn=$("#radioPlay");

  function radioUI(playing){
    document.body.classList.toggle("playing",playing);
    if(playBtn) playBtn.textContent=playing?"❚❚":"▶";
    setText("#radioStatus",playing?"REPRODUCIENDO EN VIVO":"RADIO EN VIVO");
    setText("#radioConnection",playing?"CONECTADA":"LISTA");
    setText("#radioState",playing?"Transmitiendo":"Disponible");
  }

  async function toggleRadio(){
    if(!radioUrl||!audio){
      toast("Agrega la URL de tu radio desde Administración");
      return;
    }
    try{
      if(audio.paused){
        setText("#radioConnection","CONECTANDO");
        await audio.play();
        radioUI(true);
      }else{
        audio.pause();
        radioUI(false);
      }
    }catch(e){
      console.error(e);
      setText("#radioConnection","ERROR");
      toast("No se pudo reproducir el stream");
    }
  }

  if(playBtn) playBtn.onclick=toggleRadio;

  const volume=$("#volume");
  if(volume&&audio) volume.oninput=e=>audio.volume=Number(e.target.value);

  if(audio){
    audio.onplaying=()=>radioUI(true);
    audio.onpause=()=>radioUI(false);
    audio.onerror=()=>{
      setText("#radioConnection","ERROR");
      setText("#radioState","Sin señal");
      radioUI(false);
      toast("Error en el stream de radio");
    };
  }

  function applyMetadata(title,artist,artwork){
    const safeTitle=title||"En vivo";
    const safeArtist=artist||cfg.radio?.name||cfg.stationName||"";

    setText("#radioTitle",safeTitle);
    setText("#radioArtist",safeArtist);

    if(artwork){
      const art=$("#radioArtwork");
      if(art) art.innerHTML=`<img src="${esc(artwork)}" alt="">`;
    }

    if("mediaSession" in navigator){
      try{
        navigator.mediaSession.metadata=new MediaMetadata({
          title:safeTitle,
          artist:safeArtist,
          album:cfg.stationName||"",
          artwork:artwork?[{src:artwork}]:[]
        });
      }catch{}
    }
  }

  function splitStreamTitle(value=""){
    const raw=String(value||"").trim();
    if(!raw) return {title:"En vivo",artist:cfg.radio?.name||cfg.stationName||""};

    const pos=raw.indexOf(" - ");
    if(pos>0){
      return {
        artist:raw.slice(0,pos).trim(),
        title:raw.slice(pos+3).trim()
      };
    }

    return {title:raw,artist:cfg.radio?.name||cfg.stationName||""};
  }

  function parseMetadata(data){
    if(!data||typeof data!=="object") return null;

    const streamTitle=data.streamTitle||data.stream_title||data.now_playing?.song?.text||"";
    if(streamTitle){
      const split=splitStreamTitle(streamTitle);
      return {
        title:data.title||data.track?.title||split.title,
        artist:data.artist||data.track?.artist||split.artist,
        artwork:data.artwork||data.cover||data.track?.artwork||cfg.radio?.fallbackArtwork||""
      };
    }

    const title=data.title||data.song||data.track?.title||data.currentSong||"";
    const artist=data.artist||data.track?.artist||data.currentArtist||"";
    if(title||artist){
      return {
        title:title||"En vivo",
        artist:artist||cfg.radio?.name||cfg.stationName||"",
        artwork:data.artwork||data.cover||data.track?.artwork||cfg.radio?.fallbackArtwork||""
      };
    }
    return null;
  }

  let zenoSource=null;

  function connectZenoMetadata(url){
    if(!url || typeof EventSource==="undefined") return false;
    if(!/api\.zeno\.fm\/mounts\/metadata\/subscribe\//i.test(url)) return false;

    try{
      zenoSource=new EventSource(url);

      zenoSource.onmessage=event=>{
        try{
          const parsed=parseMetadata(JSON.parse(event.data));
          if(parsed) applyMetadata(parsed.title,parsed.artist,parsed.artwork);
        }catch(e){
          console.warn("Metadata Zeno inválida",e);
        }
      };

      zenoSource.onerror=()=>{
        console.warn("Zeno metadata reconectando...");
      };

      return true;
    }catch(e){
      console.warn("No se pudo iniciar metadata Zeno",e);
      return false;
    }
  }

  async function refreshJsonMetadata(){
    const url=cfg.radio?.metadataUrl;
    if(!url) return;

    try{
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok) return;
      const parsed=parseMetadata(await r.json());
      if(parsed) applyMetadata(parsed.title,parsed.artist,parsed.artwork);
    }catch(e){
      console.warn("Metadata JSON",e);
    }
  }

  if(cfg.radio?.fallbackArtwork){
    applyMetadata("Listo para reproducir",cfg.radio?.name||cfg.stationName||"",cfg.radio.fallbackArtwork);
  }

  const metadataUrl=String(cfg.radio?.metadataUrl||"").trim();
  const zenoSSE=connectZenoMetadata(metadataUrl);

  if(!zenoSSE && metadataUrl){
    refreshJsonMetadata();
    setInterval(refreshJsonMetadata,15000);
  }

  window.addEventListener("beforeunload",()=>zenoSource?.close());

  // TV
  const video=$("#tvVideo");
  const tvUrl=cfg.tv?.streamUrl||"";

  if(video&&cfg.tv?.poster) video.poster=cfg.tv.poster;

  if(video&&tvUrl){
    const empty=$("#tvEmpty");
    if(empty) empty.style.display="none";

    if(video.canPlayType("application/vnd.apple.mpegurl")){
      video.src=tvUrl;
    }else if(window.Hls&&Hls.isSupported()){
      const hls=new Hls({enableWorker:true,lowLatencyMode:true});
      hls.loadSource(tvUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR,(_,data)=>{
        if(data.fatal) toast("Error en la señal de TV");
      });
    }else{
      video.src=tvUrl;
    }
  }

  // PWA install
  let deferred;
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferred=e;
    const btn=$("#installBtn");
    if(btn) btn.hidden=false;
  });

  const installBtn=$("#installBtn");
  if(installBtn){
    installBtn.onclick=async()=>{
      if(!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred=null;
      installBtn.hidden=true;
    };
  }

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>{
      navigator.serviceWorker.register("sw.js").catch(console.error);
    });
  }

  function toast(msg){
    const el=$("#toast");
    if(!el) return;
    el.textContent=msg;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>el.classList.remove("show"),2200);
  }
})();
