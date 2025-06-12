import { createPublicClient, http, type PublicClient } from 'viem'
import { getChain, getRpcUrl } from '../chains.js'

// Cache for clients to avoid recreating them for each request
const clientCache = new Map<string, PublicClient>()

/**
 * Get a public client for a specific network
 */
export function getPublicClient(network = 'base'): PublicClient {
  const cacheKey = String(network)

  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }

  // Create a new client
  const chain = getChain(network)
  const rpcUrl = getRpcUrl(network)

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  // Cache the client
  clientCache.set(cacheKey, client)

  return client
}

export function getPublicClientForChainId(network: number): PublicClient {
  const cacheKey = String(network)

  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }

  // Create a new client
  const chain = getChain(network)
  const rpcUrl = getRpcUrl(network)

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  // Cache the client
  clientCache.set(cacheKey, client)

  return client
}
