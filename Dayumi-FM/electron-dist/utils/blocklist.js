/*!
 * Nartya FM — © Nartya. Tous droits réservés.
 * Logiciel propriétaire et confidentiel. Toute rétro-ingénierie, décompilation,
 * désassemblage, extraction ou redistribution de ce code sans autorisation écrite
 * préalable de Nartya est strictement interdite.
 */
import{openPublic as a,readLimited as i}from"./safe-http.js";const l="https://nartya.app/fm/blocklist.json",o=30*60*1e3,c=256*1024,u={ids:[],urls:[],names:[]};let n={at:0,list:u},e=null;const r=t=>Array.isArray(t)?t.filter(s=>typeof s=="string"&&s.length>0&&s.length<500).map(s=>s.trim().toLowerCase()):[];async function p(){const t=await a(l,{headers:{Accept:"application/json"}});if(t.statusCode!==200)throw t.destroy(),new Error(`HTTP ${t.statusCode}`);const s=JSON.parse((await i(t,{maxBytes:c})).toString("utf8"));return{ids:r(s?.ids),urls:r(s?.urls),names:r(s?.names)}}export function getBlocklist(){return Date.now()-n.at<o?Promise.resolve(n.list):(e??=p().then(t=>(n={at:Date.now(),list:t},t)).catch(()=>(n={at:Date.now()-o+5*60*1e3,list:n.list},n.list)).finally(()=>{e=null}),e)}
