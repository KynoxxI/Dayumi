/*!
 * Dayumi FM — © Dayumi. Tous droits réservés.
 * Logiciel propriétaire et confidentiel. Toute rétro-ingénierie, décompilation,
 * désassemblage, extraction ou redistribution de ce code sans autorisation écrite
 * préalable de Dayumi est strictement interdite.
 */
export function registerUpdaterIpc(e,r){e.handle("updater:get-version",()=>r.getVersion())}
