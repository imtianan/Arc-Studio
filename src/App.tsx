import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import AgentHeader from './components/AgentHeader'
import AgentIdentity from './components/AgentIdentity'
import ReputationPanel from './components/ReputationPanel'
import PaidEndpoint from './components/PaidEndpoint'

export default function App() {
  const { isConnected } = useAccount()
  const [agentId, setAgentId] = useState<bigint | null>(null)

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      <AgentHeader />

      <main className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Hero */}
        <div className="text-center flex flex-col gap-2 pb-2">
          <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
            Onchain Agent
          </h1>
          <p className="text-sm text-muted max-w-sm mx-auto text-pretty">
            Register this agent's identity on Arc with ERC-8004, build its reputation, then call its
            x402-payable API endpoint.
          </p>
          {!isConnected && (
            <div className="flex justify-center mt-3">
              <ConnectKitButton label="Connect wallet to start" />
            </div>
          )}
        </div>

        {/* Step 1: Register */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-subtle uppercase tracking-widest px-1">Step 1 · Identity</span>
          <AgentIdentity onRegistered={setAgentId} />
        </div>

        {/* Step 2: Reputation (only after registration) */}
        {agentId !== null && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-subtle uppercase tracking-widest px-1">Step 2 · Reputation</span>
            <ReputationPanel agentId={agentId} />
          </div>
        )}

        {/* Step 3: Paid endpoint (always visible) */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-subtle uppercase tracking-widest px-1">Step 3 · x402 Payments</span>
          <PaidEndpoint />
        </div>
      </main>
    </div>
  )
}
