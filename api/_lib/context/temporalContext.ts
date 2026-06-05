// Contexte temporel — date/heure FR, jour de la semaine, flag après-18h.
// Pur : `now` est injecté (testable). Tout est calé sur Europe/Paris.

const TZ = 'Europe/Paris'

export function parisToday(now: Date): string {
  // en-CA → format ISO YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

function parisHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    }).format(now),
  )
}

export function formatTemporalContext(now: Date): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now)
  const time = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  const lines = [`## Contexte temporel`, `Nous sommes le ${date}, il est ${time} (heure de Paris).`]
  if (parisHour(now) >= 18) {
    lines.push(`Il est tard : si la journée se termine, propose à Jordan de faire son check-out.`)
  }
  return lines.join('\n')
}
