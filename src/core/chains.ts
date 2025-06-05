import { type Chain } from 'viem'
import {
  mainnet,
  optimism,
  arbitrum,
  arbitrumNova,
  base,
  polygon,
  polygonZkEvm,
  avalanche,
  bsc,
  zksync,
  linea,
  celo,
  gnosis,
  fantom,
  scroll,
  mantle,
  blast,
  metis,
  zora,
  worldchain,
  shape,
  astar,
  zetachain,
  berachain,
  ronin,
  rootstock,
  story,
  lens,
  ink,
  unichain,
  superseed,
  apeChain,
  sonic,
  sei,
  opBNB,
  abstract,
  soneium,
} from 'viem/chains'

// Default configuration values
export const DEFAULT_RPC_URL =
  'https://base-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY
export const DEFAULT_CHAIN_ID = 8453

// Map chain IDs to chains
export const chainMap: Record<number, Chain> = {
  1: mainnet,
  103: worldchain,
  360: shape,
  324: zksync,
  10: optimism,
  137: polygon,
  42161: arbitrum,
  42170: arbitrumNova,
  592: astar,
  1101: polygonZkEvm,
  7000: zetachain,
  250: fantom,
  5000: mantle,
  80094: berachain,
  81457: blast,
  59144: linea,
  7777777: zora,
  2020: ronin,
  30: rootstock,
  1514: story,
  8453: base,
  232: lens,
  42793: ink,
  43114: avalanche,
  100: gnosis,
  56: bsc,
  130: unichain,
  5330: superseed,
  33139: apeChain,
  42220: celo,
  1088: metis,
  146: sonic,
  1329: sei,
  534352: scroll,
  204: opBNB,
  2741: abstract,
  1868: soneium,
}

// Map network names to chain IDs for easier reference
export const networkNameMap: Record<string, number> = {
  ethereum: 1,
  mainnet: 1,
  eth: 1,
  worldchain: 103,
  shape: 360,
  zksync: 324,
  optimism: 10,
  op: 10,
  polygon: 137,
  matic: 137,
  arbitrum: 42161,
  arb: 42161,
  'arbitrum-nova': 42170,
  arbitrumnova: 42170,
  astar: 592,
  'polygon-zkevm': 1101,
  polygonzkevm: 1101,
  zetachain: 7000,
  fantom: 250,
  ftm: 250,
  mantle: 5000,
  berachain: 80094,
  blast: 81457,
  linea: 59144,
  zora: 7777777,
  ronin: 2020,
  rootstock: 30,
  story: 1514,
  base: 8453,
  lens: 232,
  ink: 42793,
  avalanche: 43114,
  avax: 43114,
  gnosis: 100,
  xdai: 100,
  binance: 56,
  bsc: 56,
  unichain: 130,
  superseed: 5330,
  apechain: 33139,
  celo: 42220,
  metis: 1088,
  sonic: 146,
  sei: 1329,
  scroll: 534352,
  opbnb: 204,
  abstract: 2741,
  soneium: 1868,
}

// Map chain IDs to RPC URLs
export const rpcUrlMap: Record<number, string> = {
  1: 'https://eth-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  103:
    'https://worldchain-mainnet.g.alchemy.com/v2/' +
    process.env.ALCHEMY_API_KEY,
  360: 'https://shape-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  324: 'https://zksync-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  10: 'https://opt-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  137:
    'https://polygon-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  42161: 'https://arb-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  42170:
    'https://arbnova-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  592: 'https://astar-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  1101:
    'https://polygonzkevm-mainnet.g.alchemy.com/v2/' +
    process.env.ALCHEMY_API_KEY,
  7000:
    'https://zetachain-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  250: 'https://fantom-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  5000:
    'https://mantle-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  80094:
    'https://berachain-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  81457:
    'https://blast-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  59144:
    'https://linea-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  7777777:
    'https://zora-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  2020: 'https://ronin-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  30:
    'https://rootstock-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  1514: 'https://story-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  8453: 'https://base-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  232: 'https://lens-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  42793: 'https://ink-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  43114: 'https://avax-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  100: 'https://gnosis-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  56: 'https://bnb-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  130:
    'https://unichain-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  5330:
    'https://superseed-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  33139:
    'https://apechain-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  42220: 'https://celo-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  1088: 'https://metis-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  146: 'https://sonic-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  1329: 'https://sei-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  534352:
    'https://scroll-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  204: 'https://opbnb-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  2741:
    'https://abstract-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
  1868:
    'https://soneium-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY,
}

/**
 * Resolves a chain identifier (number or string) to a chain ID
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The resolved chain ID
 */
export function resolveChainId(chainIdentifier: number | string): number {
  if (typeof chainIdentifier === 'number') {
    return chainIdentifier
  }

  // Convert to lowercase for case-insensitive matching
  const networkName = chainIdentifier.toLowerCase()

  // Check if the network name is in our map
  if (networkName in networkNameMap) {
    return networkNameMap[networkName]
  }

  // Try parsing as a number
  const parsedId = parseInt(networkName)
  if (!isNaN(parsedId)) {
    return parsedId
  }

  // Default to mainnet if not found
  return DEFAULT_CHAIN_ID
}

/**
 * Returns the chain configuration for the specified chain ID or network name
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The chain configuration
 * @throws Error if the network is not supported (when string is provided)
 */
export function getChain(
  chainIdentifier: number | string = DEFAULT_CHAIN_ID
): Chain {
  if (typeof chainIdentifier === 'string') {
    const networkName = chainIdentifier.toLowerCase()
    // Try to get from direct network name mapping first
    if (networkNameMap[networkName]) {
      return chainMap[networkNameMap[networkName]] || mainnet
    }

    // If not found, throw an error
    throw new Error(`Unsupported network: ${chainIdentifier}`)
  }

  // If it's a number, return the chain from chainMap
  return chainMap[chainIdentifier] || mainnet
}

/**
 * Gets the appropriate RPC URL for the specified chain ID or network name
 * @param chainIdentifier Chain ID (number) or network name (string)
 * @returns The RPC URL for the specified chain
 */
export function getRpcUrl(
  chainIdentifier: number | string = DEFAULT_CHAIN_ID
): string {
  const chainId =
    typeof chainIdentifier === 'string'
      ? resolveChainId(chainIdentifier)
      : chainIdentifier

  return rpcUrlMap[chainId] || DEFAULT_RPC_URL
}

/**
 * Get a list of supported networks
 * @returns Array of supported network names (excluding short aliases)
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(networkNameMap)
    .filter((name) => name.length > 2) // Filter out short aliases
    .sort()
}
