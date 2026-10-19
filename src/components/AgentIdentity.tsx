/**
 * AgentIdentity — ERC-8004 registration panel
 * Lets the connected wallet register the agent on Arc Testnet's IdentityRegistry.
 */
import { useState } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { parseEventLogs } from 'viem'
import { ExternalLink, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { buildTxExplorerUrl, buildAddressExplorerUrl } from '@/onchain-facts'

// ── ERC-8004 contracts (Arc Testnet) ─────────────────────────────────────────
const ARC_TESTNET_ID = 5042002
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const
const AGENT_CARD_URL = `https://ikpn4jut2k3rz1awu70cr.preview.studio.arc.io/api/agent-card.json`

const identityAbi = [
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'agentURI', type: 'string', indexed: false },
      { name: 'owner', type: 'address', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getAgentWallet',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────
function short(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

interface Props {
  onRegistered: (agentId: bigint) => void
}

export default function AgentIdentity({ onRegistered }: Props) {
  const { chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = isConnected && chainId !== ARC_TESTNET_ID

  const [registeredId, setRegisteredId] = useState<bigint | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash })

  // Parse agentId from receipt logs
  if (isSuccess && receipt && registeredId === null) {
    try {
      const logs = parseEventLogs({ abi: identityAbi, eventName: 'Registered', logs: receipt.logs })
      if (logs.length > 0) {
        const id = logs[0].args.agentId
        setRegisteredId(id)
        onRegistered(id)
      }
    } catch {
      /* logs not yet parsed */
    }
  }

  // Read owner of existing agent if registeredId set
  const { data: ownerAddr } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: identityAbi,
    functionName: 'ownerOf',
    args: registeredId !== null ? [registeredId] : undefined,
    chainId: ARC_TESTNET_ID,
    query: { enabled: registeredId !== null },
  })

  function handleRegister() {
    setTxError(null)
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_ID })
      return
    }
    writeContract(
      {
        address: IDENTITY_REGISTRY,
        abi: identityAbi,
        functionName: 'register',
        args: [AGENT_CARD_URL],
        chainId: ARC_TESTNET_ID,
      },
      {
        onError: (e) => setTxError(e.message.slice(0, 120)),
      },
    )
  }

  const statusLabel = isPending
    ? 'Confirm in wallet…'
    : isConfirming
      ? 'Confirming on-chain…'
      : isSuccess
        ? 'Registered!'
        : isWrongChain
          ? 'Switch to Arc Testnet'
          : 'Register Agent'

  const btnDisabled = isPending || isConfirming || isSuccess

  return (
    <div className="surface rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink tracking-tight">ERC-8004 Identity</h2>
          <p className="text-sm text-muted">Register this agent on Arc Testnet</p>
        </div>
      </div>

      {/* Agent card URL preview */}
      <div className="bg-surface-muted rounded-xl p-4 flex flex-col gap-2">
        <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Agent Card URI</span>
        <a
          href={AGENT_CARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-accent break-all hover:underline flex items-start gap-1"
        >
          {AGENT_CARD_URL}
          <ExternalLink size={11} className="flex-shrink-0 mt-0.5" />
        </a>
      </div>

      {/* Registration result */}
      {isSuccess && registeredId !== null && (
        <div className="flex flex-col gap-3 border border-success/30 bg-success/5 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success flex-shrink-0" />
            <span className="text-sm font-semibold text-success">Agent Registered</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <span className="text-subtle">Agent ID</span>
            <span className="font-mono text-ink tabular-nums">#{registeredId.toString()}</span>
            <span className="text-subtle">Registry</span>
            <a
              href={buildAddressExplorerUrl(ARC_TESTNET_ID, IDENTITY_REGISTRY)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-accent hover:underline truncate flex items-center gap-1"
            >
              {short(IDENTITY_REGISTRY)}
              <ExternalLink size={10} />
            </a>
            {ownerAddr && (
              <>
                <span className="text-subtle">Owner</span>
                <span className="font-mono text-ink">{short(ownerAddr)}</span>
              </>
            )}
            {hash && (
              <>
                <span className="text-subtle">Tx</span>
                <a
                  href={buildTxExplorerUrl(ARC_TESTNET_ID, hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-accent hover:underline flex items-center gap-1"
                >
                  {short(hash)}
                  <ExternalLink size={10} />
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {txError && (
        <div className="flex items-start gap-2 text-danger text-xs bg-danger/5 border border-danger/20 rounded-lg p-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{txError}</span>
        </div>
      )}

      {/* CTA */}
      {!isConnected ? (
        <p className="text-sm text-center text-muted">Connect your wallet to register</p>
      ) : (
        <button
          onClick={handleRegister}
          disabled={btnDisabled}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {(isPending || isConfirming) && <Loader2 size={16} className="animate-spin" />}
          {statusLabel}
        </button>
      )}
    </div>
  )
}
