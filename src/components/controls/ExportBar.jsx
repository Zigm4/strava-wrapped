import { Download, Share2, Copy, Link as LinkIcon, PlayCircle } from 'lucide-react'

export default function ExportBar({ onExport, exporting, onShare, canShare, onCopy, canCopy, onShareLink, onPlayRecap }) {
  return (
    <>
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
      {onPlayRecap && (
        <button className="btn recap-launch" onClick={onPlayRecap}>
          <PlayCircle size={20} /> Voir mon Rewind
          <span className="recap-launch-sub">récap animé + vidéo, avec tes réglages</span>
        </button>
      )}
    </>
  )
}
