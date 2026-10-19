/**
 * AgentHeader — top bar with wallet connect, agent name, and live chain badge.
 */
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { NetworkArc } from '@web3icons/react'
import { Cpu } from 'lucide-react'

const ARC_TESTNET_ID = 5042002

export default function AgentHeader() {
  const { chainId, isConnected } = useAccount()
  const onArc = isConnected && chainId === ARC_TESTNET_ID

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <Cpu size={18} className="text-bg" />
        </div>
        <div className="leading-tight">
          <span className="font-display text-base font-semibold text-ink tracking-tight">Arc Research Agent</span>
          <p className="text-xs text-muted">ERC-8004 · x402 enabled</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {isConnected && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
            ${onArc ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
          >
            <NetworkArc size={14} />
            {onArc ? 'Arc Testnet' : 'Wrong chain'}
          </div>
        )}
        <ConnectKitButton />
      </div>
    </header>
  )
}
