import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'

export default function registerContractTools(server: McpServer) {
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
}
