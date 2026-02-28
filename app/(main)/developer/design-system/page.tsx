import { notFound } from 'next/navigation'

import DevDesignSystemHub from '@/components/dev/DevDesignSystemHub'

export default function DeveloperDesignSystemPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6 pb-32">
        <h1 className="text-xl font-semibold">Design System</h1>
        <DevDesignSystemHub />
      </div>
    </main>
  )
}
