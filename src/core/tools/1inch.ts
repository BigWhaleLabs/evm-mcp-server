import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import { Address } from 'viem'
import { z } from 'zod'
import {
  BlockchainProviderConnector,
  SDK,
  EIP712TypedData,
  HashLock,
} from '@1inch/cross-chain-sdk'
import { randomBytes, solidityPackedKeccak256 } from 'ethers'
import {
  MakerTraits,
  Sdk,
  randBigInt,
  Address as Address1Inch,
} from '@1inch/limit-order-sdk'
import extractPrivyHeaders from '../helpers/extractPrivyHeaders.js'
import * as services from '../services/index.js'
import bigintReplacer from '../helpers/bigintReplacer.js'
import { networkNameMap } from '../chains.js'
import FetchProviderConnector from '../helpers/FetchProviderConnector.js'

export default function register1InchTools(server: McpServer) {
  // Cross chain swap
  server.tool(
    'cross_chain_swap',
    'Swap tokens across different EVM chains using 1inch Fusion+',
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
        .describe('Amount to swap in base units, e.g., "1000000" for 1 USDC'),
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
            return (
              await privyClient.walletApi.ethereum.signTypedData({
                walletId: privyWalletId,
                typedData,
              })
            ).signature
          },
          async ethCall(contractAddress: string, callData: string) {
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

        const sdk = new SDK({
          url: 'https://api.1inch.dev/fusion-plus',
          authKey: process.env.ONE_INCH_API_KEY,
          blockchainProvider: providerConnector,
        })

        const quote = await sdk.getQuote(params)
        const secretsCount = quote.getPreset().secretsCount

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

        const orderHash = quoteResponse.orderHash

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
    'Place a limit order for an ERC20 token swap',
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
        .describe('Expiration time in seconds from now.'),
    },
    async (
      {
        fromAddress,
        network = 'base',
        makerAssetAddress,
        takerAssetAddress,
        makingAmount,
        takingAmount,
        expiresInSeconds,
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

        const networkId = networkNameMap[network]
        const typedData = order.getTypedData(networkId)
        const signature = (
          await privyClient.walletApi.ethereum.signTypedData({
            walletId: privyWalletId,
            typedData,
          })
        ).signature

        await sdk.submitOrder(order, signature)

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
