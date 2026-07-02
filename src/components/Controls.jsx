import { useRef } from 'react'
import { Download, Upload, X, CalendarRange, Layers, Palette, Filter, Type, Share2, Copy, Link as LinkIcon, Sparkles, ChevronLeft, ChevronRight, Shield } from 'lucide-react'
import { FamilyIcon } from './icons.jsx'
import { FAMILIES } from '../lib/activityTypes.js'
import { FORMATS, FORMAT_ORDER } from '../data/formats.js'

export default function Controls({
  period, onPeriod,
  months, selectedMonthKey, onSelectMonth,
  monthViewYear, onPrevYear, onNextYear, canPrevYear, canNextYear,
  years, selectedYear, onSelectYear,
  availFamilies, selectedFamilies, onToggleFamily, onAllFamilies, allActive,
  compareMode, onCompareMode, deltaLabel, comparePartial, compareReason,
  formatId, onFormat,
  title, onTitle, handle, onHandle,
  backgrounds, bgId, onBg,
  accents, accentId, onAccent,
  theme, onTheme,
  privacy, onPrivacy,
  showHeatmap, onHeatmap,
  photo, onPhoto, onClearPhoto,
  scrim, onScrim,
  onExport, exporting, onShare, canShare,
  onCopy, canCopy, onShareLink,
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
    <div className="controls-col">
      {/* Période */}
      <div className="panel">
        <h3><CalendarRange size={15} /> Période</h3>
        <div className="segment" style={{ marginBottom: 14 }}>
          <button className={period === 'month' ? 'active' : ''} onClick={() => onPeriod('month')}>Par mois</button>
          <button className={period === 'year' ? 'active' : ''} onClick={() => onPeriod('year')}>Bilan annuel</button>
        </div>
        {period === 'month' ? (
          <>
            <div className="year-nav">
              <button className="ynav-btn" disabled={!canPrevYear} onClick={onPrevYear} aria-label="Année précédente"><ChevronLeft size={18} /></button>
              <span>{monthViewYear}</span>
              <button className="ynav-btn" disabled={!canNextYear} onClick={onNextYear} aria-label="Année suivante"><ChevronRight size={18} /></button>
            </div>
            <div className="months months-12">
              {months.map((m) => (
                <button
                  key={m.key}
                  className={`month-chip ${m.key === selectedMonthKey ? 'active' : ''} ${m.count === 0 ? 'empty' : ''} ${m.outOfRange ? 'out-of-range' : ''}`}
                  disabled={m.outOfRange}
                  title={m.outOfRange ? 'Hors de l\'historique téléchargé (5 ans)' : undefined}
                  onClick={() => onSelectMonth(m)}
                >
                  <div className="m">{m.short}</div>
                  <div className="y">{m.outOfRange ? '—' : m.count > 0 ? `${m.count} act.` : '-'}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="months" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {years.map((y) => (
              <button key={y.year} className={`month-chip ${y.year === selectedYear ? 'active' : ''}`} onClick={() => onSelectYear(y.year)}>
                <div className="m">{y.year}</div>
                <div className="y">{y.count} act.</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Types */}
      <div className="panel">
        <h3><Filter size={15} /> Types d'activité</h3>
        <div className="chips">
          <button className={`chip ${allActive ? 'active' : ''}`} style={{ '--chip': '#fc4c02' }} onClick={onAllFamilies}>Tout</button>
          {availFamilies.map((k) => {
            const f = FAMILIES[k]
            const on = !allActive && selectedFamilies.has(k)
            return (
              <button key={k} className={`chip ${on ? 'active' : ''}`} style={{ '--chip': f.color }} onClick={() => onToggleFamily(k)}>
                <span className="ico"><FamilyIcon k={k} size={16} /></span>{f.label}
              </button>
            )
          })}
        </div>
        {availFamilies.length === 0 && <div className="helper">Aucune activité sur cette période.</div>}

        <div className="divider" />
        <div className="field-label">Comparaison</div>
        <div className="segment">
          <button className={compareMode === 'off' ? 'active' : ''} onClick={() => onCompareMode('off')}>Simple</button>
          <button className={compareMode === 'prev' ? 'active' : ''} onClick={() => onCompareMode('prev')}>
            {period === 'year' ? `vs ${selectedYear - 1}` : 'Mois préc.'}
          </button>
          {period === 'month' && (
            <button className={compareMode === 'yoy' ? 'active' : ''} onClick={() => onCompareMode('yoy')}>An dernier</button>
          )}
        </div>
        {comparePartial && (
          <div className="helper">
            {compareReason === 'incomplete'
              ? 'Comparaison masquée : période en cours (incomplète).'
              : `Pas d'historique avant ${deltaLabel} pour comparer (limite : 5 ans).`}
          </div>
        )}
      </div>

      {/* Format */}
      <div className="panel">
        <h3><Layers size={15} /> Format</h3>
        <div className="segment">
          {FORMAT_ORDER.map((id) => (
            <button key={id} className={formatId === id ? 'active' : ''} onClick={() => onFormat(id)}>
              {FORMATS[id].label}<span className="dim">{FORMATS[id].dim}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Texte perso */}
      <div className="panel">
        <h3><Type size={15} /> Texte</h3>
        <div className="field-label">Titre</div>
        <input className="text-input" value={title} maxLength={28} placeholder="Mon mois" onChange={(e) => onTitle(e.target.value)} />
        <div className="field-label" style={{ marginTop: 12 }}>Pseudo / signature</div>
        <input className="text-input" value={handle} maxLength={24} placeholder="@ton_pseudo" onChange={(e) => onHandle(e.target.value)} />
      </div>

      {/* Apparence */}
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

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: '16px' }} onClick={onExport} disabled={exporting}>
        {exporting ? <><span className="spinner" /> Génération…</> : <><Download size={18} /> Télécharger l'image</>}
      </button>
      <div className="export-row">
        {canShare && (
          <button className="btn btn-ghost" onClick={onShare} disabled={exporting}>
            <Share2 size={17} /> Partager
          </button>
        )}
        {canCopy && (
          <button className="btn btn-ghost" onClick={onCopy} disabled={exporting} title="Copier l'image dans le presse-papiers">
            <Copy size={17} /> Copier
          </button>
        )}
      </div>
      {onShareLink && (
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={onShareLink} title="Créer un lien interactif à partager">
          <LinkIcon size={17} /> Créer mon lien
        </button>
      )}
    </div>
  )
}
