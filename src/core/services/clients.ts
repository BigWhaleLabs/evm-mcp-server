import { createPublicClient, http, type PublicClient } from 'viem'
import { chains, DEFAULT_CHAIN_ID, getRpcUrl } from '../chains.js'

const clientCache = new Map<string, PublicClient>()

export function getPublicClient(network = DEFAULT_CHAIN_ID): PublicClient {
  const cacheKey = String(network)
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }
  const chain = chains[network].chainObject
  const rpcUrl = getRpcUrl(network)
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
  clientCache.set(cacheKey, client)
  return client
}
