import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

// Compteur animé : interpole de la valeur AFFICHÉE vers la nouvelle (repart de là où on
// en est, donc pas de saut si la valeur change en pleine animation). `still` = pas d'animation
// (utilisé pendant la capture PNG pour figer la valeur finale exacte).
export default function AnimatedNumber({ value, format = (v) => Math.round(v), duration = 1.1, still = false }) {
  const [display, setDisplay] = useState(value)
  const current = useRef(value) // dernière valeur réellement affichée

  useEffect(() => {
    if (still) { current.current = value; setDisplay(value); return }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { current.current = v; setDisplay(v) },
    })
    return () => controls.stop()
  }, [value, duration, still])

  return <>{format(still ? value : display)}</>
}
