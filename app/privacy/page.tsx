'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link href="/">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">The short version</h2>
            <p className="text-muted-foreground">
              I don't want your data. Seriously. Volley Studio exists to help coaches and players
              visualize rotations. The only reason accounts exist is so your teams can persist
              between sessions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">What we store</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong className="text-foreground">Your email and name</strong> — Just to identify
                who owns which teams. That's it.
              </li>
              <li>
                <strong className="text-foreground">Your team data</strong> — Roster names, jersey
                numbers, and custom rotation layouts. This is the whole point.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">What we don't do</h2>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside">
              <li>Sell your data to anyone</li>
              <li>Track your behavior or analytics</li>
              <li>Share your information with third parties</li>
              <li>Use your data for advertising</li>
              <li>Send you marketing emails</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Google sign-in</h2>
            <p className="text-muted-foreground">
              If you sign in with Google, we receive your name and email from Google. We don't
              get access to your Google contacts, calendar, or anything else. If you'd rather
              not use Google, you can create an account with just an email and password instead.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">No account required</h2>
            <p className="text-muted-foreground">
              You can use the whiteboard and visualization tools without creating an account at
              all. Accounts are only needed if you want to save teams so they persist.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Deleting your data</h2>
            <p className="text-muted-foreground">
              Want your data gone? Delete your teams from the app, or reach out and I'll wipe
              everything. No hoops to jump through.
            </p>
          </section>

          <section className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Last updated: February 2025
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
