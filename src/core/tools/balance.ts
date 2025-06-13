import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { type Address } from 'viem'

export default function registerBalanceTools(server: McpServer) {
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
}
