'use client'

import { ArrowLeft } from 'lucide-react'

interface AgentBannerProps {
  clientName: string
  clientReference?: string | null
  dashboardUrl?: string
}

export function AgentBanner({ clientName, clientReference, dashboardUrl }: AgentBannerProps) {
  const practiceUrl = dashboardUrl || process.env.NEXT_PUBLIC_TAXFOLIO_URL || 'https://taxfolio.io'

  return (
    <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">Agent view:</span>
        <span>{clientName}</span>
        {clientReference && (
          <span className="text-emerald-200">({clientReference})</span>
        )}
      </div>
      <a
        href={`${practiceUrl}/practice`}
        className="flex items-center gap-1 text-emerald-100 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </a>
    </div>
  )
}
