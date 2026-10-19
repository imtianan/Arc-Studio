/**
 * Onchain Agent Server
 * - Hosts the ERC-8004 agent registration card at /agent-card.json
 * - Exposes a paid x402 endpoint at POST /summarize protected by Circle Gateway Nanopayments
 * - Exposes GET /agent/info for the frontend to read
 */

import express from 'express'
import cors from 'cors'
import { createGatewayMiddleware } from '@circle-fin/x402-batching/server'

const app = express()
app.use(express.json())
app.use(cors())

const PORT = 3001

// ── ERC-8004 registration card ──────────────────────────────────────────────
// Served at /agent-card.json — this is the URI you pass to `register()` on the
// IdentityRegistry. In production, host this on IPFS or your own HTTPS domain.

const AGENT_NAME = 'Arc Research Agent'
const AGENT_DESCRIPTION =
  'Summarizes onchain data on Arc Testnet for a USDC micro-fee via x402. Registered on ERC-8004.'
const AGENT_ENDPOINT = `https://ikpn4jut2k3rz1awu70cr.preview.studio.arc.io/api/summarize`

const agentCard = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: AGENT_NAME,
  description: AGENT_DESCRIPTION,
  services: [
    {
      name: 'Summarize',
      endpoint: AGENT_ENDPOINT,
      version: '1.0.0',
    },
  ],
  x402Support: true,
  active: true,
  // filled in at runtime after registration
  registrations: [] as { agentId: number; agentRegistry: string }[],
  supportedTrust: ['reputation'],
}

app.get('/agent-card.json', (_req, res) => {
  res.json(agentCard)
})

// ── Agent info (for frontend) ───────────────────────────────────────────────
app.get('/agent/info', (_req, res) => {
  res.json({
    name: AGENT_NAME,
    description: AGENT_DESCRIPTION,
    endpoint: AGENT_ENDPOINT,
    agentCardUrl: `https://ikpn4jut2k3rz1awu70cr.preview.studio.arc.io/api/agent-card.json`,
    x402Support: true,
    sellerAddress: process.env.VITE_SELLER_ADDRESS || null,
  })
})

// ── x402 paid endpoint ──────────────────────────────────────────────────────
// Requires $0.01 USDC per call via Circle Gateway Nanopayments.
// If VITE_SELLER_ADDRESS is set, the gateway middleware is active.
// Otherwise the endpoint is open (dev mode).

if (process.env.VITE_SELLER_ADDRESS) {
  const gateway = createGatewayMiddleware({
    sellerAddress: process.env.VITE_SELLER_ADDRESS as `0x${string}`,
  })

  app.post('/summarize', gateway.require('$0.01'), (req, res) => {
    const { topic } = req.body as { topic?: string }
    const safeTopic = typeof topic === 'string' ? topic.slice(0, 200) : 'Arc Testnet'
    res.json({
      paid: true,
      summary: `[PAID] Arc Research Agent: On-chain summary for "${safeTopic}". Arc Testnet uses USDC as the native gas token, enabling gasless USDC micro-payments. This response was gated by x402 and settled via Circle Gateway Nanopayments.`,
    })
  })
} else {
  // Dev fallback — no payment required when VITE_SELLER_ADDRESS is unset
  app.post('/summarize', (req, res) => {
    const { topic } = req.body as { topic?: string }
    const safeTopic = typeof topic === 'string' ? topic.slice(0, 200) : 'Arc Testnet'
    res.json({
      paid: false,
      summary: `[DEV — no seller address configured] Arc Research Agent summary for "${safeTopic}". Set VITE_SELLER_ADDRESS in .env to enable x402 payment gating.`,
    })
  })
}

app.listen(PORT, () => {
  console.log(`Agent server running on http://localhost:${PORT}`)
  console.log(`  Agent card: http://localhost:${PORT}/agent-card.json`)
  console.log(`  Paid endpoint: POST http://localhost:${PORT}/summarize`)
})
