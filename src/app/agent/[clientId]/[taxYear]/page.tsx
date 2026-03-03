'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { WizardProvider } from '@/providers/WizardProvider'
import { WizardContainer } from '@/components/wizard/WizardContainer'
import { AgentBanner } from '@/components/wizard/AgentBanner'
import { createClient } from '@/lib/supabase/client'

interface AgentContext {
  userId: string
  clientId: string
  taxYear: string
  clientName: string
  clientReference: string | null
}

function AgentPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clientId = params.clientId as string
  const taxYear = params.taxYear as string
  const token = searchParams.get('token')

  useEffect(() => {
    async function validateAndSetup() {
      try {
        // If we have a token, validate it server-side
        if (token) {
          const res = await fetch('/api/agent/validate-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, clientId, taxYear }),
          })

          if (!res.ok) {
            const data = await res.json()
            setError(data.error || 'Invalid or expired token')
            setIsLoading(false)
            return
          }

          const data = await res.json()
          setAgentContext({
            userId: data.userId,
            clientId,
            taxYear,
            clientName: data.clientName,
            clientReference: data.clientReference,
          })

          // Clean up the token from the URL (single-use)
          window.history.replaceState({}, '', `/agent/${clientId}/${taxYear}`)
        } else {
          // No token — check if user has an active session and is a practice member
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) {
            setError('Authentication required. Please access this page from your practice dashboard.')
            setIsLoading(false)
            return
          }

          // Verify practice membership and client access via API
          const res = await fetch(`/api/agent/verify-access?clientId=${clientId}&taxYear=${taxYear}`)
          if (!res.ok) {
            const data = await res.json()
            setError(data.error || 'Access denied')
            setIsLoading(false)
            return
          }

          const data = await res.json()
          setAgentContext({
            userId: user.id,
            clientId,
            taxYear,
            clientName: data.clientName,
            clientReference: data.clientReference,
          })
        }
      } catch (err) {
        setError('Failed to validate access')
        console.error('[AgentPage] Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    validateAndSetup()
  }, [clientId, taxYear, token])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e3ec]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg text-red-500">{error}</p>
          <a
            href={process.env.NEXT_PUBLIC_TAXFOLIO_URL || 'https://taxfolio.io'}
            className="text-sm text-blue-500 hover:underline"
          >
            Return to dashboard
          </a>
        </div>
      </div>
    )
  }

  if (!agentContext) return null

  return (
    <div className="flex flex-col min-h-screen">
      <AgentBanner
        clientName={agentContext.clientName}
        clientReference={agentContext.clientReference}
      />
      <div className="flex-1">
        <WizardProvider
          userId={agentContext.userId}
          initialTaxYear={agentContext.taxYear}
          clientId={agentContext.clientId}
        >
          <WizardContainer />
        </WizardProvider>
      </div>
    </div>
  )
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e3ec]"></div>
        </div>
      }
    >
      <AgentPageContent />
    </Suspense>
  )
}
