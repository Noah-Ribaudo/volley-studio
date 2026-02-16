'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MAX_LENGTH = 1000
const SHOW_COUNT_AT = 500
const SUGGESTION_CLIENT_ID_KEY = 'volley-suggestion-client-id'

function getOrCreateSuggestionClientId(): string | undefined {
  if (typeof window === 'undefined') return undefined

  const existingId = window.localStorage.getItem(SUGGESTION_CLIENT_ID_KEY)
  if (existingId) return existingId

  const generatedId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  window.localStorage.setItem(SUGGESTION_CLIENT_ID_KEY, generatedId)
  return generatedId
}

export default function SuggestionBox() {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientId, setClientId] = useState<string | undefined>(undefined)
  const submitSuggestion = useAction(api.suggestions.submitSuggestion)

  useEffect(() => {
    setClientId(getOrCreateSuggestionClientId())
  }, [])

  async function handleSubmit() {
    if (!text.trim() || submitting) return

    setSubmitting(true)
    try {
      await submitSuggestion({ text: text.trim(), clientId })
      setText('')
      toast.success("Sent — thanks for the feedback!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Try again?"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Got an idea?</CardTitle>
        <CardDescription>
          I built this for coaches like you. Tell me what&apos;s missing or what would make your life easier.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No sign-in required. If you&apos;re already signed in, your account info is included automatically.
        </p>
        <Textarea
          placeholder="I wish this app could..."
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setText(e.target.value)
            }
          }}
          rows={3}
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          {text.length >= SHOW_COUNT_AT ? (
            <span className="text-xs text-muted-foreground">
              {text.length}/{MAX_LENGTH}
            </span>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
          >
            {submitting ? "Sending..." : "Send it"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
