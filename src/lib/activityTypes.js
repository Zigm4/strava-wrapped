// Regroupement des dizaines de types Strava en grandes familles lisibles.
// (les icônes sont mappées côté composant via la clé `key`)

// Palette ÉQUILIBRÉE : luminosité/saturation proches d'une couleur à l'autre pour qu'aucune
// (surtout un orange saturé) ne « pèse » plus que les autres dans les jauges empilées.
export const FAMILIES = {
  run:     { key: 'run',     label: 'Course',   color: '#ef8a6a', metric: 'pace'  },
  ride:    { key: 'ride',    label: 'Vélo',     color: '#5a9fe0', metric: 'speed' },
  hike:    { key: 'hike',    label: 'Rando',    color: '#5cc07f', metric: 'pace'  },
  walk:    { key: 'walk',    label: 'Marche',   color: '#d9a95c', metric: 'pace'  },
  swim:    { key: 'swim',    label: 'Natation', color: '#48c4cf', metric: 'swim'  },
  ski:     { key: 'ski',     label: 'Ski',      color: '#a98fe0', metric: 'speed' },
  workout: { key: 'workout', label: 'Renfo',    color: '#dd8fb0', metric: 'time'  },
  water:   { key: 'water',   label: 'Nautique', color: '#7f93ea', metric: 'time'  },
  other:   { key: 'other',   label: 'Autre',    color: '#9aa4b2', metric: 'time'  },
}

const MAP = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'ride', MountainBikeRide: 'ride', GravelRide: 'ride', VirtualRide: 'ride',
  EBikeRide: 'ride', EMountainBikeRide: 'ride', Velomobile: 'ride', Handcycle: 'ride',
  Hike: 'hike', Snowshoe: 'hike', RockClimbing: 'hike',
  Walk: 'walk', Wheelchair: 'walk',
  Swim: 'swim',
  AlpineSki: 'ski', BackcountrySki: 'ski', NordicSki: 'ski', Snowboard: 'ski', RollerSki: 'ski', IceSkate: 'ski',
  WeightTraining: 'workout', Workout: 'workout', Crossfit: 'workout', Yoga: 'workout',
  Pilates: 'workout', Elliptical: 'workout', StairStepper: 'workout',
  HighIntensityIntervalTraining: 'workout',
  Kayaking: 'water', Canoeing: 'water', Rowing: 'water', StandUpPaddling: 'water',
  Surfing: 'water', Kitesurf: 'water', Windsurf: 'water', Sail: 'water',
}

export function familyKey(type) {
  return MAP[type] || 'other'
}

export function family(type) {
  return FAMILIES[familyKey(type)]
}

// ordre d'affichage stable
export const FAMILY_ORDER = ['run', 'ride', 'hike', 'walk', 'swim', 'ski', 'water', 'workout', 'other']
