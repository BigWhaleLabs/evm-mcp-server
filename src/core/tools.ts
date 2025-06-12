import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import {
  getSupportedNetworks,
  networkNameMap,
  networkUniswapRouterMap,
  rpcUrlMap,
} from './chains.js'
import * as services from './services/index.js'
import { type Address, type Hash, encodeFunctionData, erc20Abi } from 'viem'
import { normalize } from 'viem/ens'
import {
  ChainId,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
  AlphaRouter,
  INTENT,
  SwapType,
  V3Route,
} from '@uniswap/smart-order-router'
import { Protocol } from '@uniswap/router-sdk'
import { encodeRouteToPath } from '@uniswap/v3-sdk'
import uniswapRouterAbi from './uniswapRouterAbi.js'
import { RequestHandlerExtra } from '@big-whale-labs/modelcontextprotocol-sdk/shared/protocol.js'
import {
  ServerNotification,
  ServerRequest,
} from '@big-whale-labs/modelcontextprotocol-sdk/types.js'
// import {
//   BlockchainProviderConnector,
//   SDK,
//   EIP712TypedData,
//   HashLock,
// } from '@1inch/cross-chain-sdk'
// import { randomBytes, solidityPackedKeccak256 } from 'ethers'
// import {
//   LimitOrder,
//   MakerTraits,
//   Sdk,
//   randBigInt,
//   Address as Address1Inch,
//   HttpProviderConnector,
//   Headers,
//   AuthError,
// } from '@1inch/limit-order-sdk'

// export class FetchProviderConnector implements HttpProviderConnector {
//   async get<T>(url: string, headers: Headers): Promise<T> {
//     const res = await fetch(url, { headers, method: 'GET' })

//     if (res.status === 401) {
//       throw new AuthError()
//     }

//     if (res.ok) {
//       return res.json() as Promise<T>
//     }

//     throw new Error(
//       `Request failed with status ${res.status}: ${await res.text()}`
//     )
//   }

//   async post<T>(url: string, data: unknown, headers: Headers): Promise<T> {
//     const res = await fetch(url, {
//       headers: {
//         ...headers,
//         'Content-Type': 'application/json',
//       },
//       method: 'POST',
//       body: JSON.stringify(data),
//     })

//     if (res.status === 401) {
//       throw new AuthError()
//     }

//     if (res.ok) {
//       return res.json() as Promise<T>
//     }

//     throw new Error(
//       `Request failed with status ${res.status}: ${await res.text()}`
//     )
//   }
// }

// eslint-disable-next-line @typescript-eslint/no-redeclare
function bigintReplacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString()
  } else {
    return value
  }
}

function extractPrivyHeaders(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): {
  privyAppId: string
  privyAppSecret: string
  privyAuthorizationPrivateKey: string
  privyWalletId: string
} {
  const headers = extra.requestHeaders
  return {
    privyAppId: headers['x-privy-app-id'],
    privyAppSecret: headers['x-privy-app-secret'],
    privyAuthorizationPrivateKey: headers['x-privy-authorization-private-key'],
    privyWalletId: headers['x-privy-wallet-id'],
  } as {
    privyAppId: string
    privyAppSecret: string
    privyAuthorizationPrivateKey: string
    privyWalletId: string
  }
}

/**
 * Register all EVM-related tools with the MCP server
 *
 * All tools that accept Ethereum addresses also support ENS names (e.g., 'vitalik.eth').
 * ENS names are automatically resolved to addresses using the Ethereum Name Service.
 *
 * @param server The MCP server instance
 */
