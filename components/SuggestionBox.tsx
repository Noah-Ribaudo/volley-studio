'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MAX_LENGTH = 500

export default function SuggestionBox() {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitSuggestion = useAction(api.suggestions.submitSuggestion)

  async function handleSubmit() {
    if (!text.trim() || submitting) return

    setSubmitting(true)
    try {
      await submitSuggestion({ text: text.trim() })
      setText('')
      toast.success("Sent — thanks for the feedback!")
    } catch {
      toast.error("Something went wrong. Try again?")
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
          <span className="text-xs text-muted-foreground">
            {text.length}/{MAX_LENGTH}
          </span>
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
