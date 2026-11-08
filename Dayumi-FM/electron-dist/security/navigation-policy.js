/*!
 * Nartya FM — © Nartya. Tous droits réservés.
 * Logiciel propriétaire et confidentiel. Toute rétro-ingénierie, décompilation,
 * désassemblage, extraction ou redistribution de ce code sans autorisation écrite
 * préalable de Nartya est strictement interdite.
 */
import s from"node:path";import{fileURLToPath as f}from"node:url";function c(e){const r=s.resolve(e);return process.platform==="win32"?r.toLowerCase():r}export function createNavigationPolicy({isDev:e,appEntryPath:r,devOrigin:o}){const n=c(r),a=new URL(o).origin;return l=>{try{const t=new URL(l);if(t.username||t.password)return!1;if(e)return t.protocol==="http:"&&t.origin===a;if(t.protocol!=="file:")return!1;const i=new URL(t.href);return i.search="",i.hash="",c(f(i))===n}catch{return!1}}}export function installNavigationGuards(e,r){const o=(n,a)=>{r(a)||(n.preventDefault(),console.warn("[main] Navigation externe bloqu\xE9e"))};e.on("will-navigate",o),e.on("will-redirect",o),e.on("will-attach-webview",n=>n.preventDefault()),e.setWindowOpenHandler(()=>({action:"deny"}))}
