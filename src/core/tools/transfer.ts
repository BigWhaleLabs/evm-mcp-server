import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import { type Address } from 'viem'
import bigintReplacer from '../helpers/bigintReplacer.js'
import extractPrivyHeaders from '../helpers/extractPrivyHeaders.js'

export default function registerTransferTools(server: McpServer) {
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
}
