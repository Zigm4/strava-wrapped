// Enregistrement adapté à la plateforme :
//  - sur MOBILE : la feuille de partage native (Web Share API) -> vers Instagram, Photos, etc.
//  - sur PC : un téléchargement classique du fichier.
// Aucune donnée n'est envoyée : tout reste local (Blob).

export function isMobile() {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

// Renvoie 'shared' | 'downloaded' | 'aborted'.
export async function saveOrShare(blob, filename, { title } = {}) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  if (isMobile() && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'aborted'
      // sinon (partage refusé/indisponible) on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 8000)
  return 'downloaded'
}
