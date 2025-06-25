import { McpServer } from '@big-whale-labs/modelcontextprotocol-sdk/server/mcp.js'
import register1InchTools from './1inch.js'
import registerNetworkInformationTools from './networkInformation.js'
import registerBlockTools from './block.js'
import registerBalanceTools from './balance.js'
import registerTransactionTools from './transaction.js'
import registerTransferTools from './transfer.js'
import registerWrapTools from './wrap.js'
import registerContractTools from './contract.js'
import registerTokenTools from './token.js'
import registerSwapTools from './swap.js'

export function registerEVMTools(server: McpServer) {
  registerNetworkInformationTools(server)
  registerBlockTools(server)
  registerBalanceTools(server)
  registerTransactionTools(server)
  registerTransferTools(server)
  registerWrapTools(server)
  registerContractTools(server)
  registerTokenTools(server)
  registerSwapTools(server)
  register1InchTools(server)
}
