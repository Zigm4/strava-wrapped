// Regroupement des dizaines de types Strava en grandes familles lisibles.
// (les icônes sont mappées côté composant via la clé `key`)

export const FAMILIES = {
  run:     { key: 'run',     label: 'Course',   color: '#fc4c02', metric: 'pace'  },
  ride:    { key: 'ride',    label: 'Vélo',     color: '#1fb6ee', metric: 'speed' },
  hike:    { key: 'hike',    label: 'Rando',    color: '#34d399', metric: 'pace'  },
  walk:    { key: 'walk',    label: 'Marche',   color: '#2dd4bf', metric: 'pace'  },
  swim:    { key: 'swim',    label: 'Natation', color: '#38bdf8', metric: 'swim'  },
  ski:     { key: 'ski',     label: 'Ski',      color: '#a78bfa', metric: 'speed' },
  workout: { key: 'workout', label: 'Renfo',    color: '#f59e0b', metric: 'time'  },
  water:   { key: 'water',   label: 'Nautique', color: '#06b6d4', metric: 'time'  },
  other:   { key: 'other',   label: 'Autre',    color: '#94a3b8', metric: 'time'  },
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
