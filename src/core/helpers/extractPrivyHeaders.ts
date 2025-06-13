import { RequestHandlerExtra } from '@big-whale-labs/modelcontextprotocol-sdk/shared/protocol.js'
import {
  ServerNotification,
  ServerRequest,
} from '@big-whale-labs/modelcontextprotocol-sdk/types.js'

export default function extractPrivyHeaders(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): {
  privyAppId: string
  privyAppSecret: string
  privyAuthorizationPrivateKey: string
  privyWalletId: string
} {
  const headers = extra.requestHeaders
  return {
    privyAppId: headers['x-privy-app-id'],
    privyAppSecret: headers['x-privy-app-secret'],
    privyAuthorizationPrivateKey: headers['x-privy-authorization-private-key'],
    privyWalletId: headers['x-privy-wallet-id'],
  } as {
    privyAppId: string
    privyAppSecret: string
    privyAuthorizationPrivateKey: string
    privyWalletId: string
  }
}
