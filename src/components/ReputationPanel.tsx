/**
 * ReputationPanel — ERC-8004 reputation: give feedback on a registered agent,
 * then read its summary score.
 */
import { useState } from 'react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { Star, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { buildTxExplorerUrl } from '@/onchain-facts'

const ARC_TESTNET_ID = 5042002
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const

const repAbi = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getSummary',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddresses', type: 'address[]' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
    ],
    outputs: [
      { name: 'count', type: 'uint64' },
      { name: 'summaryValue', type: 'int128' },
      { name: 'summaryValueDecimals', type: 'uint8' },
    ],
  },
  {
    type: 'function',
    name: 'getClients',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
] as const

interface Props {
  agentId: bigint
}

export default function ReputationPanel({ agentId }: Props) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = isConnected && chainId !== ARC_TESTNET_ID

  const [rating, setRating] = useState(90)
  const [hover, setHover] = useState(0)
  const [txError, setTxError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess && !submitted) setSubmitted(true)

  // Read all clients who gave feedback
  const { data: clients } = useReadContract({
    address: REPUTATION_REGISTRY,
    abi: repAbi,
    functionName: 'getClients',
    args: [agentId],
    chainId: ARC_TESTNET_ID,
  })

  const clientList = clients && clients.length > 0 ? clients : address ? [address] : []

  // Read summary score
  const { data: summary, refetch: refetchSummary } = useReadContract({
    address: REPUTATION_REGISTRY,
    abi: repAbi,
    functionName: 'getSummary',
    args: [agentId, clientList as `0x${string}`[], '', ''],
    chainId: ARC_TESTNET_ID,
    query: { enabled: clientList.length > 0 },
  })

  function handleFeedback() {
    setTxError(null)
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_ID })
      return
    }
    const body = JSON.stringify({ rating, comment: 'submitted via Arc Studio agent app' })
    writeContract(
      {
        address: REPUTATION_REGISTRY,
        abi: repAbi,
        functionName: 'giveFeedback',
        args: [
          agentId,
          BigInt(rating) as unknown as number & bigint,
          0,
          'service-quality',
          '',
          '',
          '',
          keccak256(toBytes(body)),
        ],
        chainId: ARC_TESTNET_ID,
      },
      {
        onSuccess: () => {
          setTimeout(() => void refetchSummary(), 3000)
        },
        onError: (e) => setTxError(e.message.slice(0, 140)),
      },
    )
  }

  const scoreDisplay =
    summary && summary[0] > 0n
      ? `${Number(summary[1])} / 100 (${summary[0].toString()} review${summary[0] === 1n ? '' : 's'})`
      : 'No reviews yet'

  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="surface rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Star size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink tracking-tight">Reputation</h2>
          <p className="text-sm text-muted">Agent #{agentId.toString()} · ERC-8004</p>
        </div>
      </div>

      {/* Score */}
      <div className="bg-surface-muted rounded-xl p-4 flex flex-col gap-1">
        <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Current Score</span>
        <span className="font-display text-2xl font-bold text-ink tabular-nums">{scoreDisplay}</span>
      </div>

      {/* Rating stars */}
      <div className="flex flex-col gap-3">
        <span className="text-sm text-muted">Rate this agent (1–100 scale via stars)</span>
        <div className="flex items-center gap-2">
          {stars.map((s) => {
            const val = s * 20
            return (
              <button
                key={s}
                onMouseEnter={() => setHover(val)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(val)}
                className="focus:outline-none"
                aria-label={`Rate ${val}`}
              >
                <Star
                  size={28}
                  className={`transition-colors ${(hover || rating) >= val ? 'text-yellow-400 fill-yellow-400' : 'text-subtle'}`}
                />
              </button>
            )
          })}
          <span className="text-sm text-muted ml-1 tabular-nums">{rating}/100</span>
        </div>
      </div>

      {/* Success */}
      {isSuccess && (
        <div className="flex items-center gap-2 text-success text-sm">
          <CheckCircle2 size={15} />
          <span>Feedback recorded on-chain</span>
          {hash && (
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_ID, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline text-xs ml-1"
            >
              View tx
            </a>
          )}
        </div>
      )}

      {txError && (
        <div className="flex items-start gap-2 text-danger text-xs bg-danger/5 border border-danger/20 rounded-lg p-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{txError}</span>
        </div>
      )}

      {!isConnected ? (
        <p className="text-sm text-center text-muted">Connect wallet to give feedback</p>
      ) : (
        <button
          onClick={handleFeedback}
          disabled={isPending || isConfirming}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          {(isPending || isConfirming) && <Loader2 size={16} className="animate-spin" />}
          {isPending ? 'Confirm in wallet…' : isConfirming ? 'Confirming…' : 'Submit Feedback'}
        </button>
      )}
    </div>
  )
}
