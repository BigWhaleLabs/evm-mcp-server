import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { Address } from 'viem'
import { z } from 'zod'
import {
  BlockchainProviderConnector,
  SDK,
  EIP712TypedData,
  HashLock,
} from '@1inch/cross-chain-sdk'
import { randomBytes, solidityPackedKeccak256 } from 'ethersv6'
import {
  MakerTraits,
  Sdk,
  randBigInt,
  Address as Address1Inch,
} from '@1inch/limit-order-sdk'
import extractPrivyHeaders from '../helpers/extractPrivyHeaders.js'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { getNetworkNameById, networkNameMap } from '../chains.js'
import FetchProviderConnector from '../helpers/FetchProviderConnector.js'
import { AxiosError } from 'axios'
import { redis } from 'bun'

export default function register1InchTools(server: McpServer) {
  // Get cross chain swap orders by address
  server.tool(
    'get_cross_chain_swap_orders_by_address',
    'Get cross chain swap orders by address',
    {
      address: z
        .string()
        .describe(
          "The user's wallet address to fetch orders for (e.g., '0x1234...')"
        ),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination, defaults to 1 if not provided'),
    },
    async ({ address, page = 1 }) => {
      try {
        const fusionSdk = new SDK({
          url: 'https://api.1inch.dev/fusion-plus',
          authKey: process.env.ONE_INCH_API_KEY,
        })
        const orders = await fusionSdk.getOrdersByMaker({
          address,
          page,
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(orders, bigintReplacer, 2),
            },
          ],
        }
      } catch (error) {
        console.error(
          `Error initializing 1inch Fusion SDK: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        return {
          content: [
            {
              type: 'text',
              text: `Error initializing 1inch Fusion SDK: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  // Cross chain swap
  server.tool(
    'cross_chain_swap',
    'Swap tokens across different EVM chains (networks) using 1inch Fusion+, use this when users want to move tokens between networks or bridge them',
    {
      srcChainId: z.number().describe('Source chain ID, e.g., 1 for Ethereum'),
      dstChainId: z
        .number()
        .describe('Destination chain ID, e.g., 8453 for Base mainnet'),
      srcTokenAddress: z
        .string()
        .describe(
          'Source token address, e.g., "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" for USDC on Ethereum'
        ),
      dstTokenAddress: z
        .string()
        .describe(
          'Destination token address, e.g., "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" for USDC on Base'
        ),
      amount: z
        .string()
        .describe(
          'Amount of srcTokenAddress to swap in base units, e.g., "1000000" for 1 USDC'
        ),
      fromAddress: z
        .string()
        .describe("The current owner's wallet address (e.g., '0x1234...')"),
    },
    async (
      {
        srcChainId,
        dstChainId,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        fromAddress,
      },
      extra
    ) => {
      const params = {
        srcChainId,
        dstChainId,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        enableEstimate: true,
        walletAddress: fromAddress,
      }

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
        const providerConnector: BlockchainProviderConnector = {
          async signTypedData(
            walletAddress: string,
            typedData: EIP712TypedData
          ) {
            console.log(
              `Signing typed data for wallet ${walletAddress} on chain ${srcChainId}`
            )
            return (
              await privyClient.walletApi.ethereum.signTypedData({
                walletId: privyWalletId,
                typedData,
              })
            ).signature
          },
          async ethCall(contractAddress: string, callData: string) {
            console.log(
              `Calling contract ${contractAddress} with data ${callData} on chain ${srcChainId}`
            )
            const publicClient = services.getPublicClientForChainId(srcChainId)
            const resultingData = (
              await publicClient.call({
                to: contractAddress as Address,
                data: callData as `0x${string}`,
                account: fromAddress as Address,
              })
            ).data
            if (!resultingData) {
              throw new Error(
                `Call to ${contractAddress} with data ${callData} returned no data`
              )
            }
            return resultingData as `0x${string}`
          },
        }
        // Checking allowance
        const spender =
          srcChainId === 324
            ? '0x6fd4383cb451173d5f9304f041c7bcbf27d561ff'
            : '0x111111125421ca6dc452d289314280a0f8842a65'
        const allowance = await services.getERC20Allowance(
          srcTokenAddress as Address,
          fromAddress as Address,
          spender,
          srcChainId
        )
        if (BigInt(allowance) < BigInt(amount)) {
          // If allowance is not enough, we need to approve the spender
          await services.approveERC20(
            srcTokenAddress as Address,
            spender,
            amount,
            getNetworkNameById(srcChainId),
            privyClient,
            privyWalletId
          )
        }
        console.log(
          `Initiating cross-chain swap from ${srcChainId} to ${dstChainId} for ${amount} of ${srcTokenAddress} to ${dstTokenAddress} with ${process.env.ONE_INCH_API_KEY} API key`
        )
        console.log('Fetching quote for cross-chain swap with params:', params)
        const sdk = new SDK({
          url: 'https://api.1inch.dev/fusion-plus',
          authKey: process.env.ONE_INCH_API_KEY,
          blockchainProvider: providerConnector,
        })

        const quote = await sdk.getQuote(params)
        const secretsCount = quote.getPreset().secretsCount
        console.log(
          `Quote received with ${secretsCount} secrets for cross-chain swap`
        )

        const secrets = Array.from({ length: secretsCount }).map(
          () => '0x' + Buffer.from(randomBytes(32)).toString('hex')
        )
        const secretHashes = secrets.map((x) => HashLock.hashSecret(x))

        const hashLock =
          secretsCount === 1
            ? HashLock.forSingleFill(secrets[0])
            : HashLock.forMultipleFills(
                secretHashes.map((secretHash, i) =>
                  solidityPackedKeccak256(
                    ['uint64', 'bytes32'],
                    [i, secretHash.toString()]
                  )
                ) as (string & {
                  _tag: 'MerkleLeaf'
                })[]
              )
        const quoteResponse = await sdk.placeOrder(quote, {
          walletAddress: fromAddress,
          hashLock,
          secretHashes,
        })
        console.log(
          `Cross-chain swap quote placed successfully! Quote response: ${quoteResponse}`
        )

        const orderHash = quoteResponse.orderHash

        await redis.set(
          `cross_chain_swap_order:${orderHash}`,
          JSON.stringify(secrets)
        )

        const result = {
          success: true,
          orderHash,
          message: 'The swap will happen in 2-3 minutes.',
        }
        console.log(
          `Cross-chain swap initiated successfully! Order hash: ${orderHash}`
        )
        return {
          content: [
            {
              type: 'text',
              text: `Swap initiated successfully! Order hash: ${result.orderHash}\n${result.message}`,
            },
          ],
        }
      } catch (error) {
        if (error instanceof AxiosError) {
          console.log(
            `Error placing cross-chain swap quote: ${error.message}`,
            error.response?.data
          )
          return {
            content: [
              {
                type: 'text',
                text: `Error placing cross-chain swap quote: ${{
                  message: error.message,
                  status: error.response?.status,
                  statusText: error.response?.statusText,
                  data: error.response?.data,
                }}`,
              },
            ],
            isError: true,
          }
        }
        console.error(
          `Error placing cross-chain swap quote: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true,
        }
      }
    }
  )

  // Limit orders
  server.tool(
    'place_limit_order',
    'Place a limit order for an ERC20 token swap, it will either be executed for the specified amounts or will be refunded by the expiration time; you need to know the price of both tokens in advance to calculate the correct amounts. Ask the user for when to expire the order, it defaults to 10 days from now.',
    {
      fromAddress: z
        .string()
        .describe(
          "The current owner's wallet address that holds the source token (e.g., '0x1234...')"
        ),
      network: z
        .string()
        .optional()
        .describe(
          "Network name (e.g., 'ethereum', 'optimism', 'arbitrum', 'base', etc.) or chain ID. Defaults to Base mainnet."
        ),
      makerAssetAddress: z
        .string()
        .describe(
          'The address of the ERC20 token you want to sell (maker asset)'
        ),
      takerAssetAddress: z
        .string()
        .describe(
          'The address of the ERC20 token you want to buy (taker asset)'
        ),
      makingAmount: z
        .string()
        .describe(
          "The amount of the maker asset to sell, as a bigint string (e.g., '1000000000000000000' for 1 token with 18 decimals)"
        ),
      takingAmount: z
        .string()
        .describe(
          "The amount of the taker asset to buy, as a bigint string (e.g., '1000000000000000000' for 1 token with 18 decimals)"
        ),
      expiresInSeconds: z
        .number()
        .optional()
        .describe('Expiration time in seconds from now. Default is 10 days'),
    },
    async (
      {
        fromAddress,
        network = 'base',
        makerAssetAddress,
        takerAssetAddress,
        makingAmount,
        takingAmount,
        expiresInSeconds = 864000, // Default to 10 days
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
        const expiresIn = BigInt(expiresInSeconds)
        const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn

        const UINT_40_MAX = (1n << 48n) - 1n

        const makerTraits = MakerTraits.default()
          .withExpiration(expiration)
          .withNonce(randBigInt(UINT_40_MAX))

        // Checking allowance
        const spender =
          networkNameMap[network] === 324
            ? '0x6fd4383cb451173d5f9304f041c7bcbf27d561ff'
            : '0x111111125421ca6dc452d289314280a0f8842a65'
        const allowance = await services.getERC20Allowance(
          makerAssetAddress as Address,
          fromAddress as Address,
          spender,
          networkNameMap[network]
        )
        console.log(
          `Got allowance for ${makerAssetAddress} from ${fromAddress} to ${spender} on network ${networkNameMap[network]}: ${allowance}`
        )
        if (BigInt(allowance) < BigInt(makingAmount)) {
          console.log(
            `Allowance for ${makerAssetAddress} is not enough, current: ${allowance}, required: ${makingAmount}`
          )
          // If allowance is not enough, we need to approve the spender
          await services.approveERC20(
            makerAssetAddress as Address,
            spender,
            makingAmount,
            network,
            privyClient,
            privyWalletId
          )
        }
        console.log(
          `Placing limit order for ${makingAmount} of ${makerAssetAddress} to receive ${takingAmount} of ${takerAssetAddress} from ${fromAddress} on network ${networkNameMap[network]}`
        )

        const sdk = new Sdk({
          authKey: process.env.ONE_INCH_API_KEY as string,
          networkId: 1,
          httpConnector: new FetchProviderConnector(),
        })

        const order = await sdk.createOrder(
          {
            makerAsset: new Address1Inch(makerAssetAddress),
            takerAsset: new Address1Inch(takerAssetAddress),
            makingAmount: BigInt(makingAmount),
            takingAmount: BigInt(takingAmount),
            maker: new Address1Inch(fromAddress),
          },
          makerTraits
        )
        console.log(
          `Limit order created successfully! Order details: ${JSON.stringify(
            order,
            bigintReplacer,
            2
          )}`
        )

        const networkId = networkNameMap[network]
        const typedData = order.getTypedData(networkId)
        const signature = (
          await privyClient.walletApi.ethereum.signTypedData({
            walletId: privyWalletId,
            typedData,
          })
        ).signature

        await sdk.submitOrder(order, signature)
        console.log(`Limit order submitted successfully!`)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Limit order placed successfully!',
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
              text: `Error placing limit order: ${
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
