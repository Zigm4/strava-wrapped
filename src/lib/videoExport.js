// Export du récap en vidéo, 100% dans le navigateur, aucune donnée envoyée.
// Chemin privilégié : WebCodecs (H.264) + muxer MP4 (encode plus vite que le temps réel).
// Repli : MediaRecorder + canvas.captureStream() -> WebM (enregistrement en temps réel).

import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { drawFrame } from './recapRender.js'

export function videoSupport() {
  if (typeof window === 'undefined') return 'none'
  if ('VideoEncoder' in window && 'VideoFrame' in window) return 'webcodecs'
  const canRecord =
    typeof HTMLCanvasElement !== 'undefined' &&
    HTMLCanvasElement.prototype.captureStream &&
    'MediaRecorder' in window
  return canRecord ? 'mediarecorder' : 'none'
}

async function pickAvcCodec(W, H, fps) {
  const cands = ['avc1.640028', 'avc1.4d0028', 'avc1.42002a', 'avc1.640033', 'avc1.42e01f']
  for (const codec of cands) {
    try {
      const { supported } = await window.VideoEncoder.isConfigSupported({ codec, width: W, height: H, bitrate: 8_000_000, framerate: fps })
      if (supported) return codec
    } catch {
      /* essaie le suivant */
    }
  }
  return null
}

export async function exportRecapVideo(tl, opts, onProgress) {
  const { W, H, acc, theme = 'dark', bg = null, fps = 30 } = opts
  const mode = videoSupport()
  if (mode === 'webcodecs') {
    const codec = await pickAvcCodec(W, H, fps)
    if (codec) return encodeWebCodecs(tl, { W, H, acc, theme, bg, fps, codec }, onProgress)
  }
  if (mode !== 'none') return recordMediaRecorder(tl, { W, H, acc, theme, bg, fps }, onProgress)
  throw new Error('unsupported')
}

async function encodeWebCodecs(tl, { W, H, acc, theme, bg, fps, codec }, onProgress) {
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (document.fonts?.load) {
    try { await Promise.all([document.fonts.load('400 200px "Anton"'), document.fonts.load('700 100px "Space Grotesk"'), document.fonts.load('600 40px "Inter"')]) } catch { /* noop */ }
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: W, height: H },
    fastStart: 'in-memory',
  })
  let encoderError = null
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; console.error('VideoEncoder', e) },
  })
  encoder.configure({ codec, width: W, height: H, bitrate: 8_000_000, framerate: fps })

  const total = Math.max(1, Math.ceil(tl.total * fps))
  const gop = fps * 2
  // Backpressure : l'encodeur (surtout matériel, sur mobile) est plus lent que la boucle.
  // Sans attendre qu'il draine sa file, les VideoFrame en attente s'accumulent en mémoire
  // et l'onglet finit tué par l'OS (la page « revient » alors à l'accueil). On borne donc
  // la profondeur de file : on cède la main jusqu'à ce qu'elle redescende.
  const MAX_QUEUE = 6
  for (let f = 0; f < total; f++) {
    if (encoderError) throw encoderError
    while (encoder.encodeQueueSize > MAX_QUEUE) {
      await new Promise((r) => setTimeout(r, 8))
      if (encoderError) throw encoderError
      if (encoder.state !== 'configured') throw new Error('encoder-closed')
    }
    const t = f / fps
    drawFrame(ctx, tl, t, { W, H, acc, theme, bg })
    const frame = new window.VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) })
    encoder.encode(frame, { keyFrame: f % gop === 0 })
    frame.close()
    if (onProgress && f % 4 === 0) onProgress(f / total)
    if (f % 8 === 0) await new Promise((r) => setTimeout(r, 0)) // garde l'UI réactive
  }
  await encoder.flush()
  muxer.finalize()
  onProgress?.(1)
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), ext: 'mp4' }
}

async function recordMediaRecorder(tl, { W, H, acc, theme, bg, fps }, onProgress) {
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (document.fonts?.load) {
    try { await Promise.all([document.fonts.load('400 200px "Anton"'), document.fonts.load('700 100px "Space Grotesk"'), document.fonts.load('600 40px "Inter"')]) } catch { /* noop */ }
  }

  const stream = canvas.captureStream(fps)
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
    (m) => window.MediaRecorder.isTypeSupported(m),
  ) || 'video/webm'
  const rec = new window.MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const stopped = new Promise((res) => (rec.onstop = res))
  rec.start()

  const start = performance.now()
  await new Promise((resolve) => {
    const loop = () => {
      const t = (performance.now() - start) / 1000
      if (t >= tl.total) { resolve(); return }
      drawFrame(ctx, tl, t, { W, H, acc, theme, bg })
      onProgress?.(t / tl.total)
      requestAnimationFrame(loop)
    }
    loop()
  })
  rec.stop()
  await stopped
  onProgress?.(1)
  return { blob: new Blob(chunks, { type: mime }), ext: 'webm' }
}
