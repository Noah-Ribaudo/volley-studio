'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAction, useConvexAuth } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { FeedbackButton } from '@/components/ui/feedback-button'
import { InlineFeedback } from '@/components/ui/inline-feedback'
import { useInlineFeedback } from '@/hooks/useInlineFeedback'

const MAX_LENGTH = 1000
const SHOW_COUNT_AT = 500
const SUCCESS_STATE_MS = 2200

type SubmitButtonState = 'idle' | 'submitting' | 'success'

export default function SuggestionBox() {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [buttonState, setButtonState] = useState<SubmitButtonState>('idle')
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { feedback, showSuccess, showError, clearFeedback } = useInlineFeedback()
  const { isAuthenticated } = useConvexAuth()
  const submitSuggestion = useAction(api.suggestions.submitSuggestion)

  const clearSuccessTimer = useCallback(() => {
    if (!successTimerRef.current) return
    clearTimeout(successTimerRef.current)
    successTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => clearSuccessTimer()
  }, [clearSuccessTimer])

  useEffect(() => {
    if (isAuthenticated) return
    clearFeedback()
    clearSuccessTimer()
    setButtonState('idle')
    setSubmitting(false)
  }, [clearFeedback, clearSuccessTimer, isAuthenticated])

  async function handleSubmit() {
    if (!text.trim() || submitting || !isAuthenticated) return

    clearFeedback()
    clearSuccessTimer()
    setSubmitting(true)
    setButtonState('submitting')

    try {
      await submitSuggestion({ text: text.trim() })
      setText('')
      setButtonState('success')
      showSuccess('Sent. Thanks for the feedback.')
      successTimerRef.current = setTimeout(() => {
        setButtonState('idle')
        successTimerRef.current = null
      }, SUCCESS_STATE_MS)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Try again?"
      setButtonState('idle')
      showError(message, {
        label: 'Try again',
        onClick: () => {
          void handleSubmit()
        },
      })
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
            if (feedback?.tone === 'error') {
              clearFeedback()
            }
            if (buttonState === 'success') {
              clearSuccessTimer()
              setButtonState('idle')
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
          <div className="relative flex min-h-8 items-center justify-end">
            {feedback?.tone === 'success' ? (
              <InlineFeedback
                tone="success"
                message={feedback.message}
                compact
                className="pointer-events-none absolute -top-10 right-0 z-10"
              />
            ) : null}
            <FeedbackButton
              size="sm"
              state={buttonState}
              idleLabel="Send it"
              submittingLabel="Sending..."
              successLabel="Sent"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting || !isAuthenticated}
            />
          </div>
        </div>
        <div className="min-h-10">
          {feedback?.tone === 'error' ? (
            <InlineFeedback
              tone="error"
              message={feedback.message}
              action={feedback.action}
              className="w-full justify-between"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
