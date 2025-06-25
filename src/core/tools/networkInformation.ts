import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { normalize } from 'viem/ens'
import { chains, DEFAULT_CHAIN_ID } from '../chains.js'

export default function registerNetworkInformationTools(server: McpServer) {
  server.tool(
    'get_chain_info',
    'Get information about an EVM network',
    {
      network: z
        .number()
        .optional()
        .describe(
          'The EVM network chain ID to get information about (defaults to Base mainnet)'
        ),
    },
    async ({ network = DEFAULT_CHAIN_ID }) => {
      try {
        const blockNumber = await services.getBlockNumber(network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  network,
                  chainId: network,
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

  server.tool(
    'resolve_ens',
    'Resolve an ENS name to an Ethereum address',
    {
      ensName: z.string().describe("ENS name to resolve (e.g., 'vitalik.eth')"),
      network: z
        .number()
        .optional()
        .describe(
          'The EVM network chain ID to resolve the ENS name on (defaults to Ethereum mainnet)'
        ),
    },
    async ({ ensName, network = 1 }) => {
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

  server.tool(
    'get_supported_networks',
    'Get a list of supported EVM networks',
    {},
    async () => {
      try {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  supportedNetworks: chains,
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
}
