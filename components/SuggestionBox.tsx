'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { useConvexAuth } from 'convex/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MAX_LENGTH = 1000
const SHOW_COUNT_AT = 500

export default function SuggestionBox() {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated } = useConvexAuth()
  const submitSuggestion = useAction(api.suggestions.submitSuggestion)

  async function handleSubmit() {
    if (!text.trim() || submitting || !isAuthenticated) return

    setSubmitting(true)
    try {
      await submitSuggestion({ text: text.trim() })
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
        {!isAuthenticated && (
          <p className="text-sm text-muted-foreground">
            <Link href="/sign-in" className="underline underline-offset-2 hover:text-foreground">
              Sign in
            </Link>{' '}
            to submit suggestions.
          </p>
        )}
        <Textarea
          placeholder="I wish this app could..."
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setText(e.target.value)
            }
          }}
          rows={3}
          disabled={submitting || !isAuthenticated}
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
            disabled={!text.trim() || submitting || !isAuthenticated}
          >
            {submitting ? "Sending..." : "Send it"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
