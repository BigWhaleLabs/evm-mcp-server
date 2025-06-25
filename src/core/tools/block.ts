import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import { DEFAULT_CHAIN_ID } from '../chains.js'

export default function registerBlockTools(server: McpServer) {
  server.tool(
    'get_block_by_number',
    'Get a block by its block number',
    {
      blockNumber: z.number().describe('The block number to fetch'),
      network: z
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ blockNumber, network = DEFAULT_CHAIN_ID }) => {
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

  server.tool(
    'get_latest_block',
    'Get the latest block from the EVM',
    {
      network: z
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ network = DEFAULT_CHAIN_ID }) => {
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
