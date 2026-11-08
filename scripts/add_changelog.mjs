#!/usr/bin/env node
/**
 * Outil CLI pour ajouter facilement des notes de mise à jour aux manifests Dayumi.
 * 
 * Utilisation :
 *   node scripts/add_changelog.mjs --app anime --version 1.38.0 --new "Ajout d'une fonctionnalité" --improved "Amélioration du lecteur" --fixed "Correction de bugs"
 *
 * Options :
 *   --app       : anime | movies | fm (défaut : anime)
 *   --version   : Numéro de version (ex: 1.38.0)
 *   --date      : Date optionnelle (défaut : aujourd'hui, YYYY-MM-DD)
 *   --new       : Note d'une nouveauté (peut être répété)
 *   --improved  : Note d'une amélioration (peut être répété)
 *   --fixed     : Note d'un correctif (peut être répété)
 */

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

function getAllArgs(name) {
  const results = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1] && !args[i + 1].startsWith("--")) {
      results.push(args[i + 1]);
    }
  }
  return results;
}

const app = getArg("app") || "anime";
const version = getArg("version");
const date = getArg("date") || new Date().toISOString().slice(0, 10);

const newItems = getAllArgs("new");
const improvedItems = getAllArgs("improved");
const fixedItems = getAllArgs("fixed");

if (!version) {
  console.log(`
Usage :
  node scripts/add_changelog.mjs --app <anime|movies|fm> --version <X.Y.Z> [options]

Exemples :
  node scripts/add_changelog.mjs --app anime --version 1.38.0 --new "Ajout du mode nuit" --improved "Vitesse de chargement"
  node scripts/add_changelog.mjs --app movies --version 0.1.1 --fixed "Correction de l'icône de bureau"
`);
  process.exit(1);
}

const items = [];
for (const text of newItems) items.push({ type: "new", text });
for (const text of improvedItems) items.push({ type: "improved", text });
for (const text of fixedItems) items.push({ type: "fixed", text });

if (items.length === 0) {
  items.push({ type: "improved", text: `Mise à jour et optimisations générales (v${version})` });
}

console.log(`Ajout des notes de version pour ${app} v${version} (${date}) :`);
console.log(JSON.stringify(items, null, 2));

export function buildEntry() {
  return { version, date, items };
}

