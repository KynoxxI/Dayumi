# Documentation Technique — Dayumi Movie

Ce document décrit l'architecture, le système d'extraction et de lecture vidéo, ainsi que les procédures d'extension pour **Dayumi Movie**, la variante dédiée aux films et séries de l'écosystème Dayumi.

---

## 1. Vue d'ensemble

Contrairement au catalogue anime qui s'appuie sur une API propriétaire (`anime.dayumi.site`), Dayumi Movie opère de manière entièrement autonome côté client et processus principal Electron :
- **Métadonnées** : TMDB (The Movie Database) via l'API v3/v4 en lecture seule (`src/api/movieApi.js`).
- **Sources vidéo** : Résolution directe et embarquée (iframe / extract HLS) via `src/utils/movieSources.js` et le résolveur Electron `electron/utils/movie-resolver.js`.
- **Thème visuel** : Teinte cinéma violette (`#7C5CFF` / `124 92 255`) activée automatiquement via `VITE_APP=movie` et le preset `cinema`.

---

## 2. Architecture des Sources Vidéo

Le registre des fournisseurs est défini dans `src/utils/movieSources.js`. Chaque fournisseur expose le contrat suivant :

```javascript
{
  id: "nom-fournisseur",
  label: "Nom affiché",
  kind: "iframe" | "extract",
  rank: 10, // Plus le chiffre est petit, plus la priorité est élevée
  langs: ["vf", "vostfr"],
  movie: (tmdbId) => `https://embed-provider.com/movie/${tmdbId}`,
  episode: (tmdbId, season, episode) => `https://embed-provider.com/tv/${tmdbId}/${season}/${episode}`
}
```

### Algorithme de résolution (Entonnoir)

La fonction `resolveMovieSource(media, { excludeIds, forceRefresh })` applique la même logique de hedging que l'app Anime :
1. Les deux premiers fournisseurs éligibles sont sollicités en parallèle avec un décalage de sécurité (1 600 ms).
2. La première source qui répond avec succès est immédiatement retenue et jouée.
3. Si une source échoue (timeout ou indisponibilité), elle est inscrite dans `excludeIds` et le résolveur bascule automatiquement sur les sources suivantes.
4. Côté Electron (`movie-resolver.js`), après 3 échecs consécutifs, un fournisseur peut être temporairement désactivé dans le cache `electron-store` sous `movies:disabledProviders`.

---

## 3. Ajout d'un Nouveau Fournisseur

Pour ajouter un nouveau fournisseur :
1. Ouvrir `src/utils/movieSources.js`.
2. Ajouter l'objet du fournisseur dans `MOVIE_PROVIDERS` en renseignant son `id`, `label`, `rank`, ainsi que ses fonctions d'URL `movie` et `episode`.
3. Si le fournisseur permet une extraction directe de flux m3u8/mp4 (`kind: "extract"`), ajouter son analyseur d'extraction dans `electron/utils/movie-resolver.js`.
4. Valider son intégration en exécutant :
   ```bash
   node test/movie-sources.test.mjs
   node test/movie-sources-live.mjs
   ```

---

## 4. Limites Connues

- **Hébergeurs tiers instables** : Les flux tiers peuvent subir des ralentissements, des coupures ou des modifications de protection.
- **Mode Iframe** : Lorsque la vidéo est lue dans une iframe sandboxée, la reprise de lecture précise au millième de seconde et le téléchargement hors ligne ne sont pas accessibles en raison des restrictions cross-origin des hébergeurs tiers.
- **Téléchargement** : Le téléchargement hors ligne est uniquement disponible pour les sources de type `extract` (flux directs m3u8 ou mp4).

---

## 5. Mentions Légales

Dayumi Movie n'héberge aucun contenu audiovisuel ou fichier vidéo sur ses serveurs. L'application agit exclusivement en tant qu'interface d'indexation et d'affichage de flux tiers librement accessibles sur le web.
