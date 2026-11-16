/*!
 * Nartya FM — © Nartya. Tous droits réservés.
 * Logiciel propriétaire et confidentiel. Toute rétro-ingénierie, décompilation,
 * désassemblage, extraction ou redistribution de ce code sans autorisation écrite
 * préalable de Nartya est strictement interdite.
 */
const l=3e3,r=4,a=new Map,s=e=>typeof e=="string"?e.trim().slice(0,120):"";export async function getSuggestions(e){const i=e.toLowerCase();if(a.has(i))return a.get(i);const n=await fetch(`https://api.deezer.com/search/autocomplete?q=${encodeURIComponent(e)}&limit=4`,{signal:AbortSignal.timeout(3e3)}),c=n.ok?await n.json():{},o={artists:(c.artists?.data??[]).slice(0,4).map(t=>({name:s(t.name),picture:t.picture_medium??null})),tracks:(c.tracks?.data??[]).slice(0,4).map(t=>({title:s(t.title),artist:s(t.artist?.name),cover:t.album?.cover_small??null})),albums:(c.albums?.data??[]).slice(0,2).map(t=>({title:s(t.title),artist:s(t.artist?.name),cover:t.cover_small??null}))};return a.size>200&&a.clear(),a.set(i,o),o}
