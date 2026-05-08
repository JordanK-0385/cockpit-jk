import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Public health check — no auth, useful for deploy smoke tests. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    ok: true,
    service: 'cockpit-jk',
    sprint: 1,
    time: new Date().toISOString(),
  })
}
