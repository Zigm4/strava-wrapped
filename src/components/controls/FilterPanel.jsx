import { Filter } from 'lucide-react'
import { FamilyIcon } from '../icons.jsx'
import { FAMILIES } from '../../lib/activityTypes.js'

export default function FilterPanel({
  availFamilies, selectedFamilies, onToggleFamily, onAllFamilies, allActive,
  compareMode, onCompareMode, deltaLabel, comparePartial, compareReason, compareInProgress, compareAsOf,
  period, selectedYear,
}) {
  return (
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
          {`Pas d'historique avant ${deltaLabel} pour comparer (limite : 5 ans).`}
        </div>
      )}
      {compareInProgress && !comparePartial && (
        <div className="helper">
          Période en cours : comparaison <b>à date</b>{compareAsOf ? ` (au ${compareAsOf})` : ''}, avec l'écart qui reste à combler sur la carte.
        </div>
      )}
    </div>
  )
}
