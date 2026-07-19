import { Target } from 'lucide-react'
import { daysUntil } from '../../lib/date.js'

// Objectif de la carte hebdo : un événement (texte + date -> compte à rebours) et/ou
// un objectif de distance pour la semaine. Les deux volets sont optionnels.
export default function ObjectivePanel({
  objectiveText, onObjectiveText, objectiveDate, onObjectiveDate, weeklyGoalKm, onWeeklyGoalKm,
}) {
  const jx = objectiveDate ? daysUntil(objectiveDate) : null
  return (
    <div className="panel">
      <h3><Target size={15} /> Objectif</h3>

      <div className="field-label">Événement (texte libre)</div>
      <input className="text-input" value={objectiveText} maxLength={32} placeholder="Marathon de Paris"
        onChange={(e) => onObjectiveText(e.target.value)} />

      <div className="field-label" style={{ marginTop: 12 }}>Date de l'événement</div>
      <input className="text-input" type="date" value={objectiveDate} onChange={(e) => onObjectiveDate(e.target.value)} />
      {jx != null && (
        <div className="helper">{jx > 0 ? `Dans ${jx} jour${jx > 1 ? 's' : ''} (J-${jx})` : jx === 0 ? "C'est aujourd'hui !" : `Passé de ${-jx} jour${-jx > 1 ? 's' : ''}`}</div>
      )}

      <div className="divider" />
      <div className="field-label">Objectif distance de la semaine (km)</div>
      <input className="text-input" type="number" min="0" step="1" inputMode="numeric" value={weeklyGoalKm}
        placeholder="50" onChange={(e) => onWeeklyGoalKm(e.target.value)} />
      <div className="helper">Laisse vide pour masquer un volet. Les deux s'affichent sur la carte hebdo.</div>
    </div>
  )
}
