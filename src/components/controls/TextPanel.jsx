import { Type } from 'lucide-react'

export default function TextPanel({ title, onTitle, handle, onHandle }) {
  return (
    <div className="panel">
      <h3><Type size={15} /> Texte</h3>
      <div className="field-label">Titre</div>
      <input className="text-input" value={title} maxLength={28} placeholder="Mon mois" onChange={(e) => onTitle(e.target.value)} />
      <div className="field-label" style={{ marginTop: 12 }}>Pseudo / signature</div>
      <input className="text-input" value={handle} maxLength={24} placeholder="@ton_pseudo" onChange={(e) => onHandle(e.target.value)} />
    </div>
  )
}
