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

  function buildNewsUrl(id){
    const u=new URL(window.location.href);
    u.hash=id?`news=${encodeURIComponent(id)}`:"";
    return u.toString();
  }

  function newsIdFromHash(){
    const raw=window.location.hash.replace(/^#/,"");
    if(!raw.startsWith("news="))return "";
    try{return decodeURIComponent(raw.slice(5))}catch{return raw.slice(5)}
  }
  const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const setText = (sel,val) => { const el=$(sel); if(el) el.textContent=val; };

  function liveAsset(value=""){
    const raw=String(value||"").trim();
    if(!raw) return "";
    if(raw.startsWith("/assets/uploads/")){
      return `/api/public-asset?path=${encodeURIComponent(raw.slice(1))}`;
    }
    return raw;
  }


  // Hora y clima en barra superior
  function initTopClock(){
    const el=$("#topClock");
    if(!el) return;

    const update=()=>{
      const now=new Date();
      el.textContent=now.toLocaleTimeString("es-HN",{
        hour:"2-digit",
        minute:"2-digit",
        hour12:true
      });
    };

    update();
    setInterval(update,1000);
  }

  function weatherDescription(code){
    const map={
      0:["☀","Despejado"],
      1:["🌤","Mayormente despejado"],
      2:["⛅","Parcialmente nublado"],
      3:["☁","Nublado"],
      45:["🌫","Niebla"],
      48:["🌫","Niebla"],
      51:["🌦","Llovizna ligera"],
      53:["🌦","Llovizna"],
      55:["🌧","Llovizna fuerte"],
      61:["🌦","Lluvia ligera"],
      63:["🌧","Lluvia"],
      65:["🌧","Lluvia fuerte"],
      80:["🌦","Chubascos"],
      81:["🌧","Chubascos"],
      82:["⛈","Chubascos fuertes"],
      95:["⛈","Tormenta"],
      96:["⛈","Tormenta con granizo"],
      99:["⛈","Tormenta fuerte"]
    };
    return map[Number(code)]||["◌","Clima"];
  }

  function paintWeather({temperature,code,place}){
    const temp=$("#weatherTemp");
    const cond=$("#weatherCondition");
    const icon=$("#weatherIcon");
    const placeEl=$("#weatherPlace");
    if(!temp||!cond||!icon) return;

    const [ico,text]=weatherDescription(code);
    icon.textContent=ico;
    temp.textContent=Number.isFinite(Number(temperature))
      ? `${Math.round(Number(temperature))}°C`
      : "--°";
    cond.textContent=text;
    if(placeEl) placeEl.textContent=String(place||"HONDURAS").toUpperCase();

    try{
      localStorage.setItem("weather-cache",JSON.stringify({
        ts:Date.now(),
        temperature,
        code,
        place
      }));
    }catch{}
  }

  async function fetchWeather(latitude,longitude,place){
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code&temperature_unit=celsius&timezone=auto`;
    const r=await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("weather");
    const data=await r.json();
    paintWeather({
      temperature:data.current?.temperature_2m,
      code:data.current?.weather_code,
      place
    });
  }

  async function fallbackWeather(){
    // Respaldo: Tegucigalpa, Honduras, para que nunca quede la barra vacía.
    try{
      await fetchWeather(14.0723,-87.1921,"Tegucigalpa");
    }catch{
      const cond=$("#weatherCondition");
      if(cond) cond.textContent="Clima no disponible";
    }
  }

  function loadWeather(force=false){
    const cond=$("#weatherCondition");
    const icon=$("#weatherIcon");

    if(force){
      if(cond) cond.textContent="Actualizando...";
      if(icon) icon.textContent="◌";
    }

    // Mostrar caché de inmediato mientras llega una actualización.
    try{
      const cached=JSON.parse(localStorage.getItem("weather-cache")||"null");
      if(cached && Date.now()-cached.ts<60*60*1000){
        paintWeather(cached);
      }
    }catch{}

    if(!("geolocation" in navigator)){
      fallbackWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos=>{
        fetchWeather(
          pos.coords.latitude,
          pos.coords.longitude,
          "Tu ubicación"
        ).catch(fallbackWeather);
      },
      ()=>fallbackWeather(),
      {
        enableHighAccuracy:false,
        timeout:6500,
        maximumAge:10*60*1000
      }
    );
  }

  initTopClock();
  loadWeather(false);
  setInterval(()=>loadWeather(false),10*60*1000);
  $("#weatherInfo")?.addEventListener("click",()=>loadWeather(true));

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
    if(appBg) appBg.style.backgroundImage = bg ? `url("${liveAsset(bg)}")` : "";

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

  // El logo cargado desde Admin también es el favicon de la web.
  const currentLogo=liveAsset(cfg.logo||"");
  if(currentLogo){
    const bust=currentLogo+(currentLogo.includes("?")?"&":"?")+"v="+Date.now();
    const fav=$("#favicon");
    const apple=$("#appleTouchIcon");
    if(fav){
      fav.href=bust;
      fav.type="";
    }
    if(apple) apple.href=bust;
  }

  // La Radio siempre muestra el logo principal, nunca una carátula distinta.
  const radioLogo=$("#radioArtwork");
  if(radioLogo && currentLogo){
    radioLogo.innerHTML=`<img src="${esc(currentLogo)}" alt="Logo de la emisora">`;
  }

  if(cfg.logo){
    const logoSrc=liveAsset(cfg.logo);

    const img=new Image();
    img.src=logoSrc;
    img.alt="Logo";
    const brand=$("#brandLogo");
    if(brand) brand.replaceChildren(img);

    const heroImg=new Image();
    heroImg.src=logoSrc;
    heroImg.alt="Logo";
    const heroLogo=$("#heroLogo");
    if(heroLogo) heroLogo.replaceChildren(heroImg);
  }

  // Navigation
  const views={
    home:$("#homeView"),
    radio:$("#radioView"),
    tv:$("#tvView"),
    news:$("#newsView"),
    more:$("#moreView")
  };

  async function go(name){
    Object.entries(views).forEach(([key,view])=>{
      if(view) view.classList.toggle("active",key===name);
    });

    $$(".nav button").forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.go===name);
    });

    window.scrollTo({top:0,behavior:"smooth"});

    try{
      if(name==="radio"){
        if(video && !video.paused) video.pause();

        if(audio && radioUrl){
          setText("#radioConnection","CONECTANDO");
          await audio.play();
          radioUI(true);
        }
      }else if(name==="tv"){
        if(audio && !audio.paused){
          audio.pause();
          radioUI(false);
        }

        if(video && tvUrl){
          if(tvSignalStatus) tvSignalStatus.textContent="Cargando señal...";
          await video.play();
        }
      }else{
        if(video && !video.paused) video.pause();
      }
    }catch(e){
      console.warn("Inicio automático bloqueado o señal no disponible:",e);

      if(name==="radio"){
        setText("#radioConnection","LISTA");
        toast("Toca Play si el navegador bloquea la reproducción automática");
      }

      if(name==="tv" && tvSignalStatus){
        tvSignalStatus.textContent="Toca Play para iniciar";
      }
    }
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


  function timeToMinutes(value=""){
    const m=String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if(!m)return null;
    let h=Number(m[1]), min=Number(m[2]);
    const ap=(m[3]||"").toUpperCase();
    if(ap==="PM" && h<12) h+=12;
    if(ap==="AM" && h===12) h=0;
    return h*60+min;
  }

  function updateOnAirProgram(){
    const entries=(cfg.schedule||[])
      .map(x=>({...x,minutes:timeToMinutes(x.time)}))
      .filter(x=>x.minutes!==null)
      .sort((a,b)=>a.minutes-b.minutes);

    if(!entries.length)return;

    const now=new Date();
    const mins=now.getHours()*60+now.getMinutes();

    let current=entries[entries.length-1];
    let next=entries[0];

    for(let i=0;i<entries.length;i++){
      if(entries[i].minutes<=mins){
        current=entries[i];
        next=entries[(i+1)%entries.length];
      }
    }

    setText("#onAirTitle",current.title||"Programación en vivo");
    setText("#onAirHost",current.host||"");
    setText("#nextProgram",`${next.time||""} · ${next.title||""}`);
  }

  updateOnAirProgram();
  setInterval(updateOnAirProgram,60000);

  // News
  const allNews=(cfg.news||[]).map((n,i)=>({...n,id:n.id||`news-${i}`}));
  let currentCategory="Todas";
  let newsSearchTerm="";

  function newsCard(n){
    return `<article data-news-id="${esc(n.id)}">
      <div class="newsimg">${n.image?`<img src="${esc(liveAsset(n.image))}" alt="">`:"▣"}</div>
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

  let currentOpenNewsId="";

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
      if(n.image) img.src=liveAsset(n.image);
    }

    const dialog=$("#newsDialog");
    currentOpenNewsId=id;
    history.replaceState(null,"",buildNewsUrl(id));

    if(dialog?.showModal){
      dialog.classList.remove("news-dialog-closing");
      dialog.showModal();
      requestAnimationFrame(()=>dialog.classList.add("news-dialog-open"));
    }
  }

  function closeNewsAnimated(){
    const dialog=$("#newsDialog");
    if(!dialog?.open) return;
    dialog.classList.remove("news-dialog-open");
    dialog.classList.add("news-dialog-closing");
    history.replaceState(null,"",window.location.pathname+window.location.search);
    setTimeout(()=>{
      dialog.classList.remove("news-dialog-closing");
      dialog.close();
      currentOpenNewsId="";
    },260);
  }

  const closeNews=$("#closeNews");
  if(closeNews) closeNews.onclick=closeNewsAnimated;

  $("#newsDialog")?.addEventListener("cancel",e=>{
    e.preventDefault();
    closeNewsAnimated();
  });


  const shareWhatsapp=$("#shareWhatsapp");
  const shareFacebook=$("#shareFacebook");
  const shareCopy=$("#shareCopy");

  if(shareWhatsapp) shareWhatsapp.onclick=()=>{
    const n=allNews.find(x=>x.id===currentOpenNewsId);
    const url=buildNewsUrl(currentOpenNewsId);
    const text=`${n?.title||"Noticia"} ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener");
  };

  if(shareFacebook) shareFacebook.onclick=()=>{
    const url=buildNewsUrl(currentOpenNewsId);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,"_blank","noopener");
  };

  if(shareCopy) shareCopy.onclick=async()=>{
    const url=buildNewsUrl(currentOpenNewsId);
    try{
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado");
    }catch{
      prompt("Copia este enlace",url);
    }
  };


  // Scroll de noticias administrable
function initNewsTicker(){
    const wrapper=$("#newsTicker");
    const track=$("#tickerTrack");
    const tickerCfg=cfg.newsTicker||{};

    if(!wrapper||!track||!tickerCfg.enabled){
      if(wrapper) wrapper.hidden=true;
      return;
    }

    let text=String(tickerCfg.text||"").trim();

    // Compatibilidad con la versión anterior de titulares separados.
    if(!text && Array.isArray(tickerCfg.headlines)){
      text=tickerCfg.headlines
        .filter(x=>x && x.enabled!==false && String(x.text||"").trim())
        .map(x=>String(x.text).trim())
        .join(" • ");
    }

    if(!text){
      wrapper.hidden=true;
      return;
    }

    // Los saltos de línea se convierten en separadores elegantes.
    const normalized=text
      .split(/\n+/)
      .map(x=>x.trim())
      .filter(Boolean)
      .join("   ✦   ");

    const minutes=Math.min(20,Math.max(1,Number(tickerCfg.minutes||7)));
    const duration=Math.round(minutes*60);

    const content=`
      <span class="ticker-single-text">${esc(normalized)}</span>
      <span class="ticker-separator">✦</span>
    `;

    track.innerHTML=`
      <div class="ticker-group">${content}</div>
      <div class="ticker-group" aria-hidden="true">${content}</div>
    `;

    track.style.setProperty("--ticker-duration",`${duration}s`);
    wrapper.hidden=false;

    // Fuerza el inicio de la animación en móviles/iPhone.
    track.classList.remove("ticker-running");
    void track.offsetWidth;
    track.classList.add("ticker-running");
  }


  function resumeNewsTicker(){
    const track=$("#tickerTrack");
    const wrapper=$("#newsTicker");
    if(!track||!wrapper||wrapper.hidden) return;

    track.classList.remove("ticker-running");
    void track.offsetWidth;
    track.classList.add("ticker-running");
  }

  window.addEventListener("pageshow",()=>{
    setTimeout(resumeNewsTicker,80);
  });

  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden){
      setTimeout(resumeNewsTicker,80);
    }
  });

  // Noticias destacadas tipo ROLL-UP
  const featuredMarked=allNews.filter(n=>n.featured);
  const featuredPool=[
    ...featuredMarked,
    ...allNews.filter(n=>!n.featured)
  ].filter((n,i,arr)=>arr.findIndex(x=>x.id===n.id)===i).slice(0,6);

  const featuredNews=$("#featuredNews");
  let featuredIndex=0;
  let featuredTimer=null;
  let rollupBusy=false;

  function featuredSlideMarkup(n){
    if(!n) return "";
    const image=n.image ? liveAsset(n.image) : "";
    return `
      <article class="rollup-slide" data-news-id="${esc(n.id)}">
        <div class="rollup-bg" style="${image?`background-image:url('${esc(image)}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div>
        <div class="rollup-shade"></div>
        <div class="rollup-content">
          <div class="rollup-top">
            <span class="news-category">${esc(n.category||"Noticias")}</span>
            <small>${esc(n.date||"")}</small>
          </div>
          <h3>${esc(n.title||"")}</h3>
          <p>${esc(n.excerpt||"")}</p>
          <span class="rollup-read">Leer noticia →</span>
        </div>
      </article>`;
  }

  function renderFeaturedRollup(){
    if(!featuredNews) return;

    if(!featuredPool.length){
      featuredNews.innerHTML="<p>Sin noticias destacadas.</p>";
      return;
    }

    featuredNews.innerHTML=`
      <div class="rollup-shell">
        <div class="rollup-viewport">
          <div id="rollupTrack" class="rollup-track">
            ${featuredSlideMarkup(featuredPool[featuredIndex])}
          </div>
        </div>

        ${featuredPool.length>1 ? `
          <div class="rollup-controls">
            <button id="rollupPrev" class="rollup-arrow" aria-label="Noticia anterior">‹</button>
            <div id="rollupDots" class="rollup-dots">
              ${featuredPool.map((_,i)=>`<button class="${i===featuredIndex?"active":""}" data-rollup-index="${i}" aria-label="Ir a noticia ${i+1}"></button>`).join("")}
            </div>
            <button id="rollupNext" class="rollup-arrow" aria-label="Siguiente noticia">›</button>
          </div>` : ""}
      </div>`;

    bindRollupClicks();
  }

  function updateRollupDots(){
    $$("#rollupDots button").forEach((dot,i)=>dot.classList.toggle("active",i===featuredIndex));
  }

  function changeFeatured(nextIndex,direction=1){
    if(!featuredNews || featuredPool.length<2 || rollupBusy) return;

    const track=$("#rollupTrack");
    const current=track?.querySelector(".rollup-slide");
    if(!track || !current) return;

    rollupBusy=true;
    nextIndex=(nextIndex+featuredPool.length)%featuredPool.length;

    const incomingWrap=document.createElement("div");
    incomingWrap.innerHTML=featuredSlideMarkup(featuredPool[nextIndex]);
    const incoming=incomingWrap.firstElementChild;

    incoming.classList.add(direction>=0?"rollup-enter-bottom":"rollup-enter-top");
    track.appendChild(incoming);

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        current.classList.add(direction>=0?"rollup-exit-top":"rollup-exit-bottom");
        incoming.classList.remove("rollup-enter-bottom","rollup-enter-top");
        incoming.classList.add("rollup-active");
      });
    });

    setTimeout(()=>{
      current.remove();
      incoming.classList.remove("rollup-active");
      featuredIndex=nextIndex;
      updateRollupDots();
      bindRollupClicks();
      rollupBusy=false;
    },520);
  }

  function resetFeaturedTimer(){
    if(featuredTimer) clearInterval(featuredTimer);
    if(featuredPool.length>1){
      if(cfg.featuredRollup?.enabled!==false){
        const ms=Math.min(20,Math.max(3,Number(cfg.featuredRollup?.seconds||5)))*1000;
        featuredTimer=setInterval(()=>changeFeatured(featuredIndex+1,1),ms);
      }
    }
  }

  function bindRollupClicks(){
    $$("#featuredNews [data-news-id]").forEach(el=>{
      el.onclick=()=>openNews(el.dataset.newsId);
    });

    const prev=$("#rollupPrev");
    const next=$("#rollupNext");
    if(prev) prev.onclick=e=>{e.stopPropagation();changeFeatured(featuredIndex-1,-1);resetFeaturedTimer()};
    if(next) next.onclick=e=>{e.stopPropagation();changeFeatured(featuredIndex+1,1);resetFeaturedTimer()};

    $$("#rollupDots button").forEach(dot=>{
      dot.onclick=e=>{
        e.stopPropagation();
        const target=Number(dot.dataset.rollupIndex);
        if(Number.isFinite(target) && target!==featuredIndex){
          changeFeatured(target,target>featuredIndex?1:-1);
          resetFeaturedTimer();
        }
      };
    });
  }

  renderFeaturedRollup();
  resetFeaturedTimer();

  // Swipe vertical para celular
  let rollupTouchY=null;
  if(featuredNews){
    featuredNews.addEventListener("touchstart",e=>{
      rollupTouchY=e.touches?.[0]?.clientY ?? null;
    },{passive:true});

    featuredNews.addEventListener("touchend",e=>{
      if(rollupTouchY===null || featuredPool.length<2) return;
      const endY=e.changedTouches?.[0]?.clientY;
      if(endY===undefined) return;

      const delta=endY-rollupTouchY;
      rollupTouchY=null;

      if(Math.abs(delta)>45){
        if(delta<0) changeFeatured(featuredIndex+1,1);
        else changeFeatured(featuredIndex-1,-1);
        resetFeaturedTimer();
      }
    },{passive:true});

    featuredNews.addEventListener("mouseenter",()=>featuredTimer&&clearInterval(featuredTimer));
    featuredNews.addEventListener("mouseleave",resetFeaturedTimer);
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
          <div class="bg" style="${h.image?`background-image:url('${esc(liveAsset(h.image))}')`:"background:linear-gradient(135deg,var(--accent),var(--accent2))"}"></div>
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
  initNewsTicker();

  const newsSearch=$("#newsSearch");
  const clearNewsSearch=$("#clearNewsSearch");

  if(newsSearch){
    newsSearch.oninput=e=>{
      newsSearchTerm=String(e.target.value||"").trim();
      renderNewsPage();
    };
  }

  if(clearNewsSearch){
    clearNewsSearch.onclick=()=>{
      newsSearchTerm="";
      if(newsSearch) newsSearch.value="";
      renderNewsPage();
    };
  }

  const deepLinkedNews=newsIdFromHash();
  if(deepLinkedNews && allNews.some(n=>n.id===deepLinkedNews)) openNews(deepLinkedNews);

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
    const fixedLogo=liveAsset(cfg.logo||"");

    setText("#radioTitle",safeTitle);
    setText("#radioArtist",safeArtist);

    const art=$("#radioArtwork");
    if(art){
      if(fixedLogo) art.innerHTML=`<img src="${esc(fixedLogo)}" alt="Logo de la emisora">`;
      else art.textContent="♪";
    }

    if("mediaSession" in navigator){
      try{
        navigator.mediaSession.metadata=new MediaMetadata({
          title:safeTitle,
          artist:safeArtist,
          album:cfg.stationName||"",
          artwork:fixedLogo?[{src:fixedLogo}]:[]
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
        artwork:data.artwork||data.cover||data.track?.artwork||cfg.logo||""
      };
    }

    const title=data.title||data.song||data.track?.title||data.currentSong||"";
    const artist=data.artist||data.track?.artist||data.currentArtist||"";
    if(title||artist){
      return {
        title:title||"En vivo",
        artist:artist||cfg.radio?.name||cfg.stationName||"",
        artwork:data.artwork||data.cover||data.track?.artwork||cfg.logo||""
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
  applyMetadata("Listo para reproducir",cfg.radio?.name||cfg.stationName||"",cfg.logo||"");

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

  if(video&&cfg.tv?.poster) video.poster=liveAsset(cfg.tv.poster);

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

  const tvFullscreen=$("#tvFullscreen");
  const tvPip=$("#tvPip");
  const tvSignalStatus=$("#tvSignalStatus");

  if(video){
    video.addEventListener("playing",()=>{
      if(tvSignalStatus) tvSignalStatus.textContent="Señal reproduciéndose";
    });
    video.addEventListener("waiting",()=>{
      if(tvSignalStatus) tvSignalStatus.textContent="Cargando señal...";
    });
    video.addEventListener("error",()=>{
      if(tvSignalStatus) tvSignalStatus.textContent="Señal no disponible";
    });
  }

  if(tvFullscreen){
    tvFullscreen.onclick=async()=>{
      try{
        if(document.fullscreenElement) await document.exitFullscreen();
        else await (video?.requestFullscreen?.() || $(".tvframe")?.requestFullscreen?.());
      }catch(e){ console.warn(e); }
    };
  }

  if(tvPip){
    if(!document.pictureInPictureEnabled || !video?.requestPictureInPicture){
      tvPip.hidden=true;
    }else{
      tvPip.onclick=async()=>{
        try{
          if(document.pictureInPictureElement) await document.exitPictureInPicture();
          else await video.requestPictureInPicture();
        }catch(e){
          toast("Picture-in-Picture no disponible");
        }
      };
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
