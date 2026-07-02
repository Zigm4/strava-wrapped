// Contrats de données centraux (JSDoc). Ce fichier n'exporte rien à l'exécution :
// il documente la forme des objets qui circulent entre strava.js, demoData.js,
// aggregate.js, cache.js et les composants. Importe ces typedefs avec
// `@typedef {import('./types.js').Activity} Activity` là où c'est utile.

/**
 * Activité normalisée (sortie de `normalize()` dans strava.js et de la démo).
 * @typedef {Object} Activity
 * @property {number} id
 * @property {string} name
 * @property {string} type - sport_type Strava (ex. "TrailRun", "GravelRide")
 * @property {number|null} workout_type - 1 = course "Race", 11 = vélo "Race"
 * @property {number} distance - mètres
 * @property {number} moving_time - secondes
 * @property {number} elapsed_time - secondes
 * @property {number} total_elevation_gain - mètres (D+)
 * @property {number} total_elevation_loss - mètres (0 sur données réelles résumées)
 * @property {string} start_date_local - heure LOCALE de l'athlète, suffixée "Z" (voir date.js)
 * @property {number} average_speed - m/s
 * @property {number} max_speed - m/s
 * @property {string|null} location_city
 * @property {string|null} location_state
 * @property {string|null} location_country
 * @property {[number, number]|null} start_latlng
 * @property {Array<[number, number]>|null} routePoints - polyline décodée [lat, lng]
 * @property {number} achievement_count
 * @property {number} pr_count
 * @property {number} kudos_count
 * @property {number} calories - 0 sur données réelles résumées
 */

/**
 * Récap agrégé d'une période (sortie de `aggregate()`).
 * @typedef {Object} Summary
 * @property {number} count
 * @property {number} totalDistance - mètres
 * @property {number} totalElevation - mètres
 * @property {number} totalMovingTime - secondes
 * @property {number} achievements
 * @property {number} kudos
 * @property {number} activeDays
 * @property {number} streak - plus longue série de jours consécutifs
 * @property {number} weekendShare - part [0..1] des sorties le week-end
 * @property {string|null} dayPart - "matin" | "midi" | "après-midi" | "soir" | "nuit"
 * @property {string|null} dominantFamily - clé de famille dominante
 * @property {Array<Object>} byType - { key, label, color, distance, count, time, elevation }
 * @property {Object} records - { longest, biggestClimb, longestTime, bestRun, bestRide, topDay }
 * @property {Array<Object>} races - sorties taguées "Race"
 * @property {Object|null} favoriteSpot
 * @property {Array<[number, number]>|null} heroRoute
 * @property {Object.<string, number>} dailyDistance - { 'YYYY-MM-DD': mètres } pour la heatmap
 */

/**
 * Entrée du cache local (IndexedDB).
 * @typedef {Object} CacheEntry
 * @property {Activity[]} activities
 * @property {string|null} athleteName
 * @property {number} fetchedAt - timestamp ms
 * @property {{year: number, month: number}} [coverageStart] - début de l'historique couvert
 */

export {}
