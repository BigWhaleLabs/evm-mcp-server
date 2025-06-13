import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import extractPrivyHeaders from '../helpers/extractPrivyHeaders.js'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { type Address } from 'viem'

export default function registerWrapTools(server: McpServer) {
  // Wrap ETH
  server.tool(
    'wrap_eth',
    'Wrap ETH into WETH (Wrapped Ether) on EVM-compatible networks',
    {
      amount: z
        .string()
        .describe(
          "Amount of ETH to wrap, as a bigint string (e.g., '1000000000000000000' for 1 ETH)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
        ),
      wethAddress: z.string().describe('WETH contract address'),
    },
    async ({ amount, network = 'base', wethAddress }, extra) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const txHash = await services.wrapETH(
          amount,
          network,
          privyClient,
          privyWalletId,
          wethAddress as Address
        )

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  amount,
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
              text: `Error wrapping ETH: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Unwrap WETH to ETH
  server.tool(
    'unwrap_weth',
    'Unwrap WETH (Wrapped Ether) back to ETH on EVM-compatible networks',
    {
      amount: z
        .string()
        .describe(
          "Amount of WETH to unwrap, as a bigint string (e.g., '1000000000000000000' for 1 WETH)"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
        ),
      wethAddress: z.string().describe('WETH contract address'),
    },
    async ({ amount, network = 'base', wethAddress }, extra) => {
      try {
        const {
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey,
          privyWalletId,
        } = extractPrivyHeaders(extra)
        const privyClient = services.getPrivyClient(
          privyAppId,
          privyAppSecret,
          privyAuthorizationPrivateKey
        )
        const txHash = await services.unwrapWETH(
          amount,
          network,
          privyClient,
          privyWalletId,
          wethAddress as Address
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash,
                  amount,
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
              text: `Error unwrapping WETH: ${
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
