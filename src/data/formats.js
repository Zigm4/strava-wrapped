// Formats d'export (résolution native = ce qui est exporté en PNG)
export const FORMATS = {
  story:    { id: 'story',    w: 1080, h: 1920, label: 'Story',  dim: '9:16' },
  portrait: { id: 'portrait', w: 1080, h: 1350, label: 'Post',   dim: '4:5' },
  square:   { id: 'square',   w: 1080, h: 1080, label: 'Carré',  dim: '1:1' },
  poster:   { id: 'poster',   w: 1080, h: 1620, label: 'Poster', dim: '2:3' },
}
export const FORMAT_ORDER = ['story', 'portrait', 'square', 'poster']

// Le format "poster" est une carte à part (mosaïque de tracés), pas une variante de StoryCard.
export const isPoster = (id) => id === 'poster'
