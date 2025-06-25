import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { type Address } from 'viem'
import { DEFAULT_CHAIN_ID } from '../chains.js'

export default function registerBalanceTools(server: McpServer) {
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
        .number()
        .optional()
        .describe(
          "Network chain ID or name (e.g., '1' for Ethereum Mainnet, '8453' for Base Mainnet). Defaults to Base."
        ),
    },
    async ({ address, network = DEFAULT_CHAIN_ID }) => {
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

  server.tool(
    'get_erc20_balance',
    'Get the ERC20 token balance of an Ethereum address',
    {
      address: z.string().describe('The Ethereum address to check'),
      tokenAddress: z.string().describe('The ERC20 token contract address'),
      network: z
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ address, tokenAddress, network = DEFAULT_CHAIN_ID }) => {
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
}
