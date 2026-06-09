import type { SupabaseClient } from '@supabase/supabase-js'

/** Jaccard similarity on word sets (ignores words ≤ 2 chars as stopwords). */
export function titleSimilarity(a: string, b: string): number {
  const words = (s: string) =>
    new Set(s.toLowerCase().split(/[\s\W]+/).filter(w => w.length > 2))
  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 && wb.size === 0) return 1
  if (wa.size === 0 || wb.size === 0) return 0
  const intersection = [...wa].filter(w => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union
}

export interface DuplicateCandidate {
  id: string
  title: string
  thumbnail_url: string | null
}

/**
 * Checks whether the seller already has an active listing that looks like a
 * duplicate of the new one (same category + condition, title similarity > 0.6).
 * Returns the first match or null.
 */
export async function findDuplicateListing(
  supabase: SupabaseClient,
  sellerId: string,
  category: string,
  condition: string,
  title: string,
): Promise<DuplicateCandidate | null> {
  const { data } = await supabase
    .from('products')
    .select('id, title, thumbnail_url')
    .eq('seller_id', sellerId)
    .eq('category', category)
    .eq('condition', condition)
    .eq('is_available', true)

  if (!data || data.length === 0) return null

  for (const product of data) {
    if (titleSimilarity(title, product.title) > 0.6) {
      return product as DuplicateCandidate
    }
  }
  return null
}
