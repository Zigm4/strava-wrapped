import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

// Compteur animé : interpole de l'ancienne valeur vers la nouvelle.
export default function AnimatedNumber({ value, format = (v) => Math.round(v), duration = 1.1 }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    prev.current = value
    return () => controls.stop()
  }, [value, duration])

  return <>{format(display)}</>
}
