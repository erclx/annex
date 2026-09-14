import { z } from 'zod'

import type { CorpusVersion } from '@/components/versions'

/**
 * What the address carries, per `canon/wireframes/answer.md` § Behavior: the
 * recorded question, the version, and the provision the Act is showing, so an
 * answer can be linked and opened as it was shared.
 *
 * The question is a recorded question id and nothing else. A description typed
 * on the live build can run to 4 000 characters and says what someone is
 * building, so it never reaches an address a browser keeps in its history.
 */
export interface Address {
  question?: string
  version?: CorpusVersion
  provision?: string
}

/**
 * Each field is validated on its own and dropped when it fails, so a link
 * carrying one mangled field still opens on the two that read.
 */
const addressSchema = z.object({
  q: z
    .string()
    .regex(/^q\d{2}-[a-z0-9-]+$/)
    .optional()
    .catch(undefined),
  v: z.enum(['original', 'consolidated']).optional().catch(undefined),
  p: z
    .string()
    .regex(/^(art|anx|rct)_[0-9A-Za-z.]+$/)
    .optional()
    .catch(undefined),
})

export function readAddress(search: string): Address {
  const params = new URLSearchParams(search)
  const { q, v, p } = addressSchema.parse({
    q: params.get('q') ?? undefined,
    v: params.get('v') ?? undefined,
    p: params.get('p') ?? undefined,
  })

  const address: Address = {}
  if (q !== undefined) address.question = q
  if (v !== undefined) address.version = v
  if (p !== undefined) address.provision = p
  return address
}

/** The query string for an address, empty when it carries nothing. */
export function addressSearch(address: Address): string {
  const params = new URLSearchParams()
  if (address.question) params.set('q', address.question)
  if (address.version) params.set('v', address.version)
  if (address.provision) params.set('p', address.provision)
  const search = params.toString()
  return search === '' ? '' : `?${search}`
}

/**
 * Where a link shared before the answer moved to `/ask` should land, or null
 * when the address names no recorded question and the landing page is the
 * right place for it.
 *
 * The forward rewrites the address from what reads rather than passing the
 * search through, so a mangled field is dropped on the way.
 */
export function forwardedAskPath(search: string): string | null {
  const address = readAddress(search)
  if (address.question === undefined) return null
  return `/ask${addressSearch(address)}`
}
