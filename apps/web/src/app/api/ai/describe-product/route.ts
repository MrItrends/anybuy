import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Anthropic media types their vision API accepts
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type AnthropicMediaType = typeof SUPPORTED_TYPES[number]

interface ImageInput {
  data:      string          // base64-encoded image data (no data-URL prefix)
  mediaType: AnthropicMediaType
}

const CONDITION_LABELS: Record<string, string> = {
  new:     'Brand New (unused, original packaging)',
  grade_a: 'Grade A (almost new, minimal signs of use)',
  grade_b: 'Grade B (good condition, light wear visible)',
  grade_c: 'Grade C (fair condition, noticeable wear)',
}

export async function POST(req: NextRequest) {
  // Auth guard — must be a logged-in seller
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  }

  const body = await req.json() as {
    images:    ImageInput[]
    category:  string
    condition: string
    title?:    string
  }

  const { images, category, condition, title } = body

  // Accept up to 3 images; filter unsupported types
  const validImages = images
    .filter(img => SUPPORTED_TYPES.includes(img.mediaType as AnthropicMediaType))
    .slice(0, 3)

  if (validImages.length === 0) {
    return NextResponse.json({ error: 'No valid images provided' }, { status: 400 })
  }

  const conditionLabel = CONDITION_LABELS[condition] ?? condition

  // Build message content — images first, then the text prompt
  const imageBlocks = validImages.map(img => ({
    type: 'image',
    source: {
      type:       'base64',
      media_type: img.mediaType,
      data:       img.data,
    },
  }))

  const textPrompt = `You are helping a seller on AnyBuy — Nigeria's trusted secondhand marketplace — write an honest, buyer-friendly product description.

Look carefully at the photo(s) of the item and write a description that buyers will genuinely find useful before making a purchase decision.

Seller's context:
- Category: ${category}
- Condition: ${conditionLabel}
${title ? `- Product title: ${title}` : ''}

Your description must:
1. Open with what the product is and its most visible, notable features
2. Describe the physical condition honestly — confirm it looks clean, or mention any visible scratches, marks, or wear you can actually see
3. Note what appears to be included based on the photos (box, charger, accessories, manual, etc.) — if nothing extra is visible, say so
4. End with one practical sentence that reassures the buyer about the purchase (escrow protection, can answer questions, etc.)

Strict rules:
- ONLY describe what is actually visible in the images — never invent model numbers, storage sizes, colour names, RAM, or any spec you cannot directly see in the photo
- Write flowing prose — no bullet points, no headers, no numbered lists
- 130–200 words
- Warm, honest, conversational tone — this is a person-to-person marketplace
- Write as a neutral, third-person product description
- Output ONLY the description — no preamble, no "Here is a description:", nothing else`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':          apiKey,
      'anthropic-version':  '2023-06-01',
      'content-type':       'application/json',
    },
    body: JSON.stringify({
      model:      'claude-3-5-sonnet-20241022',
      max_tokens: 400,
      messages: [{
        role:    'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: textPrompt },
        ],
      }],
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('Anthropic API error:', result)
    return NextResponse.json(
      { error: result.error?.message ?? 'AI generation failed' },
      { status: 502 }
    )
  }

  const description: string = result.content?.[0]?.text?.trim() ?? ''
  if (!description) {
    return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
  }

  return NextResponse.json({ description })
}
