import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { z } from 'zod'
import * as services from '../services/index.js'
import { type Address, type Hash, encodeFunctionData, erc20Abi } from 'viem'
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
  AlphaRouter,
  INTENT,
  SwapType,
  V3Route,
} from '@uniswap/smart-order-router'
import { Protocol } from '@uniswap/router-sdk'
import { encodeRouteToPath } from '@uniswap/v3-sdk'
import uniswapRouterAbi from '../uniswapRouterAbi.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import extractPrivyHeaders from '../helpers/extractPrivyHeaders.js'
import { chains, DEFAULT_CHAIN_ID, getRpcUrl } from '../chains.js'

export default function registerSwapTools(server: McpServer) {
  // Swap ERC20 tokens
  server.tool(
    'swap_erc20',
    'Swap ERC20 tokens using a decentralized exchange, Uniswap. This tool allows you to swap one ERC20 token for another.',
    {
      fromAddress: z
        .string()
        .describe(
          "The current owner's wallet address that holds the NFT (e.g., '0x1234...')"
        ),
      tokenInAddress: z
        .string()
        .describe('The address of the ERC20 token you want to swap from'),
      tokenInDecimals: z
        .number()
        .describe('The number of decimals for the input token.'),
      tokenOutAddress: z
        .string()
        .describe('The address of the ERC20 token you want to swap to'),
      tokenOutDecimals: z
        .number()
        .describe('The number of decimals for the output token.'),
      amountIn: z
        .string()
        .describe(
          "The amount of the input token to swap (in smallest units, e.g., '1000000' for 1 token with 6 decimals)"
        ),
      network: z
        .number()
        .optional()
        .describe(
          'The EVM network chain ID to use for the swap (defaults to Base mainnet)'
        ),
    },
    async (
      {
        fromAddress,
        tokenInAddress,
        tokenInDecimals,
        tokenOutAddress,
        tokenOutDecimals,
        amountIn,
        network = DEFAULT_CHAIN_ID,
      },
      extra
    ) => {
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

        const publicClient = services.getPublicClient(network)
        const uniswapAddress = chains[network]?.uniswapRouter as
          | Address
          | undefined

        if (!uniswapAddress) {
          throw new Error(
            `Uniswap router not supported for network: ${network}`
          )
        }

        // Check allowance
        const allowance = await publicClient.readContract({
          abi: erc20Abi,
          address: tokenInAddress as Address,
          args: [fromAddress as Address, uniswapAddress],
          functionName: 'allowance',
        })

        if (allowance < BigInt(amountIn)) {
          const result = await services.approveERC20(
            tokenInAddress as Address,
            uniswapAddress as Address,
            amountIn,
            network,
            privyClient,
            privyWalletId
          )
          await publicClient.waitForTransactionReceipt({
            hash: result.txHash,
          })
        }

        // Get route
        const tokenIn = new Token(network, tokenInAddress, tokenInDecimals)
        const tokenOut = new Token(network, tokenOutAddress, tokenOutDecimals)
        console.log(
          `Searching for route from ${tokenIn.symbol || tokenIn.address} to ${
            tokenOut.symbol || tokenOut.address
          } at ${network}`
        )
        const provider = new JsonRpcProvider(getRpcUrl(network))
        const router = new AlphaRouter({
          chainId: network,
          provider,
        })
        const route = await router.route(
          CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString()),
          tokenOut,
          TradeType.EXACT_INPUT,
          {
            deadline: Math.floor(Date.now() / 1000 + 60),
            recipient: fromAddress,
            slippageTolerance: new Percent(Number(20n), 10_000),
            type: SwapType.SWAP_ROUTER_02,
          },
          {
            intent: INTENT.SWAP,
            protocols: [Protocol.V3],
          }
        )
        console.log(`Route found!`)
        if (!route?.route[0].route) {
          throw new Error('No route found')
        }
        const path = encodeRouteToPath(
          route.route[0].route as V3Route,
          false
        ) as `0x${string}`
        if (path) {
          console.log(
            `Found route for ${tokenIn.symbol || tokenIn.address} to ${
              tokenOut.symbol || tokenOut.address
            }:`,
            (route.route[0].route as V3Route).tokenPath
              .map((token) => token.symbol || token.address)
              .join(' -> ')
          )
        }
        const param = {
          amountIn: BigInt(amountIn),
          amountOutMinimum: 1n,
          path,
          recipient: fromAddress,
        } as {
          readonly amountIn: bigint
          readonly amountOutMinimum: bigint
          readonly recipient: `0x${string}`
          readonly path: `0x${string}`
        }
        // Execute swap
        const data = encodeFunctionData({
          abi: uniswapRouterAbi,
          functionName: 'exactInput',
          args: [param],
        })
        const tx = await privyClient.walletApi.rpc({
          walletId: privyWalletId,
          method: 'eth_sendTransaction',
          caip2: `eip155:${network}`,
          params: {
            transaction: {
              to: uniswapAddress,
              data,
              chainId: network,
            },
          },
        })

        if ('error' in tx) {
          throw new Error(`Transaction failed: ${tx.error.message}`)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  txHash: tx.data.hash as Hash,
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
              text: `Error transferring ERC20 tokens: ${
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
