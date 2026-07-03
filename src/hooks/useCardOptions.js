import { useState } from 'react'
import { BACKGROUNDS, DEFAULT_BG, ACCENTS, DEFAULT_ACCENT } from '../data/backgrounds.js'

// Options d'apparence de la carte : format, fond, accent, thème, photo, textes, etc.
export function useCardOptions() {
  const [formatId, setFormatId] = useState('story')
  const [bgId, setBgId] = useState(DEFAULT_BG.id)
  const [accentId, setAccentId] = useState(DEFAULT_ACCENT.id)
  const [theme, setTheme] = useState('dark')
  const [photo, setPhoto] = useState(null)
  const [scrim, setScrim] = useState(DEFAULT_BG.scrim)
  const [title, setTitle] = useState('')
  const [handle, setHandle] = useState('')
  const [privacy, setPrivacy] = useState(true) // masquer le départ/arrivée du tracé
  const [showHeatmap, setShowHeatmap] = useState(false) // calendrier vs carte du spot
  const [compareMode, setCompareMode] = useState('off') // 'off' | 'prev' | 'yoy'

  const background = BACKGROUNDS.find((b) => b.id === bgId) || DEFAULT_BG
  const accent = ACCENTS.find((a) => a.id === accentId) || DEFAULT_ACCENT

  function chooseBg(id) {
    setPhoto(null)
    setBgId(id)
    const b = BACKGROUNDS.find((x) => x.id === id)
    if (b) { setScrim(b.scrim); setTheme(b.light ? 'light' : 'dark') }
  }
  function choosePhoto(dataUrl) { setPhoto(dataUrl); setScrim(0.7) }
  function clearPhoto() { setPhoto(null); setScrim(background.scrim) }

  return {
    formatId, setFormatId, bgId, accentId, setAccentId, theme, setTheme,
    photo, scrim, setScrim, title, setTitle, handle, setHandle,
    privacy, setPrivacy, showHeatmap, setShowHeatmap, compareMode, setCompareMode,
    background, accent, chooseBg, choosePhoto, clearPhoto,
  }
}
