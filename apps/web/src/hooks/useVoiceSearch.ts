'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

type Status = 'idle' | 'listening' | 'error'

interface UseVoiceSearchOptions {
  onResult: (transcript: string) => void
  lang?: string
}

export function useVoiceSearch({ onResult, lang = 'en' }: UseVoiceSearchOptions) {
  const [status, setStatus] = useState<Status>('idle')
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  // Keep a stable ref to the latest onResult so the recognition handler
  // never captures a stale closure
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  useEffect(() => {
    setSupported(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))
  }, [])

  const start = useCallback(() => {
    if (!supported) return

    recognitionRef.current?.abort()

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognitionRef.current = recognition

    setStatus('listening')

    recognition.onresult = (e: any) => {
      const text: string = e.results[0][0].transcript.trim()
      setStatus('idle')
      if (text) onResultRef.current(text)
    }

    recognition.onerror = (e: any) => {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 1500)

      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        toast.error('Microphone access denied. Allow mic access in your browser settings.')
      } else if (e.error === 'no-speech') {
        toast('No speech detected. Try again.', { icon: '🎤' })
      } else if (e.error === 'network') {
        toast.error('Voice search needs an internet connection.')
      } else if (e.error === 'language-not-supported') {
        toast.error('Voice search language not supported on this browser.')
      } else {
        toast.error('Voice search failed. Try again.')
      }
    }

    recognition.onend = () => {
      setStatus(s => s === 'listening' ? 'idle' : s)
    }

    try {
      recognition.start()
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 1500)
      toast.error('Could not start voice search.')
    }
  }, [supported, lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus('idle')
  }, [])

  return { status, supported, start, stop }
}
