import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient is already a singleton in browser environments
  // (cached internally via cachedBrowserClient). The lock bypass eliminates
  // the "navigator.locks stolen" console error without any functional downside.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: (_name: string, _timeout: number, fn: () => Promise<unknown>) => fn(),
      },
    }
  )
}