export function registerEVMTools(server: McpServer) {
  // NETWORK INFORMATION TOOLS

  // Get chain information
  server.tool(
    'get_chain_info',
    'Get information about an EVM network',
    {
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ network = 'base' }) => {
      try {
        const chainId = await services.getChainId(network)
        const blockNumber = await services.getBlockNumber(network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  network,
                  chainId,
                  blockNumber: blockNumber.toString(),
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching chain info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // ENS LOOKUP TOOL

  // Resolve ENS name to address
  server.tool(
    'resolve_ens',
    'Resolve an ENS name to an Ethereum address',
    {
      ensName: z.string().describe("ENS name to resolve (e.g., 'vitalik.eth')"),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. ENS resolution works best on Ethereum mainnet. Defaults to Ethereum mainnet."
        ),
    },
    async ({ ensName, network = 'ethereum' }) => {
      try {
        // Validate that the input is an ENS name
        if (!ensName.includes('.')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: Input "${ensName}" is not a valid ENS name. ENS names must contain a dot (e.g., 'name.eth').`,
              },
            ],
            isError: true,
          }
        }

        // Normalize the ENS name
        const normalizedEns = normalize(ensName)

        // Resolve the ENS name to an address
        const address = await services.resolveAddress(ensName, network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ensName: ensName,
                  normalizedName: normalizedEns,
                  resolvedAddress: address,
                  network,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error resolving ENS name: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get supported networks
  server.tool(
    'get_supported_networks',
    'Get a list of supported EVM networks',
    {},
    async () => {
      try {
        const networks = getSupportedNetworks()

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  supportedNetworks: networks,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching supported networks: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // BLOCK TOOLS

  // Get block by number
  server.tool(
    'get_block_by_number',
    'Get a block by its block number',
    {
      blockNumber: z.number().describe('The block number to fetch'),
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ blockNumber, network = 'base' }) => {
      try {
        const block = await services.getBlockByNumber(blockNumber, network)

        return {
          content: [
            {
              type: 'text',
              text: services.helpers.formatJson(block),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching block ${blockNumber}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get latest block
  server.tool(
    'get_latest_block',
    'Get the latest block from the EVM',
    {
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ network = 'base' }) => {
      try {
        const block = await services.getLatestBlock(network)

        return {
          content: [
            {
              type: 'text',
              text: services.helpers.formatJson(block),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching latest block: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // BALANCE TOOLS

  // Get ETH balance
  server.tool(
    'get_balance',
    'Get the native token balance (ETH, MATIC, etc.) for an address',
    {
      address: z
        .string()
        .describe(
          "The wallet address or ENS name (e.g., '0x1234...' or 'vitalik.eth') to check the balance for"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ address, network = 'base' }) => {
      try {
        const balance = await services.getETHBalance(address, network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  network,
                  wei: balance.wei.toString(),
                  ether: balance.ether,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get ERC20 balance
  server.tool(
    'get_erc20_balance',
    'Get the ERC20 token balance of an Ethereum address',
    {
      address: z.string().describe('The Ethereum address to check'),
      tokenAddress: z.string().describe('The ERC20 token contract address'),
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ address, tokenAddress, network = 'base' }) => {
      try {
        const balance = await services.getERC20Balance(
          tokenAddress as Address,
          address as Address,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  tokenAddress,
                  network,
                  balance: {
                    raw: balance.raw.toString(),
                    formatted: balance.formatted,
                    decimals: balance.token.decimals,
                  },
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching ERC20 balance for ${address}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get ERC20 token balance
  server.tool(
    'get_token_balance',
    'Get the balance of an ERC20 token for an address',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address or ENS name of the ERC20 token (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' for USDC or 'uniswap.eth')"
        ),
      address: z
        .string()
        .describe(
          "The wallet address or ENS name to check the balance for (e.g., '0x1234...' or 'vitalik.eth')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, address: ownerAddress, network = 'base' }) => {
      try {
        const balance = await services.getERC20Balance(
          tokenAddress,
          ownerAddress,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tokenAddress,
                  owner: ownerAddress,
                  network,
                  raw: balance.raw.toString(),
                  formatted: balance.formatted,
                  symbol: balance.token.symbol,
                  decimals: balance.token.decimals,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching token balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // TRANSACTION TOOLS

  // Get transaction by hash
  server.tool(
    'get_transaction',
    'Get detailed information about a specific transaction by its hash. Includes sender, recipient, value, data, and more.',
    {
      txHash: z
        .string()
        .describe("The transaction hash to look up (e.g., '0x1234...')"),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Defaults to Ethereum mainnet."
        ),
    },
    async ({ txHash, network = 'base' }) => {
      try {
        const tx = await services.getTransaction(txHash as Hash, network)

        return {
          content: [
            {
              type: 'text',
              text: services.helpers.formatJson(tx),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching transaction ${txHash}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get transaction receipt
  server.tool(
    'get_transaction_receipt',
    'Get a transaction receipt by its hash',
    {
      txHash: z.string().describe('The transaction hash to look up'),
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ txHash, network = 'base' }) => {
      try {
        const receipt = await services.getTransactionReceipt(
          txHash as Hash,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: services.helpers.formatJson(receipt),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching transaction receipt ${txHash}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Estimate gas
  server.tool(
    'estimate_gas',
    'Estimate the gas cost for a transaction',
    {
      to: z.string().describe('The recipient address'),
      value: z
        .string()
        .optional()
        .describe("The amount of ETH to send in ether (e.g., '0.1')"),
      data: z
        .string()
        .optional()
        .describe('The transaction data as a hex string'),
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ to, value, data, network = 'base' }) => {
      try {
        const params: any = { to: to as Address }

        if (value) {
          params.value = services.helpers.parseEther(value)
        }

        if (data) {
          params.data = data as `0x${string}`
        }

        const gas = await services.estimateGas(params, network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  network,
                  estimatedGas: gas.toString(),
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error estimating gas: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // TRANSFER TOOLS

  // Transfer ETH
  server.tool(
    'transfer_eth',
    'Transfer native tokens (ETH, MATIC, etc.) to an address',
    {
      to: z
        .string()
        .describe(
          "The recipient address or ENS name (e.g., '0x1234...' or 'vitalik.eth')"
        ),
      amount: z
        .string()
        .describe(
          "Amount to send in ETH (or the native token of the network), as a string (e.g., '0.1')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Base mainnet."
        ),
    },
    async ({ to, amount, network = 'base' }, extra) => {
      const {
        privyAppId,
        privyAppSecret,
        privyAuthorizationPrivateKey,
        privyWalletId,
      } = extractPrivyHeaders(extra)
      try {
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const txHash = await services.transferETH(
          to,
          amount,
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  to,
                  amount,
                  network,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring ETH: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Transfer ERC20
  server.tool(
    'transfer_erc20',
    'Transfer ERC20 tokens to another address',
    {
      tokenAddress: z
        .string()
        .describe('The address of the ERC20 token contract'),
      toAddress: z.string().describe('The recipient address'),
      amount: z
        .string()
        .describe(
          "The amount of tokens to send (in token units, e.g., '10' for 10 tokens)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Base mainnet."
        ),
    },
    async ({ tokenAddress, toAddress, amount, network = 'base' }, extra) => {
      const {
        privyAppId,
        privyAppSecret,
        privyAuthorizationPrivateKey,
        privyWalletId,
      } = extractPrivyHeaders(extra)
      try {
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )

        const result = await services.transferERC20(
          tokenAddress as Address,
          toAddress as Address,
          amount,
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: result.txHash,
                  network,
                  tokenAddress,
                  recipient: toAddress,
                  amount: result.amount.formatted,
                  symbol: result.token.symbol,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring ERC20 tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Approve ERC20 token spending
  server.tool(
    'approve_token_spending',
    'Approve another address (like a DeFi protocol or exchange) to spend your ERC20 tokens. This is often required before interacting with DeFi protocols.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the ERC20 token to approve for spending (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' for USDC on Ethereum)"
        ),
      spenderAddress: z
        .string()
        .describe(
          'The contract address being approved to spend your tokens (e.g., a DEX or lending protocol)'
        ),
      amount: z
        .string()
        .describe(
          "The amount of tokens to approve in token units, not wei (e.g., '1000' to approve spending 1000 tokens). Use a very large number for unlimited approval."
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Defaults to Base mainnet."
        ),
    },
    async (
      { tokenAddress, spenderAddress, amount, network = 'base' },
      extra
    ) => {
      const {
        privyAppId,
        privyAppSecret,
        privyAuthorizationPrivateKey,
        privyWalletId,
      } = extractPrivyHeaders(extra)
      try {
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )

        const result = await services.approveERC20(
          tokenAddress as Address,
          spenderAddress as Address,
          amount,
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: result.txHash,
                  network,
                  tokenAddress,
                  spender: spenderAddress,
                  amount: result.amount.formatted,
                  symbol: result.token.symbol,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error approving token spending: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Transfer NFT (ERC721)
  server.tool(
    'transfer_nft',
    'Transfer an NFT (ERC721 token) from one address to another. Requires the private key of the current owner for signing the transaction.',
    {
      fromAddress: z
        .string()
        .describe(
          "The current owner's wallet address that holds the NFT (e.g., '0x1234...')"
        ),
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' for Bored Ape Yacht Club)"
        ),
      tokenId: z
        .string()
        .describe("The ID of the specific NFT to transfer (e.g., '1234')"),
      toAddress: z
        .string()
        .describe('The recipient wallet address that will receive the NFT'),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Most NFTs are on Ethereum mainnet, which is the default."
        ),
    },
    async (
      { fromAddress, tokenAddress, tokenId, toAddress, network = 'base' },
      extra
    ) => {
      const {
        privyAppId,
        privyAppSecret,
        privyAuthorizationPrivateKey,
        privyWalletId,
      } = extractPrivyHeaders(extra)
      try {
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )

        const result = await services.transferERC721(
          fromAddress as Address,
          tokenAddress as Address,
          toAddress as Address,
          BigInt(tokenId),
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: result.txHash,
                  network,
                  collection: tokenAddress,
                  tokenId: result.tokenId,
                  recipient: toAddress,
                  name: result.token.name,
                  symbol: result.token.symbol,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring NFT: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Transfer ERC1155 token
  server.tool(
    'transfer_erc1155',
    'Transfer ERC1155 tokens to another address. ERC1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract.',
    {
      fromAddress: z
        .string()
        .describe(
          "The current owner's wallet address that holds the ERC1155 tokens (e.g., '0x1234...')"
        ),
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the ERC1155 token collection (e.g., '0x76BE3b62873462d2142405439777e971754E8E77')"
        ),
      tokenId: z
        .string()
        .describe("The ID of the specific token to transfer (e.g., '1234')"),
      amount: z
        .string()
        .describe(
          "The quantity of tokens to send (e.g., '1' for a single NFT or '10' for 10 fungible tokens)"
        ),
      toAddress: z
        .string()
        .describe('The recipient wallet address that will receive the tokens'),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. ERC1155 tokens exist across many networks. Defaults to Ethereum mainnet."
        ),
    },
    async (
      {
        fromAddress,
        tokenAddress,
        tokenId,
        amount,
        toAddress,
        network = 'base',
      },
      extra
    ) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )

        const result = await services.transferERC1155(
          fromAddress as Address,
          tokenAddress as Address,
          toAddress as Address,
          BigInt(tokenId),
          amount,
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: result.txHash,
                  network,
                  contract: tokenAddress,
                  tokenId: result.tokenId,
                  amount: result.amount,
                  recipient: toAddress,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring ERC1155 tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Transfer ERC20 tokens
  server.tool(
    'transfer_token',
    'Transfer ERC20 tokens to an address',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address or ENS name of the ERC20 token to transfer (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' for USDC or 'uniswap.eth')"
        ),
      toAddress: z
        .string()
        .describe(
          "The recipient address or ENS name that will receive the tokens (e.g., '0x1234...' or 'vitalik.eth')"
        ),
      amount: z
        .string()
        .describe(
          "Amount of tokens to send as a string (e.g., '100' for 100 tokens). This will be adjusted for the token's decimals."
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, toAddress, amount, network = 'base' }, extra) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const result = await services.transferERC20(
          tokenAddress,
          toAddress,
          amount,
          network,
          privyClient,
          privyWalletId
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: result.txHash,
                  tokenAddress,
                  toAddress,
                  amount: result.amount.formatted,
                  symbol: result.token.symbol,
                  network,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // // CONTRACT TOOLS

  // // Read contract
  // server.tool(
  //   'read_contract',
  //   "Read data from a smart contract by calling a view/pure function. This doesn't modify blockchain state and doesn't require gas or signing.",
  //   {
  //     contractAddress: z
  //       .string()
  //       .describe('The address of the smart contract to interact with'),
  //     abi: z
  //       .array(z.any())
  //       .describe(
  //         'The ABI (Application Binary Interface) of the smart contract function, as a JSON array'
  //       ),
  //     functionName: z
  //       .string()
  //       .describe(
  //         "The name of the function to call on the contract (e.g., 'balanceOf')"
  //       ),
  //     args: z
  //       .array(z.any())
  //       .optional()
  //       .describe(
  //         "The arguments to pass to the function, as an array (e.g., ['0x1234...'])"
  //       ),
  //     network: z
  //       .string()
  //       .optional()
  //       .describe(
  //         "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Defaults to Ethereum mainnet."
  //       ),
  //   },
  //   async ({
  //     contractAddress,
  //     abi,
  //     functionName,
  //     args = [],
  //     network = 'base',
  //   }) => {
  //     try {
  //       // Parse ABI if it's a string
  //       const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi

  //       const params = {
  //         address: contractAddress as Address,
  //         abi: parsedAbi,
  //         functionName,
  //         args,
  //       }

  //       const result = await services.readContract(params, network)

  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: services.helpers.formatJson(result),
  //           },
  //         ],
  //       }
  //     } catch (error) {
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Error reading contract: ${
  //               error instanceof Error ? error.message : String(error)
  //             }`,
  //           },
  //         ],
  //         isError: true,
  //       }
  //     }
  //   }
  // )

  // // Write to contract
  // server.tool(
  //   'write_contract',
  //   'Write data to a smart contract by calling a state-changing function. This modifies blockchain state and requires gas payment and transaction signing.',
  //   {
  //     contractAddress: z
  //       .string()
  //       .describe('The address of the smart contract to interact with'),
  //     abi: z
  //       .array(z.any())
  //       .describe(
  //         'The ABI (Application Binary Interface) of the smart contract function, as a JSON array'
  //       ),
  //     functionName: z
  //       .string()
  //       .describe(
  //         "The name of the function to call on the contract (e.g., 'transfer')"
  //       ),
  //     args: z
  //       .array(z.any())
  //       .describe(
  //         "The arguments to pass to the function, as an array (e.g., ['0x1234...', '1000000000000000000'])"
  //       ),
  //     network: z
  //       .string()
  //       .optional()
  //       .describe(
  //         "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Defaults to Base mainnet."
  //       ),
  //   },
  //   async ({
  //     contractAddress,
  //     abi,
  //     functionName,
  //     args,
  //     network = 'base',
  //   }) => {
  //     try {
  //       // Parse ABI if it's a string
  //       const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi

  //       const contractParams = {
  //         to: contractAddress as Address,
  //         data: encodeFunctionData({
  //           abi: parsedAbi,
  //           functionName,
  //           args,
  //         }),
  //         chainId: networkNameMap[network],
  //       }

  //       const privyClient = services.getPrivyClient(
  //         privyAppId,
  //         privyAppSecret,
  //         privyAuthorizationPrivateKey
  //       )

  //       const txHash = await services.writeContract(
  //         contractParams,
  //         network,
  //         privyClient,
  //         privyWalletId
  //       )

  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: JSON.stringify(
  //               {
  //                 network,
  //                 transactionHash: txHash,
  //                 message: 'Contract write transaction sent successfully',
  //               },
  //               bigintReplacer,
  //               2
  //             ),
  //           },
  //         ],
  //       }
  //     } catch (error) {
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Error writing to contract: ${
  //               error instanceof Error ? error.message : String(error)
  //             }`,
  //           },
  //         ],
  //         isError: true,
  //       }
  //     }
  //   }
  // )

  // Wrap ETH
  server.tool(
    'wrap_eth',
    'Wrap ETH into WETH (Wrapped Ether) on EVM-compatible networks',
    {
      amount: z
        .string()
        .describe(
          "Amount of ETH to wrap, as a bigint string (e.g., '1000000000000000000' for 1 ETH)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
        ),
      wethAddress: z.string().describe('WETH contract address'),
    },
    async ({ amount, network = 'base', wethAddress }, extra) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const txHash = await services.wrapETH(
          amount,
          network,
          privyClient,
          privyWalletId,
          wethAddress as Address
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  amount,
                  network,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error wrapping ETH: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Unwrap WETH to ETH
  server.tool(
    'unwrap_weth',
    'Unwrap WETH (Wrapped Ether) back to ETH on EVM-compatible networks',
    {
      amount: z
        .string()
        .describe(
          "Amount of WETH to unwrap, as a bigint string (e.g., '1000000000000000000' for 1 WETH)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
        ),
      wethAddress: z.string().describe('WETH contract address'),
    },
    async ({ amount, network = 'base', wethAddress }, extra) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const txHash = await services.unwrapWETH(
          amount,
          network,
          privyClient,
          privyWalletId,
          wethAddress as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  amount,
                  network,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error unwrapping WETH: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Check if address is a contract
  server.tool(
    'is_contract',
    'Check if an address is a smart contract or an externally owned account (EOA)',
    {
      address: z
        .string()
        .describe(
          "The wallet or contract address or ENS name to check (e.g., '0x1234...' or 'uniswap.eth')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ address, network = 'base' }) => {
      try {
        const isContract = await services.isContract(address, network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  network,
                  isContract,
                  type: isContract
                    ? 'Contract'
                    : 'Externally Owned Account (EOA)',
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking if address is a contract: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get ERC20 token information
  server.tool(
    'get_token_info',
    'Get comprehensive information about an ERC20 token including name, symbol, decimals, total supply, and other metadata. Use this to analyze any token on EVM chains.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the ERC20 token (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' for USDC on Ethereum)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, network = 'base' }) => {
      try {
        const tokenInfo = await services.getERC20TokenInfo(
          tokenAddress as Address,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address: tokenAddress,
                  network,
                  ...tokenInfo,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching token info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get ERC20 token balance
  server.tool(
    'get_token_balance_erc20',
    'Get ERC20 token balance for an address',
    {
      address: z.string().describe('The address to check balance for'),
      tokenAddress: z.string().describe('The ERC20 token contract address'),
      network: z
        .string()
        .optional()
        .describe('Network name or chain ID. Defaults to Ethereum mainnet.'),
    },
    async ({ address, tokenAddress, network = 'base' }) => {
      console.log(
        `Fetching ERC20 balance for address: ${address}, token: ${tokenAddress}, network: ${network}`
      )
      try {
        const balance = await services.getERC20Balance(
          tokenAddress as Address,
          address as Address,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  address,
                  tokenAddress,
                  network,
                  balance: {
                    raw: balance.raw.toString(),
                    formatted: balance.formatted,
                    decimals: balance.token.decimals,
                  },
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching ERC20 balance for ${address}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Get NFT (ERC721) information
  server.tool(
    'get_nft_info',
    'Get detailed information about a specific NFT (ERC721 token), including collection name, symbol, token URI, and current owner if available.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' for Bored Ape Yacht Club)"
        ),
      tokenId: z
        .string()
        .describe("The ID of the specific NFT token to query (e.g., '1234')"),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Most NFTs are on Ethereum mainnet, which is the default."
        ),
    },
    async ({ tokenAddress, tokenId, network = 'base' }) => {
      try {
        const nftInfo = await services.getERC721TokenMetadata(
          tokenAddress as Address,
          BigInt(tokenId),
          network
        )

        // Check ownership separately
        let owner = null
        try {
          // This may fail if tokenId doesn't exist
          owner = await services.getPublicClient(network).readContract({
            address: tokenAddress as Address,
            abi: [
              {
                inputs: [{ type: 'uint256' }],
                name: 'ownerOf',
                outputs: [{ type: 'address' }],
                stateMutability: 'view',
                type: 'function',
              },
            ],
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          })
        } catch (e) {
          // Ownership info not available
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  contract: tokenAddress,
                  tokenId,
                  network,
                  ...nftInfo,
                  owner: owner || 'Unknown',
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching NFT info: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Check NFT ownership
  server.tool(
    'check_nft_ownership',
    'Check if an address owns a specific NFT',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address or ENS name of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' for BAYC or 'boredapeyachtclub.eth')"
        ),
      tokenId: z.string().describe("The ID of the NFT to check (e.g., '1234')"),
      ownerAddress: z
        .string()
        .describe(
          "The wallet address or ENS name to check ownership against (e.g., '0x1234...' or 'vitalik.eth')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, tokenId, ownerAddress, network = 'base' }) => {
      try {
        const isOwner = await services.isNFTOwner(
          tokenAddress,
          ownerAddress,
          BigInt(tokenId),
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tokenAddress,
                  tokenId,
                  ownerAddress,
                  network,
                  isOwner,
                  result: isOwner
                    ? 'Address owns this NFT'
                    : 'Address does not own this NFT',
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking NFT ownership: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Add tool for getting ERC1155 token URI
  server.tool(
    'get_erc1155_token_uri',
    'Get the metadata URI for an ERC1155 token (multi-token standard used for both fungible and non-fungible tokens). The URI typically points to JSON metadata about the token.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the ERC1155 token collection (e.g., '0x76BE3b62873462d2142405439777e971754E8E77')"
        ),
      tokenId: z
        .string()
        .describe(
          "The ID of the specific token to query metadata for (e.g., '1234')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. ERC1155 tokens exist across many networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, tokenId, network = 'base' }) => {
      try {
        const uri = await services.getERC1155TokenURI(
          tokenAddress as Address,
          BigInt(tokenId),
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  contract: tokenAddress,
                  tokenId,
                  network,
                  uri,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching ERC1155 token URI: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Add tool for getting ERC721 NFT balance
  server.tool(
    'get_nft_balance',
    'Get the total number of NFTs owned by an address from a specific collection. This returns the count of NFTs, not individual token IDs.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' for Bored Ape Yacht Club)"
        ),
      ownerAddress: z
        .string()
        .describe(
          "The wallet address to check the NFT balance for (e.g., '0x1234...')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. Most NFTs are on Ethereum mainnet, which is the default."
        ),
    },
    async ({ tokenAddress, ownerAddress, network = 'base' }) => {
      try {
        const balance = await services.getERC721Balance(
          tokenAddress as Address,
          ownerAddress as Address,
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  collection: tokenAddress,
                  owner: ownerAddress,
                  network,
                  balance: balance.toString(),
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching NFT balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Add tool for getting ERC1155 token balance
  server.tool(
    'get_erc1155_balance',
    'Get the balance of a specific ERC1155 token ID owned by an address. ERC1155 allows multiple tokens of the same ID, so the balance can be greater than 1.',
    {
      tokenAddress: z
        .string()
        .describe(
          "The contract address of the ERC1155 token collection (e.g., '0x76BE3b62873462d2142405439777e971754E8E77')"
        ),
      tokenId: z
        .string()
        .describe(
          "The ID of the specific token to check the balance for (e.g., '1234')"
        ),
      ownerAddress: z
        .string()
        .describe(
          "The wallet address to check the token balance for (e.g., '0x1234...')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', 'polygon') or chain ID. ERC1155 tokens exist across many networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ tokenAddress, tokenId, ownerAddress, network = 'base' }) => {
      try {
        const balance = await services.getERC1155Balance(
          tokenAddress as Address,
          ownerAddress as Address,
          BigInt(tokenId),
          network
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  contract: tokenAddress,
                  tokenId,
                  owner: ownerAddress,
                  network,
                  balance: balance.toString(),
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching ERC1155 token balance: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // SWAP TOOLS

  // Swap ERC20 tokens
  server.tool(
    'swap_erc20',
    'Swap ERC20 tokens using a decentralized exchange, Uniswap. This tool allows you to swap one ERC20 token for another.',
    {
      fromAddress: z
        .string()
        .describe(
          "The current owner's wallet address that holds the NFT (e.g., '0x1234...')"
        ),
      tokenInAddress: z
        .string()
        .describe('The address of the ERC20 token you want to swap from'),
      tokenInDecimals: z
        .number()
        .describe('The number of decimals for the input token.'),
      tokenOutAddress: z
        .string()
        .describe('The address of the ERC20 token you want to swap to'),
      tokenOutDecimals: z
        .number()
        .describe('The number of decimals for the output token.'),
      amountIn: z
        .string()
        .describe(
          "The amount of the input token to swap (in smallest units, e.g., '1000000' for 1 token with 6 decimals)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Base mainnet."
        ),
    },
    async (
      {
        fromAddress,
        tokenInAddress,
        tokenInDecimals,
        tokenOutAddress,
        tokenOutDecimals,
        amountIn,
        network = 'base',
      },
      extra
    ) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )

        const publicClient = services.getPublicClient(network)
        const chainId = networkNameMap[network] as ChainId
        const uniswapAddress = networkUniswapRouterMap[chainId] as
          | Address
          | undefined

        if (!uniswapAddress) {
          throw new Error(
            `Uniswap router not supported for network: ${network}`
          )
        }

        // Check allowance
        const allowance = await publicClient.readContract({
          abi: erc20Abi,
          address: tokenInAddress as Address,
          args: [fromAddress as Address, uniswapAddress],
          functionName: 'allowance',
        })

        if (allowance < BigInt(amountIn)) {
          const result = await services.approveERC20(
            tokenInAddress as Address,
            uniswapAddress as Address,
            amountIn,
            network,
            privyClient,
            privyWalletId
          )
          await publicClient.waitForTransactionReceipt({
            hash: result.txHash,
          })
        }

        // Get route
        const tokenIn = new Token(chainId, tokenInAddress, tokenInDecimals)
        const tokenOut = new Token(chainId, tokenOutAddress, tokenOutDecimals)
        console.log(
          `Searching for route from ${tokenIn.symbol || tokenIn.address} to ${
            tokenOut.symbol || tokenOut.address
          } at ${network}, ${chainId}`
        )
        const provider = new JsonRpcProvider(rpcUrlMap[chainId], chainId)
        const router = new AlphaRouter({
          chainId,
          provider,
        })
        const route = await router.route(
          CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString()),
          tokenOut,
          TradeType.EXACT_INPUT,
          {
            deadline: Math.floor(Date.now() / 1000 + 60),
            recipient: fromAddress,
            slippageTolerance: new Percent(Number(20n), 10_000),
            type: SwapType.SWAP_ROUTER_02,
          },
          {
            intent: INTENT.SWAP,
            protocols: [Protocol.V3],
          }
        )
        console.log(`Route found:`, route)
        if (!route?.route[0].route) {
          throw new Error('No route found')
        }
        const path = encodeRouteToPath(
          route.route[0].route as V3Route,
          false
        ) as `0x${string}`
        if (path) {
          console.log(
            `Found route for ${tokenIn.symbol || tokenIn.address} to ${
              tokenOut.symbol || tokenOut.address
            }:`,
            (route.route[0].route as V3Route).tokenPath
              .map((token) => token.symbol || token.address)
              .join(' -> ')
          )
        }
        const param = {
          amountIn: BigInt(amountIn),
          amountOutMinimum: 1n,
          path,
          recipient: fromAddress,
        } as {
          readonly amountIn: bigint
          readonly amountOutMinimum: bigint
          readonly recipient: `0x${string}`
          readonly path: `0x${string}`
        }
        // Execute swap
        const data = encodeFunctionData({
          abi: uniswapRouterAbi,
          functionName: 'exactInput',
          args: [param],
        })
        const tx = await privyClient.walletApi.rpc({
          walletId: privyWalletId,
          method: 'eth_sendTransaction',
          caip2: `eip155:${chainId}`,
          params: {
            transaction: {
              to: uniswapAddress,
              data,
              chainId,
            },
          },
        })

        if ('error' in tx) {
          throw new Error(`Transaction failed: ${tx.error.message}`)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: tx.data.hash as Hash,
                },
                bigintReplacer,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error transferring ERC20 tokens: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // // Cross chain swap
  // server.tool(
  //   'cross_chain_swap',
  //   {
  //     srcChainId: z.number().describe('Source chain ID, e.g., 1 for Ethereum'),
  //     dstChainId: z
  //       .number()
  //       .describe('Destination chain ID, e.g., 8453 for Base mainnet'),
  //     srcTokenAddress: z
  //       .string()
  //       .describe(
  //         'Source token address, e.g., "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" for USDC on Ethereum'
  //       ),
  //     dstTokenAddress: z
  //       .string()
  //       .describe(
  //         'Destination token address, e.g., "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" for USDC on Base'
  //       ),
  //     amount: z
  //       .string()
  //       .describe('Amount to swap in base units, e.g., "1000000" for 1 USDC'),
  //     fromAddress: z
  //       .string()
  //       .describe("The current owner's wallet address (e.g., '0x1234...')"),
  //   },
  //   async (
  //     {
  //       srcChainId,
  //       dstChainId,
  //       srcTokenAddress,
  //       dstTokenAddress,
  //       amount,
  //       fromAddress,
  //     },
  //     extra
  //   ) => {
  //     const params = {
  //       srcChainId,
  //       dstChainId,
  //       srcTokenAddress,
  //       dstTokenAddress,
  //       amount,
  //       enableEstimate: true,
  //       walletAddress: fromAddress,
  //     }

  //     try {
  //       const {
  //         privyAppId,
  //         privyAppSecret,
  //         privyAuthorizationPrivateKey,
  //         privyWalletId,
  //       } = extractPrivyHeaders(extra)

  //       const privyClient = services.getPrivyClient(
  //         privyAppId,
  //         privyAppSecret,
  //         privyAuthorizationPrivateKey
  //       )
  //       const providerConnector: BlockchainProviderConnector = {
  //         async signTypedData(
  //           walletAddress: string,
  //           typedData: EIP712TypedData
  //         ) {
  //           return (
  //             await privyClient.walletApi.ethereum.signTypedData({
  //               walletId: privyWalletId,
  //               typedData,
  //             })
  //           ).signature
  //         },
  //         async ethCall(contractAddress: string, callData: string) {
  //           const publicClient = services.getPublicClientForChainId(srcChainId)
  //           const resultingData = (
  //             await publicClient.call({
  //               to: contractAddress as Address,
  //               data: callData as `0x${string}`,
  //               account: fromAddress as Address,
  //             })
  //           ).data
  //           if (!resultingData) {
  //             throw new Error(
  //               `Call to ${contractAddress} with data ${callData} returned no data`
  //             )
  //           }
  //           return resultingData as `0x${string}`
  //         },
  //       }

  //       const sdk = new SDK({
  //         url: 'https://api.1inch.dev/fusion-plus',
  //         authKey: process.env.ONE_INCH_API_KEY,
  //         blockchainProvider: providerConnector,
  //       })

  //       const quote = await sdk.getQuote(params)
  //       const secretsCount = quote.getPreset().secretsCount

  //       const secrets = Array.from({ length: secretsCount }).map(
  //         () => '0x' + Buffer.from(randomBytes(32)).toString('hex')
  //       )
  //       const secretHashes = secrets.map((x) => HashLock.hashSecret(x))

  //       const hashLock =
  //         secretsCount === 1
  //           ? HashLock.forSingleFill(secrets[0])
  //           : HashLock.forMultipleFills(
  //               secretHashes.map((secretHash, i) =>
  //                 solidityPackedKeccak256(
  //                   ['uint64', 'bytes32'],
  //                   [i, secretHash.toString()]
  //                 )
  //               ) as (string & {
  //                 _tag: 'MerkleLeaf'
  //               })[]
  //             )

  //       const quoteResponse = await sdk.placeOrder(quote, {
  //         walletAddress: fromAddress,
  //         hashLock,
  //         secretHashes,
  //       })

  //       const orderHash = quoteResponse.orderHash

  //       const result = {
  //         success: true,
  //         orderHash,
  //         message: 'The swap will happen in 2-3 minutes.',
  //       }
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Swap initiated successfully! Order hash: ${result.orderHash}\n${result.message}`,
  //           },
  //         ],
  //       }
  //     } catch (error) {
  //       return {
  //         content: [{ type: 'text', text: `Error: ${error}` }],
  //         isError: true,
  //       }
  //     }
  //   }
  // )

  // // Limit orders
  // server.tool(
  //   'place_limit_order',
  //   'Place a limit order for an ERC20 token swap',
  //   {
  //     fromAddress: z
  //       .string()
  //       .describe(
  //         "The current owner's wallet address that holds the source token (e.g., '0x1234...')"
  //       ),
  //     network: z
  //       .string()
  //       .optional()
  //       .describe(
  //         "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
  //       ),
  //     makerAssetAddress: z
  //       .string()
  //       .describe(
  //         'The address of the ERC20 token you want to sell (maker asset)'
  //       ),
  //     takerAssetAddress: z
  //       .string()
  //       .describe(
  //         'The address of the ERC20 token you want to buy (taker asset)'
  //       ),
  //     makingAmount: z
  //       .string()
  //       .describe(
  //         "The amount of the maker asset to sell, as a bigint string (e.g., '1000000000000000000' for 1 token with 18 decimals)"
  //       ),
  //     takingAmount: z
  //       .string()
  //       .describe(
  //         "The amount of the taker asset to buy, as a bigint string (e.g., '1000000000000000000' for 1 token with 18 decimals)"
  //       ),
  //     expiresInSeconds: z
  //       .number()
  //       .describe('Expiration time in seconds from now.'),
  //   },
  //   async (
  //     {
  //       fromAddress,
  //       network = 'base',
  //       makerAssetAddress,
  //       takerAssetAddress,
  //       makingAmount,
  //       takingAmount,
  //       expiresInSeconds,
  //     },
  //     extra
  //   ) => {
  //     try {
  //       const {
  //         privyAppId,
  //         privyAppSecret,
  //         privyAuthorizationPrivateKey,
  //         privyWalletId,
  //       } = extractPrivyHeaders(extra)
  //       const privyClient = services.getPrivyClient(
  //         privyAppId,
  //         privyAppSecret,
  //         privyAuthorizationPrivateKey
  //       )
  //       const expiresIn = BigInt(expiresInSeconds)
  //       const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn

  //       const UINT_40_MAX = (1n << 48n) - 1n

  //       const makerTraits = MakerTraits.default()
  //         .withExpiration(expiration)
  //         .withNonce(randBigInt(UINT_40_MAX))

  //       const sdk = new Sdk({
  //         authKey: process.env.ONE_INCH_API_KEY as string,
  //         networkId: 1,
  //         httpConnector: new FetchProviderConnector(),
  //       })

  //       const order = await sdk.createOrder(
  //         {
  //           makerAsset: new Address1Inch(makerAssetAddress),
  //           takerAsset: new Address1Inch(takerAssetAddress),
  //           makingAmount: BigInt(makingAmount),
  //           takingAmount: BigInt(takingAmount),
  //           maker: new Address1Inch(fromAddress),
  //         },
  //         makerTraits
  //       )

  //       const networkId = networkNameMap[network]
  //       const typedData = order.getTypedData(networkId)
  //       const signature = (
  //         await privyClient.walletApi.ethereum.signTypedData({
  //           walletId: privyWalletId,
  //           typedData,
  //         })
  //       ).signature

  //       await sdk.submitOrder(order, signature)

  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: JSON.stringify(
  //               {
  //                 success: true,
  //                 message: 'Limit order placed successfully!',
  //               },
  //               bigintReplacer,
  //               2
  //             ),
  //           },
  //         ],
  //       }
  //     } catch (error) {
  //       return {
  //         content: [
  //           {
  //             type: 'text',
  //             text: `Error placing limit order: ${
  //               error instanceof Error ? error.message : String(error)
  //             }`,
  //           },
  //         ],
  //         isError: true,
  //       }
  //     }
  //   }
  // )
}
