import { Network } from 'alchemy-sdk'
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

export const DEFAULT_CHAIN_ID = 8453

export const chains = {
  1: {
    chainObject: mainnet,
    names: ['ethereum', 'mainnet', 'eth'],
    uniswapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    alchemyName: 'eth-mainnet',
  },
  10: {
    chainObject: optimism,
    names: ['optimism', 'op'],
    uniswapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    alchemyName: 'opt-mainnet',
  },
  30: {
    chainObject: rootstock,
    names: ['rootstock'],
    alchemyName: 'rootstock-mainnet',
  },
  56: {
    chainObject: bsc,
    names: ['binance', 'bsc'],
    uniswapRouter: '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
    alchemyName: 'bnb-mainnet',
  },
  100: {
    chainObject: gnosis,
    names: ['gnosis', 'xdai'],
    alchemyName: 'gnosis-mainnet',
  },
  103: {
    chainObject: worldchain,
    names: ['worldchain'],
    uniswapRouter: '0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6',
    alchemyName: 'worldchain-mainnet',
  },
  130: {
    chainObject: unichain,
    names: ['unichain'],
    uniswapRouter: '0x73855d06de49d0fe4a9c42636ba96c62da12ff9c',
    alchemyName: 'unichain-mainnet',
  },
  137: {
    chainObject: polygon,
    names: ['polygon', 'matic'],
    uniswapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    alchemyName: 'polygon-mainnet',
  },
  146: {
    chainObject: sonic,
    names: ['sonic'],
    alchemyName: 'sonic-mainnet',
  },
  204: {
    chainObject: opBNB,
    names: ['opbnb'],
    alchemyName: 'opbnb-mainnet',
  },
  232: {
    chainObject: lens,
    names: ['lens'],
    alchemyName: 'lens-mainnet',
  },
  250: {
    chainObject: fantom,
    names: ['fantom', 'ftm'],
    alchemyName: 'fantom-mainnet',
  },
  324: {
    chainObject: zksync,
    names: ['zksync'],
    uniswapRouter: '0x99c56385daBCE3E81d8499d0b8d0257aBC07E8A3',
    alchemyName: 'zksync-mainnet',
  },
  360: {
    chainObject: shape,
    names: ['shape'],
    alchemyName: 'shape-mainnet',
  },
  592: {
    chainObject: astar,
    names: ['astar'],
    alchemyName: 'astar-mainnet',
  },
  1088: {
    chainObject: metis,
    names: ['metis'],
    alchemyName: 'metis-mainnet',
  },
  1101: {
    chainObject: polygonZkEvm,
    names: ['polygon-zkevm', 'polygonzkevm'],
    alchemyName: 'polygonzkevm-mainnet',
  },
  1329: {
    chainObject: sei,
    names: ['sei'],
    alchemyName: 'sei-mainnet',
  },
  1514: {
    chainObject: story,
    names: ['story'],
    alchemyName: 'story-mainnet',
  },
  1868: {
    chainObject: soneium,
    names: ['soneium'],
    alchemyName: 'soneium-mainnet',
  },
  2020: {
    chainObject: ronin,
    names: ['ronin'],
    alchemyName: 'ronin-mainnet',
  },
  2741: {
    chainObject: abstract,
    names: ['abstract'],
    alchemyName: 'abstract-mainnet',
  },
  5000: {
    chainObject: mantle,
    names: ['mantle'],
    alchemyName: 'mantle-mainnet',
  },
  5330: {
    chainObject: superseed,
    names: ['superseed'],
    alchemyName: 'superseed-mainnet',
  },
  7000: {
    chainObject: zetachain,
    names: ['zetachain'],
    alchemyName: 'zetachain-mainnet',
  },
  8453: {
    chainObject: base,
    names: ['base'],
    uniswapRouter: '0x2626664c2603336E57B271c5C0b26F421741e481',
    alchemyName: 'base-mainnet',
  },
  33139: {
    chainObject: apeChain,
    names: ['apechain'],
    alchemyName: 'apechain-mainnet',
  },
  42161: {
    chainObject: arbitrum,
    names: ['arbitrum', 'arb'],
    uniswapRouter: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    alchemyName: 'arb-mainnet',
  },
  42170: {
    chainObject: arbitrumNova,
    names: ['arbitrum-nova', 'arbitrumnova'],
    alchemyName: 'arbnova-mainnet',
  },
  42220: {
    chainObject: celo,
    names: ['celo'],
    uniswapRouter: '0x5615CDAb10dc425a742d643d949a7F474C01abc4',
    alchemyName: 'celo-mainnet',
  },
  42793: {
    chainObject: ink,
    names: ['ink'],
    alchemyName: 'ink-mainnet',
  },
  43114: {
    chainObject: avalanche,
    names: ['avalanche', 'avax'],
    alchemyName: 'avax-mainnet',
  },
  59144: {
    chainObject: linea,
    names: ['linea'],
    alchemyName: 'linea-mainnet',
  },
  80094: {
    chainObject: berachain,
    names: ['berachain'],
    alchemyName: 'berachain-mainnet',
  },
  81457: {
    chainObject: blast,
    names: ['blast'],
    uniswapRouter: '0x549FEB8c9bd4c12Ad2AB27022dA12492aC452B66',
    alchemyName: 'blast-mainnet',
  },
  534352: {
    chainObject: scroll,
    names: ['scroll'],
    alchemyName: 'scroll-mainnet',
  },
  7777777: {
    chainObject: zora,
    names: ['zora'],
    uniswapRouter: '0x7De04c96BE5159c3b5CeffC82aa176dc81281557',
    alchemyName: 'zora-mainnet',
  },
} as Record<
  number,
  {
    chainObject: Chain
    names: string[]
    uniswapRouter?: string
    alchemyName: Network
  }
>

export function getRpcUrl(chainIdentifier: number = DEFAULT_CHAIN_ID) {
  const alchemyName = chains[chainIdentifier]?.alchemyName
  if (!alchemyName) {
    throw new Error(`No RPC found for chain ID ${chainIdentifier}`)
  }
  return `https://${alchemyName}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
}
