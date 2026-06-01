// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { requireAuthorizedUser } from '../../api/_lib/auth'

function makeReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Parameters<typeof requireAuthorizedUser>[0]
  const status = vi.fn().mockReturnThis()
  const json = vi.fn().mockReturnThis()
  const res = { status, json } as unknown as Parameters<typeof requireAuthorizedUser>[1]
  return { req, res, status, json }
}

describe('requireAuthorizedUser — proxy auth guard', () => {
  it('rejects a request with no Authorization header (401)', async () => {
    const { req, res, status, json } = makeReqRes({})
    const result = await requireAuthorizedUser(req, res)

    expect(result).toBeNull()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/Bearer/i) }),
    )
  })

  it('rejects a request whose Authorization header is not a Bearer token (401)', async () => {
    const { req, res, status } = makeReqRes({ authorization: 'Basic abc' })
    const result = await requireAuthorizedUser(req, res)

    expect(result).toBeNull()
    expect(status).toHaveBeenCalledWith(401)
  })

  it('rejects an empty Bearer token (401)', async () => {
    const { req, res, status, json } = makeReqRes({ authorization: 'Bearer ' })
    const result = await requireAuthorizedUser(req, res)

    expect(result).toBeNull()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/empty/i) }),
    )
  })
})
