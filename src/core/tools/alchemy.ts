import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { Alchemy } from 'alchemy-sdk'
import { z } from 'zod'
import { chains, DEFAULT_CHAIN_ID } from '../chains.js'

export default function registerAlchemyTools(server: McpServer) {
  server.tool(
    'get_balances_for_address',
    'Fetch EVM token balances for a given address on a specific network. For Solana balances, use the solana-mcp.',
    {
      address: z.string().describe('The EVM address to fetch balances for'),
      network: z
        .number()
        .optional()
        .describe(
          'The EVM network to fetch balances from. Defaults to BASE_MAINNET (8453). Use 1 for Ethereum Mainnet, 8453 for Base Mainnet, etc.'
        ),
    },
    async ({ address, network = DEFAULT_CHAIN_ID }) => {
      try {
        const settings = {
          apiKey: process.env.ALCHEMY_API_KEY,
          network: chains[network]?.alchemyName,
        }
        const alchemy = new Alchemy(settings)
        const balances = await alchemy.core.getTokenBalances(address)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(balances, null, 2),
            },
          ],
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching EVM balances: ${
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
