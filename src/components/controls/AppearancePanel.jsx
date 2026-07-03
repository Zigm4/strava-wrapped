import { useRef } from 'react'
import { Upload, X, Palette, Sparkles, Shield, MapPin, Check } from 'lucide-react'
import { FAMILIES } from '../../lib/activityTypes.js'

export default function AppearancePanel({
  backgrounds, bgId, onBg,
  accents, accentId, onAccent,
  theme, onTheme,
  showHeatmap, onHeatmap,
  spotChips = [], spotIndex = 0, onSpotSelect, spotCount = 0,
  privacy, onPrivacy,
  photo, onPhoto, onClearPhoto,
  scrim, onScrim,
}) {
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPhoto(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="panel">
      <h3><Palette size={15} /> Apparence</h3>

      <div className="field-label">Fond</div>
      <div className="bg-grid">
        {backgrounds.map((b) => (
          <button key={b.id} className={`bg-swatch ${!photo && bgId === b.id ? 'active' : ''}`} style={{ background: b.css }} title={b.name} onClick={() => onBg(b.id)} />
        ))}
        <button className={`bg-swatch upload ${photo ? 'has-photo active' : ''}`} onClick={() => fileRef.current?.click()} title="Importer une photo">
          {photo ? <img src={photo} alt="" /> : <Upload size={18} />}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {photo && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={onClearPhoto}><X size={15} /> Retirer la photo</button>}

      <div className="divider" />
      <div className="field-label"><span><Sparkles size={13} style={{ verticalAlign: '-2px' }} /> Accent</span></div>
      <div className="accent-row">
        {accents.map((a) => (
          <button key={a.id} className={`accent-dot ${accentId === a.id ? 'active' : ''}`} title={a.name}
            style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }} onClick={() => onAccent(a.id)} />
        ))}
      </div>

      <div className="divider" />
      <div className="field-label">Thème de la carte</div>
      <div className="segment">
        <button className={theme === 'dark' ? 'active' : ''} onClick={() => onTheme('dark')}>Sombre</button>
        <button className={theme === 'light' ? 'active' : ''} onClick={() => onTheme('light')}>Clair</button>
      </div>

      <div className="divider" />
      <div className="field-label">Visuel du bas</div>
      <div className="segment">
        <button className={!showHeatmap ? 'active' : ''} onClick={() => onHeatmap(false)}>Carte du spot</button>
        <button className={showHeatmap ? 'active' : ''} onClick={() => onHeatmap(true)}>Calendrier</button>
      </div>

      {!showHeatmap && spotCount > 1 && (
        <>
          <div className="field-label" style={{ marginTop: 16 }}>
            <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> Spot affiché</span>
          </div>
          <div className="spot-picker">
            {spotChips.map((c, i) => (
              <button key={i} type="button" className={`spot-chip ${i === spotIndex ? 'active' : ''}`} onClick={() => onSpotSelect(i)}>
                <span className="spot-chip-name">
                  {i === spotIndex
                    ? <Check size={13} className="spot-chip-check" />
                    : <i className="spot-dot" style={{ background: (c.type && FAMILIES[c.type]?.color) || 'var(--accent)' }} />}
                  <span className="spot-chip-label">{c.label}</span>
                </span>
                <span className="spot-chip-sub">{c.sub}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="divider" />
      <div className="field-label"><span><Shield size={13} style={{ verticalAlign: '-2px' }} /> Confidentialité du tracé</span></div>
      <div className="segment">
        <button className={privacy ? 'active' : ''} onClick={() => onPrivacy(true)}>Protégé</button>
        <button className={!privacy ? 'active' : ''} onClick={() => onPrivacy(false)}>Précis</button>
      </div>
      <div className="helper">« Protégé » masque tes points de départ/arrivée (≈ chez toi) sur l'image partagée.</div>

      <div className="divider" />
      <div className="field-label"><span>Voile</span><span>{Math.round(scrim * 100)}%</span></div>
      <input className="slider" type="range" min="0" max="1" step="0.05" value={scrim} onChange={(e) => onScrim(parseFloat(e.target.value))} />
    </div>
  )
}
