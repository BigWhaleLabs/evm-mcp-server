import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { Alchemy, Network } from 'alchemy-sdk'
import { z } from 'zod'

export default function registerAlchemyTools(server: McpServer) {
  server.tool(
    'get_supported_alchemy_networks',
    'Fetch all supported networks in Alchemy format',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                networks: [
                  Network.SOLANA_MAINNET,
                  Network.ETH_MAINNET,
                  Network.WORLDCHAIN_MAINNET,
                  Network.SHAPE_MAINNET,
                  Network.ZKSYNC_MAINNET,
                  Network.OPT_MAINNET,
                  Network.ARB_MAINNET,
                  Network.ARBNOVA_MAINNET,
                  Network.ASTAR_MAINNET,
                  Network.POLYGONZKEVM_MAINNET,
                  Network.ZETACHAIN_MAINNET,
                  Network.FANTOM_MAINNET,
                  Network.MANTLE_MAINNET,
                  Network.BERACHAIN_MAINNET,
                  Network.BLAST_MAINNET,
                  Network.LINEA_MAINNET,
                  Network.ZORA_MAINNET,
                  Network.RONIN_MAINNET,
                  Network.ROOTSTOCK_MAINNET,
                  Network.STORY_MAINNET,
                  Network.BASE_MAINNET,
                  Network.LENS_MAINNET,
                  Network.INK_MAINNET,
                  Network.GNOSIS_MAINNET,
                  Network.UNICHAIN_MAINNET,
                  Network.SUPERSEED_MAINNET,
                  Network.APECHAIN_MAINNET,
                  Network.CELO_MAINNET,
                  Network.METIS_MAINNET,
                  Network.SONIC_MAINNET,
                  Network.SEI_MAINNET,
                  Network.SCROLL_MAINNET,
                  Network.OPBNB_MAINNET,
                  Network.ABSTRACT_MAINNET,
                  Network.SONEIUM_MAINNET,
                ],
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )

  server.tool(
    'get_balances_for_address',
    'Fetch EVM token balances for a given address on a specific network. For Solana balances, use the solana-mcp.',
    {
      address: z.string().describe('The EVM address to fetch balances for'),
      network: z
        .string()
        .optional()
        .describe(
          'The network to fetch balances for (default: "base-mainnet", uses alchemy network formatting)'
        ),
    },
    async ({ address, network = Network.BASE_MAINNET }) => {
      try {
        const settings = {
          apiKey: process.env.ALCHEMY_API_KEY,
          network: network as Network,
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
