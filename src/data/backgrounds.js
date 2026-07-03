// Fonds prédéfinis. `css` = valeur background complète. `scrim` = intensité du voile.
// `light: true` -> conçu pour le thème clair (texte sombre).

export const BACKGROUNDS = [
  { id: 'sunset', name: 'Sunset', scrim: 0.45,
    css: 'radial-gradient(120% 120% at 20% 0%, #ff8a3d 0%, transparent 55%), linear-gradient(160deg, #ff512f 0%, #dd2476 70%, #7a1fa2 100%)' },
  { id: 'ember', name: 'Ember', scrim: 0.55,
    css: 'radial-gradient(110% 90% at 80% 10%, #fc4c02 0%, transparent 50%), linear-gradient(180deg, #2b0a00 0%, #110a14 100%)' },
  { id: 'aurora', name: 'Aurora', scrim: 0.5,
    css: 'radial-gradient(100% 100% at 0% 0%, #2bd2a8 0%, transparent 50%), linear-gradient(160deg, #0f3460 0%, #16213e 50%, #0f0524 100%)' },
  { id: 'grape', name: 'Grape', scrim: 0.45,
    css: 'radial-gradient(120% 110% at 80% 0%, #b06bff 0%, transparent 55%), linear-gradient(160deg, #6a11cb 0%, #2575fc 100%)' },
  { id: 'ocean', name: 'Ocean', scrim: 0.5,
    css: 'radial-gradient(100% 90% at 10% 10%, #2af0ea 0%, transparent 55%), linear-gradient(160deg, #1a2980 0%, #051937 100%)' },
  { id: 'forest', name: 'Forest', scrim: 0.5,
    css: 'radial-gradient(110% 100% at 80% 0%, #3ddc84 0%, transparent 55%), linear-gradient(160deg, #0b3d2e 0%, #07140f 100%)' },
  { id: 'midnight', name: 'Midnight', scrim: 0.45,
    css: 'radial-gradient(120% 100% at 70% 0%, #3a3f6e 0%, transparent 55%), linear-gradient(160deg, #1b1f3b 0%, #05060f 100%)' },
  { id: 'rose', name: 'Rosé', scrim: 0.5,
    css: 'radial-gradient(110% 100% at 20% 0%, #ff6a88 0%, transparent 55%), linear-gradient(160deg, #b5179e 0%, #560bad 100%)' },
  { id: 'carbon', name: 'Carbon', scrim: 0.4,
    css: 'radial-gradient(120% 120% at 50% -10%, #2a2a35 0%, #0c0c12 60%)' },
  // --- thème clair ---
  { id: 'paper', name: 'Paper', scrim: 0.18, light: true,
    css: 'radial-gradient(120% 110% at 80% 0%, #ffe9d6 0%, transparent 55%), linear-gradient(160deg, #fef6ee 0%, #f3e7da 100%)' },
  { id: 'sky', name: 'Sky', scrim: 0.16, light: true,
    css: 'radial-gradient(110% 100% at 20% 0%, #cdeafe 0%, transparent 55%), linear-gradient(160deg, #eaf4ff 0%, #d7e6f5 100%)' },
  { id: 'cream', name: 'Cream', scrim: 0.16, light: true,
    css: 'linear-gradient(160deg, #fbfbf7 0%, #ece9e1 100%)' },
]

export const DEFAULT_BG = BACKGROUNDS[0]

// Palettes d'accent (dégradé from -> to) appliquées à la barre, aux records, au tracé.
export const ACCENTS = [
  { id: 'flame', name: 'Flamme', from: '#fc4c02', to: '#ff2d6f' },
  { id: 'sunrise', name: 'Aube', from: '#ff9d00', to: '#ff2d6f' },
  { id: 'violet', name: 'Violet', from: '#7a5cff', to: '#ff2d6f' },
  { id: 'cyan', name: 'Cyan', from: '#00d4ff', to: '#5b8cff' },
  { id: 'lime', name: 'Citron', from: '#a3e635', to: '#16a34a' },
  { id: 'mint', name: 'Menthe', from: '#2dd4bf', to: '#3b82f6' },
  { id: 'mono', name: 'Mono', from: '#ffffff', to: '#b9b9c6' },
]

export const DEFAULT_ACCENT = ACCENTS[0]
