import { Layers } from 'lucide-react'
import { FORMATS, FORMAT_ORDER } from '../../data/formats.js'

export default function FormatPanel({ formatId, onFormat }) {
  return (
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
  )
}
