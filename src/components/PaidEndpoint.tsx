/**
 * PaidEndpoint — demonstrates calling the x402-protected /summarize endpoint.
 * In dev (no seller address configured) the backend returns the summary without
 * payment. Once VITE_SELLER_ADDRESS is set the middleware enforces a $0.01 USDC
 * per-call fee via Circle Gateway Nanopayments.
 */
import { useState } from 'react'
import { Zap, Loader2, CheckCircle2, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'

export default function PaidEndpoint() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ paid: boolean; summary: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const curlExample = `curl -X POST https://ikpn4jut2k3rz1awu70cr.preview.studio.arc.io/api/summarize \\
  -H "Content-Type: application/json" \\
  -d '{"topic":"governance proposals"}'`

  async function callEndpoint() {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      if (!res.ok) {
        const text = await res.text()
        if (res.status === 402) {
          setError('Payment required (402). Configure VITE_SELLER_ADDRESS and fund a Circle agent wallet to pay.')
        } else {
          setError(`Server error ${res.status}: ${text.slice(0, 120)}`)
        }
        return
      }
      const data = await res.json() as { paid: boolean; summary: string }
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    void navigator.clipboard.writeText(curlExample).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="surface rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-ink tracking-tight">x402 Paid Endpoint</h2>
          <p className="text-sm text-muted">
            <span className="font-mono text-xs">POST /summarize</span> · $0.01 USDC per call
          </p>
        </div>
      </div>

      {/* Payment badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold">
          <Zap size={11} />
          Circle Gateway Nanopayments
        </span>
        <span className="text-xs text-muted">x402 protected</span>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-subtle uppercase tracking-widest">Topic to summarize</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void callEndpoint() }}
          placeholder="e.g. Arc Testnet governance"
          className="input-field"
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => void callEndpoint()}
        disabled={loading || !topic.trim()}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Calling…' : 'Call Paid Endpoint ($0.01)'}
      </button>

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-2 border border-success/30 bg-success/5 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-success" />
            <span className="text-sm font-semibold text-success">
              {result.paid ? 'Paid response received' : 'Dev response (no payment required)'}
            </span>
          </div>
          <p className="text-sm text-ink leading-relaxed">{result.summary}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-danger text-xs bg-danger/5 border border-danger/20 rounded-lg p-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Curl example */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-subtle uppercase tracking-widest">Agent-to-agent call</span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="font-mono text-xs bg-surface-muted rounded-lg p-3 overflow-x-auto text-ink leading-relaxed whitespace-pre-wrap break-all">
          {curlExample}
        </pre>
        <p className="text-xs text-muted">
          An AI agent can call this endpoint directly with a Circle agent wallet for USDC micro-payments.{' '}
          <a
            href="https://developers.circle.com/gateway/nanopayments"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-0.5"
          >
            x402 docs
            <ExternalLink size={10} />
          </a>
        </p>
      </div>
    </div>
  )
}
