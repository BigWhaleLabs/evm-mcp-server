import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import { type Address, type Hash } from 'viem'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { DEFAULT_CHAIN_ID } from '../chains.js'

export default function registerTransactionTools(server: McpServer) {
  // Get transaction by hash
  server.tool(
    'get_transaction',
    'Get detailed information about a specific transaction by its hash. Includes sender, recipient, value, data, and more.',
    {
      txHash: z
        .string()
        .describe("The transaction hash to look up (e.g., '0x1234...')"),
      network: z
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ txHash, network = DEFAULT_CHAIN_ID }) => {
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
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ txHash, network = DEFAULT_CHAIN_ID }) => {
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
        .number()
        .optional()
        .describe('Network chain ID. Defaults to Base mainnet.'),
    },
    async ({ to, value, data, network = DEFAULT_CHAIN_ID }) => {
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
}
