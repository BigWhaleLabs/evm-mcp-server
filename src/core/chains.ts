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
  filecoin,
  moonbeam,
  moonriver,
  cronos,
  lumiaMainnet,
  scroll,
  mantle,
  manta,
  blast,
  fraxtal,
  mode,
  metis,
  kroma,
  zora,
  aurora,
  canto,
  flowMainnet,
} from 'viem/chains'

// Default configuration values
export const DEFAULT_RPC_URL = 'https://mainnet.base.org'
export const DEFAULT_CHAIN_ID = 8453

// Map chain IDs to chains
export const chainMap: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  42161: arbitrum,
  42170: arbitrumNova,
  8453: base,
  137: polygon,
  1101: polygonZkEvm,
  43114: avalanche,
  56: bsc,
  324: zksync,
  59144: linea,
  42220: celo,
  100: gnosis,
  250: fantom,
  314: filecoin,
  1284: moonbeam,
  1285: moonriver,
  25: cronos,
  534352: scroll,
  5000: mantle,
  169: manta,
  994873017: lumiaMainnet,
  81457: blast,
  252: fraxtal,
  34443: mode,
  1088: metis,
  255: kroma,
  7777777: zora,
  1313161554: aurora,
  7700: canto,
  747: flowMainnet,
}

// Map network names to chain IDs for easier reference
export const networkNameMap: Record<string, number> = {
  ethereum: 1,
  mainnet: 1,
  eth: 1,
  optimism: 10,
  op: 10,
  arbitrum: 42161,
  arb: 42161,
  'arbitrum-nova': 42170,
  arbitrumnova: 42170,
  base: 8453,
  polygon: 137,
  matic: 137,
  'polygon-zkevm': 1101,
  polygonzkevm: 1101,
  avalanche: 43114,
  avax: 43114,
  binance: 56,
  bsc: 56,
  zksync: 324,
  linea: 59144,
  celo: 42220,
  gnosis: 100,
  xdai: 100,
  fantom: 250,
  ftm: 250,
  filecoin: 314,
  fil: 314,
  moonbeam: 1284,
  moonriver: 1285,
  cronos: 25,
  scroll: 534352,
  mantle: 5000,
  manta: 169,
  lumia: 994873017,
  blast: 81457,
  fraxtal: 252,
  mode: 34443,
  metis: 1088,
  kroma: 255,
  zora: 7777777,
  aurora: 1313161554,
  canto: 7700,
  flow: 747,
}

// Map chain IDs to RPC URLs
export const rpcUrlMap: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  10: 'https://mainnet.optimism.io',
  42161: 'https://arb1.arbitrum.io/rpc',
  42170: 'https://nova.arbitrum.io/rpc',
  8453: 'https://mainnet.base.org',
  137: 'https://polygon-rpc.com',
  1101: 'https://zkevm-rpc.com',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  56: 'https://bsc-dataseed.binance.org',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
  42220: 'https://forno.celo.org',
  100: 'https://rpc.gnosischain.com',
  250: 'https://rpc.ftm.tools',
  314: 'https://api.node.glif.io/rpc/v1',
  1284: 'https://rpc.api.moonbeam.network',
  1285: 'https://rpc.api.moonriver.moonbeam.network',
  25: 'https://evm.cronos.org',
  534352: 'https://rpc.scroll.io',
  5000: 'https://rpc.mantle.xyz',
  169: 'https://pacific-rpc.manta.network/http',
  81457: 'https://rpc.blast.io',
  252: 'https://rpc.frax.com',
  994873017: 'https://mainnet-rpc.lumia.org',
  34443: 'https://mainnet.mode.network',
  1088: 'https://andromeda.metis.io/?owner=1088',
  255: 'https://api.kroma.network',
  7777777: 'https://rpc.zora.energy',
  1313161554: 'https://mainnet.aurora.dev',
  7700: 'https://canto.gravitychain.io',
  747: 'https://mainnet.evm.nodes.onflow.org',
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
