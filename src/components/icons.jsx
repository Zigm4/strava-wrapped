import {
  Footprints, Bike, Mountain, Waves, Snowflake, Dumbbell, Sailboat, Activity,
} from 'lucide-react'

export const FAMILY_ICONS = {
  run: Footprints,
  ride: Bike,
  hike: Mountain,
  walk: Footprints,
  swim: Waves,
  ski: Snowflake,
  workout: Dumbbell,
  water: Sailboat,
  other: Activity,
}

export function FamilyIcon({ k, size = 24, ...rest }) {
  const Ico = FAMILY_ICONS[k] || Activity
  return <Ico size={size} {...rest} />
}
