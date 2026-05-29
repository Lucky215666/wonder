export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('Vector dimensions mismatch')
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export interface VectorCandidate {
  id: string
  embedding: Float32Array
  [key: string]: unknown
}

export function searchVectors(
  query: Float32Array,
  candidates: VectorCandidate[],
  topK: number
): (VectorCandidate & { similarity: number })[] {
  const scored = candidates.map(c => ({
    ...c,
    similarity: cosineSimilarity(query, c.embedding),
  }))
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, topK)
}

export function serializeEmbedding(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength)
}

export function deserializeEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
}
