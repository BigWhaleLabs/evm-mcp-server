import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { getSupportedNetworks } from '../chains.js'
import { normalize } from 'viem/ens'

export default function registerNetworkInformationTools(server: McpServer) {
  // Get chain information
  server.tool(
    'get_chain_info',
    'Get information about an EVM network',
    {
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Supports all EVM-compatible networks. Defaults to Ethereum mainnet."
        ),
    },
    async ({ network = 'base' }) => {
      try {
        const chainId = await services.getChainId(network)
        const blockNumber = await services.getBlockNumber(network)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  network,
                  chainId,
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

  // ENS LOOKUP TOOL

  // Resolve ENS name to address
  server.tool(
    'resolve_ens',
    'Resolve an ENS name to an Ethereum address',
    {
      ensName: z.string().describe("ENS name to resolve (e.g., 'vitalik.eth')"),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. ENS resolution works best on Ethereum mainnet. Defaults to Ethereum mainnet."
        ),
    },
    async ({ ensName, network = 'ethereum' }) => {
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

  // Get supported networks
  server.tool(
    'get_supported_networks',
    'Get a list of supported EVM networks',
    {},
    async () => {
      try {
        const networks = getSupportedNetworks()

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  supportedNetworks: networks,
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
