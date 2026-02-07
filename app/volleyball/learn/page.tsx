'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Learning Mode Is Temporarily Disabled</CardTitle>
            <CardDescription>
              Learning mode is commented out for now while we focus on core whiteboard and team workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/volleyball">Back to Whiteboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
