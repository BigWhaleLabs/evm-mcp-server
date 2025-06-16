import { StdioServerTransport } from '@big-whale-labs/modelcontextprotocol-sdk/server/stdio.js'
import startServer from './server/server.js'
import { redis } from 'bun'
import { OrderStatus, SDK } from '@1inch/cross-chain-sdk'

// Start the server
async function main() {
  try {
    const server = await startServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('EVM MCP Server running on stdio')
  } catch (error) {
    console.error('Error starting MCP server:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})

let checking = false
setInterval(async () => {
  if (checking) return
  checking = true
  try {
    // Check opened orders
    const orderHashKeys = await redis.keys('cross_chain_swap_order:*')
    for (const orderHashKey of orderHashKeys) {
      const unparsedSecrets = await redis.get(orderHashKey)
      if (!unparsedSecrets) continue
      const secrets = JSON.parse(unparsedSecrets) as string[]
      const fusionSdk = new SDK({
        url: 'https://api.1inch.dev/fusion-plus',
        authKey: process.env.ONE_INCH_API_KEY,
      })
      const orderHash = orderHashKey.split(':')[2]
      const orderStatus = await fusionSdk.getOrderStatus(orderHash)
      // Check if order is completed
      if (
        [
          OrderStatus.Cancelled,
          OrderStatus.Executed,
          OrderStatus.Refunded,
        ].includes(orderStatus.status)
      ) {
        await redis.del(orderHashKey)
        console.log(
          `Removed order ${orderHash} with status ${orderStatus.status}`
        )
        continue
      }
      // Check if order is filled
      const fillsObject = await fusionSdk.getReadyToAcceptSecretFills(orderHash)
      for (const fill of fillsObject.fills) {
        try {
          await fusionSdk.submitSecret(orderHash, secrets[fill.idx])
        } catch (error) {
          console.error(
            `Error submitting secret for order ${orderHash} fill ${fill.idx}:`,
            error
          )
        }
      }
    }
  } catch (error) {
    console.error('Error checking orders:', error)
  } finally {
    checking = false
  }
}, 10_000)
console.log('Started checking orders every 10 seconds')
