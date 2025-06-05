import express from 'express'
import morgan from 'morgan'
import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import startServer from './server.js'

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

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest)

app.listen(3000, () => {
  console.log('MCP HTTP Server running on port 3000')
})
