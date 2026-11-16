import assert from "node:assert/strict";
import test from "node:test";

test("Non-régression : variante par défaut (anime)", async () => {
  // Simule l'environnement par défaut
  process.env.VITE_APP = "";
  const { APP, isMovie, isAnime, isFm, DEFAULT_THEME_PRESET, DEFAULT_CUSTOM_COLOR, APP_NAME } =
    await import(`../src/config/appVariant.js?v=${Date.now()}`);

  assert.equal(isMovie, false, "isMovie doit être false par défaut");
  assert.equal(isAnime, true, "isAnime doit être true par défaut");
  assert.equal(isFm, false, "isFm doit être false par défaut");
  assert.equal(DEFAULT_THEME_PRESET, "vermillon", "Le thème par défaut doit être vermillon");
  assert.equal(DEFAULT_CUSTOM_COLOR, "#FF713E", "La couleur par défaut doit être #FF713E (vermillon)");
  assert.equal(APP_NAME, "Dayumi", "Le nom d'application doit être Dayumi");
});

test("Variante Movie : VITE_APP=movie", async () => {
  process.env.VITE_APP = "movie";
  const { isMovie, isAnime, isFm, DEFAULT_THEME_PRESET, DEFAULT_CUSTOM_COLOR, APP_NAME, ROUTES_ENABLED } =
    await import(`../src/config/appVariant.js?v=${Date.now() + 1}`);

  assert.equal(isMovie, true, "isMovie doit être true quand VITE_APP=movie");
  assert.equal(isAnime, false, "isAnime doit être false");
  assert.equal(isFm, false, "isFm doit être false");
  assert.equal(DEFAULT_THEME_PRESET, "cinema", "Le thème doit être cinéma");
  assert.equal(DEFAULT_CUSTOM_COLOR, "#7C5CFF", "La couleur primaire doit être le violet #7C5CFF");
  assert.equal(APP_NAME, "Dayumi Movie", "Le nom doit être Dayumi Movie");
  assert.equal(ROUTES_ENABLED.movie, true);
  assert.equal(ROUTES_ENABLED.serie, true);
});

test("Thème Cinéma : valeurs de tokens exactes du cristal violet", async () => {
  const { THEME_PRESETS } = await import(`../src/utils/theme.js?v=${Date.now() + 2}`);
  assert.ok(THEME_PRESETS.cinema, "Le preset cinema existe");
  assert.equal(THEME_PRESETS.cinema.primary, "124 92 255", "Token primaire 124 92 255 (#7C5CFF)");
  assert.ok(THEME_PRESETS.vermillon, "Le preset vermillon anime d'origine est intact");
  assert.equal(THEME_PRESETS.vermillon.primary, "255 113 62", "Token vermillon 255 113 62 (#FF713E)");
});
