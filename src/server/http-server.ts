import express from 'express'
import morgan from 'morgan'
import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@big-whale-labs/modelcontextprotocol-sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@big-whale-labs/modelcontextprotocol-sdk/types.js'
import startServer from './server.js'
import { redis } from 'bun'
import { OrderStatus, SDK } from '@1inch/cross-chain-sdk'

const app = express()
app.use(express.json())

// Add morgan logging with custom format including session ID
morgan.token(
  'session-id',
  (req) => (req.headers['mcp-session-id'] as string) || 'none'
)
morgan.token('body', (req) =>
  req.method === 'POST' && 'body' in req ? JSON.stringify(req.body) : ''
)

app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time ms - session: :session-id :body'
  )
)

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  let transport: StreamableHTTPServerTransport

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId]
    console.log(`[Transport] Reusing session: ${sessionId}`)
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    console.log('[Transport] Creating new transport for initialization')
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport
        console.log(`[Transport] Session initialized: ${sessionId}`)
      },
    })

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`[Transport] Session closed: ${transport.sessionId}`)
        delete transports[transport.sessionId]
      }
    }

    // Use the existing server setup from server.js
    const server = await startServer()

    // Connect to the MCP server
    await server.connect(transport)
  } else {
    // Invalid request
    console.log('[Transport] Invalid request - no valid session ID')
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    })
    return
  }

  // Handle the request
  console.log(
    `[Transport] Handling request for session: ${
      transport.sessionId || 'unknown'
    }`
  )
  await transport.handleRequest(req, res, req.body)
})

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  if (!sessionId || !transports[sessionId]) {
    console.log(`[Transport] Invalid session request: ${sessionId}`)
    res.status(400).send('Invalid or missing session ID')
    return
  }

  const transport = transports[sessionId]
  console.log(`[Transport] Handling ${req.method} for session: ${sessionId}`)
  await transport.handleRequest(req, res)
}

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest)

// // Handle DELETE requests for session termination
// app.delete('/mcp', handleSessionRequest)

app.listen(3000, () => {
  console.log('MCP HTTP Server running on port 3000')
})

let checking = false
setInterval(async () => {
  if (checking) return
  checking = true
  try {
    // Check opened orders
    const orderHashKeys = await redis.keys('cross_chain_swap_order:*')
    for (const orderHashKey of orderHashKeys) {
      const unparsedSecrets = await redis.get(orderHashKey)
      if (!unparsedSecrets) continue
      const secrets = JSON.parse(unparsedSecrets) as string[]
      const fusionSdk = new SDK({
        url: 'https://api.1inch.dev/fusion-plus',
        authKey: process.env.ONE_INCH_API_KEY,
      })
      const orderHash = orderHashKey.split(':')[1]
      const orderStatus = await fusionSdk.getOrderStatus(orderHash)
      // Check if order is completed
      if (
        [
          OrderStatus.Cancelled,
          OrderStatus.Executed,
          OrderStatus.Refunded,
        ].includes(orderStatus.status)
      ) {
        await redis.del(orderHashKey)
        console.log(
          `Removed order ${orderHash} with status ${orderStatus.status}`
        )
        continue
      }
      // Check if order is filled
      const fillsObject = await fusionSdk.getReadyToAcceptSecretFills(orderHash)
      for (const fill of fillsObject.fills) {
        try {
          console.log(
            `Submitting secret for order ${orderHash} fill ${
              fill.idx
            } with secret ${secrets[fill.idx]}`
          )
          await fusionSdk.submitSecret(orderHash, secrets[fill.idx])
        } catch (error) {
          console.error(
            `Error submitting secret for order ${orderHash} fill ${fill.idx}:`,
            error
          )
        }
      }
    }
  } catch (error) {
    console.error('Error checking orders:', error)
  } finally {
    checking = false
  }
}, 10_000)
console.log('Started checking orders every 10 seconds')
