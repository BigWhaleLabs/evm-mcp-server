import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'

export default function registerBlockTools(server: McpServer) {
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
}
