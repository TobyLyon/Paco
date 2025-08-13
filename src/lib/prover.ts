import { keccak256 } from 'ethers'

export type ProofResponse = {
  roundId: string
  serverSeed: string
  commitHash: string
  keccakOfSeed: string
  crashMultiplier: number
  steps: string[]
}

export function calculateCrashFromSeed(serverSeed: string, opts?: { min?: number; max?: number; houseEdge?: number }) {
  const min = opts?.min ?? 1.0
  const max = opts?.max ?? 1000.0
  const houseEdge = opts?.houseEdge ?? 0.01
  const hash = keccak256(`0x${serverSeed}`)
  const bigint = BigInt(hash)
  const r = Number(bigint % (2n ** 52n)) / Number(2n ** 52n)
  const raw = Math.floor((100 * (1 - houseEdge)) / Math.max(r, 1e-12)) / 100
  const capped = Math.max(min, Math.min(raw, max))
  return Math.round(capped * 100) / 100
}

export async function fetchProof(roundId: string, baseUrl = ''): Promise<ProofResponse> {
  const res = await fetch(`${baseUrl}/proof/${encodeURIComponent(roundId)}`)
  if (!res.ok) throw new Error(`Proof fetch failed: ${res.status}`)
  return (await res.json()) as ProofResponse
}

export async function verifyRound(roundId: string, baseUrl = ''): Promise<{ ok: boolean; expected: number; got: number; details: ProofResponse }> {
  const proof = await fetchProof(roundId, baseUrl)
  const expected = calculateCrashFromSeed(proof.serverSeed)
  const got = Number(proof.crashMultiplier)
  return { ok: Math.abs(expected - got) < 1e-9, expected, got, details: proof }
}


