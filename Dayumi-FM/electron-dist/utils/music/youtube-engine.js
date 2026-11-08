/*!
 * Nartya FM — © Nartya. Tous droits réservés.
 * Logiciel propriétaire et confidentiel. Toute rétro-ingénierie, décompilation,
 * désassemblage, extraction ou redistribution de ce code sans autorisation écrite
 * préalable de Nartya est strictement interdite.
 */
import{ElectronBlocker as D}from"@ghostery/adblocker-electron";import{app as J,BrowserWindow as $,session as N}from"electron";import{readFile as B,stat as U,writeFile as M}from"fs/promises";import W from"path";const q="persist:youtube-music",w="https://music.youtube.com/",F=500,S=120,j=2500,k=1e3,H=8e3,z=2e4,G=12*36e5,Q=/(^|\.)(youtube\.com|google\.com|google\.fr|gstatic\.com|youtube-nocookie\.com)$/i,L={win32:"Windows NT 10.0; Win64; x64",darwin:"Macintosh; Intel Mac OS X 10_15_7",linux:"X11; Linux x86_64"},K=`Mozilla/5.0 (${L[process.platform]??L.linux}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`,X=`(() => {
  if (location.host === "consent.youtube.com") {
    const form = [...document.forms].find((f) => f.querySelector('input[name="set_eom"][value="true"]'));
    const button = form?.querySelector("button") ??
      [...document.querySelectorAll("button")].find((b) => /tout refuser|reject all|alle ablehnen|rechazar todo|rifiuta tutto|rejeitar tudo/i.test(b.innerText));
    button?.click();
    return { consent: true };
  }
  const v = document.querySelector("video");
  if (!v) return { none: true };
  const p = document.querySelector("#movie_player");
  const response = p?.getPlayerResponse?.();
  return {
    // Le lecteur sait ce qu'il joue ; l'adresse de la page, elle, ne suit pas loadVideoById.
    id: p?.getVideoData?.()?.video_id || new URLSearchParams(location.search).get("v"),
    // Vid\xE9o supprim\xE9e, priv\xE9e, bloqu\xE9e dans le pays\u2026 : YouTube le dit tout de suite.
    // (Une vid\xE9o introuvable n'a pas de videoDetails.)
    unplayable: Boolean(response?.playabilityStatus?.status && response.playabilityStatus.status !== "OK" &&
      (!response.videoDetails || response.videoDetails.videoId === p.getVideoData?.()?.video_id)),
    t: v.currentTime,
    d: v.duration,
    paused: v.paused,
    ended: v.ended,
    ready: v.readyState >= 3,
    // Aucune source charg\xE9e : le lecteur n'a m\xEAme pas commenc\xE9 \xE0 chercher le morceau.
    empty: !v.currentSrc && v.networkState === 0,
    ad: Boolean(document.querySelector("#movie_player.ad-showing")),
    // Volume per\xE7u du morceau par rapport \xE0 la r\xE9f\xE9rence de YouTube (dB, > 0 = plus fort).
    loud: response?.videoDetails?.videoId === p?.getVideoData?.()?.video_id ? response?.playerConfig?.audioConfig?.loudnessDb ?? null : null,
  };
})()`,x=({level:e,muted:o})=>`(() => {
  if (!window.__nartyaVolume) {
    const proto = HTMLMediaElement.prototype;
    const vol = Object.getOwnPropertyDescriptor(proto, "volume");
    const mut = Object.getOwnPropertyDescriptor(proto, "muted");
    Object.defineProperty(proto, "volume", {
      configurable: true,
      get() { return vol.get.call(this); },
      set() { vol.set.call(this, window.__nartyaVolume.level); },
    });
    Object.defineProperty(proto, "muted", {
      configurable: true,
      get() { return mut.get.call(this); },
      set() { mut.set.call(this, window.__nartyaVolume.muted); },
    });
    window.__nartyaApplyVolume = () =>
      document.querySelectorAll("video, audio").forEach((m) => {
        vol.set.call(m, window.__nartyaVolume.level);
        mut.set.call(m, window.__nartyaVolume.muted);
      });
    for (const type of ["loadstart", "loadedmetadata", "play", "playing", "volumechange"]) {
      document.addEventListener(type, (e) => e.target instanceof HTMLMediaElement && window.__nartyaApplyVolume(), true);
    }
  }
  window.__nartyaVolume = { level: ${e}, muted: ${o} };
  window.__nartyaApplyVolume();
})()`,Y=[60,150,400,1e3,2400,15e3],A=({normalize:e,eq:o},a)=>`(async () => {
  const v = document.querySelector("video");
  if (!v) return "none";
  if (!v.__nartyaChain) {
    const ctx = window.__nartyaAudio ?? (window.__nartyaAudio = new AudioContext());
    if (ctx.state !== "running") await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1000))]);
    if (ctx.state !== "running") return "suspended";
    const freqs = ${JSON.stringify(Y)};
    const norm = new GainNode(ctx);
    const bands = freqs.map((frequency, i) => new BiquadFilterNode(ctx, {
      type: i === 0 ? "lowshelf" : i === freqs.length - 1 ? "highshelf" : "peaking",
      frequency,
      Q: 1,
      gain: 0,
    }));
    const fade = new GainNode(ctx);
    // Seuil \xE0 -1 dB : \xE0 -6 dB, Chromium compensait la compression par un gain fixe (~+3 dB)
    // qui rendait l'audio plus fort que le m\xEAme titre en clip.
    const limiter = new DynamicsCompressorNode(ctx, { threshold: -1, knee: 0, ratio: 20, attack: 0.002, release: 0.2 });
    let node = ctx.createMediaElementSource(v).connect(norm);
    for (const band of bands) node = node.connect(band);
    node.connect(fade).connect(limiter).connect(ctx.destination);
    v.__nartyaChain = { ctx, norm, bands, fade };
    window.__nartyaChain = v.__nartyaChain;
  }
  const { ctx, norm, bands } = v.__nartyaChain;
  const loud = ${Number.isFinite(a)?a:0};
  const target = ${e?"true":"false"} && loud > 0 ? Math.pow(10, -loud / 20) : 1;
  norm.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
  const eq = ${JSON.stringify(o??[])};
  bands.forEach((band, i) => band.gain.setTargetAtTime(Math.max(-12, Math.min(12, eq[i] ?? 0)), ctx.currentTime, 0.05));
  return "on";
})()`,f=(e,o)=>`(() => {
  const chain = document.querySelector("video")?.__nartyaChain;
  if (!chain) return false;
  const { ctx, fade } = chain;
  fade.gain.cancelScheduledValues(ctx.currentTime);
  fade.gain.setValueAtTime(fade.gain.value, ctx.currentTime);
  fade.gain.linearRampToValueAtTime(${e}, ctx.currentTime + ${Math.max(.05,o)});
  return true;
})()`,Z=e=>`(() => {
  if (location.host !== "music.youtube.com") return false;
  const p = document.querySelector("#movie_player");
  if (typeof p?.loadVideoById !== "function" || typeof p.playVideo !== "function") return false;
  p.loadVideoById(${JSON.stringify(e)});
  p.playVideo();
  p.setPlaybackQualityRange?.("tiny", "tiny");
  return true;
})()`,ee=`(() => {
  if (!document.querySelector("#movie_player.ad-showing")) return false;
  document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button").forEach((b) => b.click());
  const v = document.querySelector("video");
  if (v && Number.isFinite(v.duration) && v.duration > 0) v.currentTime = v.duration;
  return true;
})()`,te=`(() => {
  const p = document.querySelector("#movie_player");
  p?.setPlaybackQualityRange?.("tiny", "tiny");
  p?.setPlaybackQuality?.("tiny");
})()`;let n=null,O=null,t=null,b=null,h={level:.8,muted:!1},u={normalize:!0,eq:[0,0,0,0,0,0],crossfade:0},v=!1,p=!1,m=null,T="",V=()=>{};function I(){return O??=(async()=>{const e=W.join(J.getPath("userData"),"adblock-engine.bin"),o=N.fromPartition(q),a=await U(e).then(r=>Date.now()-r.mtimeMs,()=>1/0),s=()=>D.fromPrebuiltAdsAndTracking(fetch);let i=a<1/0?await B(e).then(r=>D.deserialize(r),()=>null):null;i?a>G&&s().then(r=>(i.disableBlockingInSession(o),r.enableBlockingInSession(o),M(e,r.serialize()))).catch(r=>console.warn("[youtube] mise \xE0 jour des listes anti-pub :",r.message)):(i=await s(),M(e,i.serialize()).catch(()=>{})),i.enableBlockingInSession(o)})().catch(e=>console.warn("[youtube] bloqueur de pubs indisponible :",e.message)),Promise.race([O,new Promise(e=>setTimeout(e,15e3))])}function E(){if(n&&!n.isDestroyed())return n;n=new $({show:!1,skipTaskbar:!0,width:1024,height:720,webPreferences:{partition:q,sandbox:!0,contextIsolation:!0,nodeIntegration:!1,backgroundThrottling:!1}});const e=n.webContents;e.setUserAgent(K),e.setWindowOpenHandler(()=>({action:"deny"}));const o=(a,s)=>{try{const{protocol:i,hostname:r}=new URL(s);if(i==="about:"||i==="https:"&&Q.test(r))return}catch{}a.preventDefault()};return e.on("will-navigate",o),e.on("will-redirect",o),e.on("will-attach-webview",a=>a.preventDefault()),e.on("will-prevent-unload",a=>a.preventDefault()),e.on("dom-ready",()=>e.executeJavaScript(x(h)).catch(()=>{})),e.session.setPermissionRequestHandler((a,s,i)=>i(!1)),e.session.setPermissionCheckHandler(()=>!1),e.on("render-process-gone",()=>{t&&c({status:"error"}),destroyEngine()}),n.on("closed",()=>{n=null}),n}function c(e){if(!t)return;const o={id:t.id,position:0,duration:0,...e},a=`${o.status}|${Math.floor(o.position)}|${Math.floor(o.duration)}`;a!==T&&(T=a,V(o))}const R=e=>Number.isFinite(e)&&e>=0?e:0;let C=!1;async function ne(){if(!C){C=!0;try{await oe()}finally{C=!1}}}async function oe(){if(!t||!n||n.isDestroyed())return;if(n.webContents.isLoadingMainFrame()){y();return}let e;try{e=await n.webContents.executeJavaScript(X,!0)}catch{return}if(!t||!e||e.consent||e.none){y();return}if(n.webContents.executeJavaScript(x(h)).catch(()=>{}),e.ad){n.webContents.setAudioMuted(!0),n.webContents.executeJavaScript(ee,!0).catch(()=>{}),y()||c({status:"loading",position:t.lastT??0,duration:t.lastD??0});return}const o=R(e.t),a=R(e.d);if(t.lastT=o,t.lastD=a,t.started&&(e.id!==t.id||e.ended||a>0&&o>=a-.4)){_(),c({status:"ended",position:a,duration:a}),l();return}if(e.id!==t.id){e.paused||_(),y();return}if(e.unplayable&&!t.started){c({status:"error"}),l();return}if(Number.isFinite(e.loud)&&(t.loud=e.loud),!e.paused&&e.ready&&!t.started){t.started=!0,g(F),n.webContents.executeJavaScript(te,!0).catch(()=>{});const r=t.fadeIn&&u.crossfade>0;n.webContents.executeJavaScript(A(u,t.loud),!0).then(()=>n?.webContents.executeJavaScript(r?`${f(0,.01)};${f(1,u.crossfade)}`:f(1,.05),!0)).catch(()=>{}),t.resumeAt&&(seek(t.resumeAt),t.resumeAt=null)}if(t.started&&n.webContents.executeJavaScript(A(u,t.loud),!0).catch(()=>{}),t.started&&u.crossfade>0&&a>u.crossfade*2){const r=a-o;!t.fadingOut&&!e.paused&&r<=u.crossfade?(t.fadingOut=!0,v=!0,n.webContents.executeJavaScript(f(0,r),!0).catch(()=>{})):t.fadingOut&&r>u.crossfade+1&&(t.fadingOut=!1,v=!1,n.webContents.executeJavaScript(f(1,.3),!0).catch(()=>{}))}if(t.started&&n.webContents.isAudioMuted()&&n.webContents.setAudioMuted(!1),e.paused&&p&&n.webContents.executeJavaScript('document.querySelector("video")?.play().catch(() => {})',!0).catch(()=>{}),y(e))return;if(t.started&&!e.paused&&!e.ready){if(t.stalledAt??=Date.now(),Date.now()-t.stalledAt>H){n.webContents.setAudioMuted(!0),P(o),g(S);return}}else t.stalledAt=null;const i=!t.started||!e.ready&&!e.paused?"loading":e.paused?"paused":"playing";c({status:i,position:o,duration:a})}function y(e){if(!t||t.started)return!1;const o=Date.now()-t.startedAt;return t.swapped&&(o>j||e?.empty&&o>k)?(P(),!0):o>z?(c({status:"error"}),l(),!0):!1}function P(e=0){!t||!n||n.isDestroyed()||(t.swapped=!1,t.started=!1,t.stalledAt=null,t.resumeAt=e>=1?e:null,t.startedAt=Date.now(),n.webContents.loadURL(`https://music.youtube.com/watch?v=${t.id}`).catch(()=>{}))}function g(e=S){l(),b=setInterval(ne,e)}function l(){clearInterval(b),b=null}function _(){n?.webContents.executeJavaScript('document.querySelector("video")?.pause()').catch(()=>{})}export function setNotifier(e){V=e}export function preload(){if(t||m)return;const e=E();e.webContents.getURL().startsWith(w)||(e.webContents.setAudioMuted(!0),m=I().then(()=>t||e.isDestroyed()?null:e.webContents.loadURL(w)).catch(()=>{}).finally(()=>{m=null}))}export async function play(e){const o=E(),a=t={id:e,startedAt:Date.now(),started:!1,swapped:!1,fadeIn:v};if(v=!1,p=!0,T="",c({status:"loading"}),o.webContents.setAudioMuted(!0),m&&await Promise.race([m,new Promise(d=>setTimeout(d,5e3))]),await I(),t!==a||o.isDestroyed())return;const s=o.webContents;if(!s.getURL()&&(await Promise.race([s.loadURL(w).catch(()=>{}),new Promise(d=>setTimeout(d,1e4))]),t!==a||o.isDestroyed()))return;const r=!s.isLoadingMainFrame()&&s.getURL().startsWith(w)&&await Promise.race([s.executeJavaScript(Z(e),!0).catch(()=>!1),new Promise(d=>setTimeout(()=>d(!1),k))]);t===a&&(a.startedAt=Date.now(),r?a.swapped=!0:P(),g(S))}export function pause(){p=!1,_()}export function resume(){!t||!n||(p=!0,b||g(),n.webContents.executeJavaScript('document.querySelector("video")?.play().catch(() => {})',!0).catch(()=>{}))}export function seek(e){!t||!n||n.webContents.executeJavaScript(`(() => { const v = document.querySelector("video"); if (v) v.currentTime = ${e}; })()`).catch(()=>{})}export function setAudio(e){u=e,n&&!n.isDestroyed()&&t?.started&&n.webContents.executeJavaScript(A(u,t.loud),!0).catch(()=>{})}export function setVolume(e,o){h={level:e,muted:o},n&&!n.isDestroyed()&&n.webContents.executeJavaScript(x(h)).catch(()=>{})}export function stop(){p=!1,t=null,l(),_()}export function destroyEngine(){l(),t=null,n&&!n.isDestroyed()&&n.destroy(),n=null}
