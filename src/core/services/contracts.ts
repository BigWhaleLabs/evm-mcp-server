import {
  type Address,
  type Hash,
  type Hex,
  type ReadContractParameters,
  type GetLogsParameters,
  type Log,
  encodeFunctionData,
} from 'viem'
import { getPublicClient } from './clients.js'
import { resolveAddress } from './ens.js'
import { PrivyClient } from '@privy-io/server-auth'
import { networkNameMap } from '../chains.js'
import wethAbi from '../wethAbi.js'

/**
 * Read from a contract for a specific network
 */
export async function readContract(
  params: ReadContractParameters,
  network = 'ethereum'
) {
  const client = getPublicClient(network)
  return await client.readContract(params)
}

/**
 * Write to a contract for a specific network
 */
export async function writeContract(
  transaction: Record<string, any>,
  network = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<Hash> {
  const networkId = networkNameMap[network]

  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction,
    },
  })
  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }
  return tx.data.hash as `0x${string}`
}

/**
 * Get logs for a specific network
 */
export async function getLogs(
  params: GetLogsParameters,
  network = 'ethereum'
): Promise<Log[]> {
  const client = getPublicClient(network)
  return await client.getLogs(params)
}

/**
 * Check if an address is a contract
 * @param addressOrEns Address or ENS name to check
 * @param network Network name or chain ID
 * @returns True if the address is a contract, false if it's an EOA
 */
export async function isContract(
  addressOrEns: string,
  network = 'ethereum'
): Promise<boolean> {
  // Resolve ENS name to address if needed
  const address = await resolveAddress(addressOrEns, network)

  const client = getPublicClient(network)
  const code = await client.getBytecode({ address })
  return code !== undefined && code !== '0x'
}

export async function wrapETH(
  amount: string,
  network: string,
  privyClient: PrivyClient,
  privyWalletId: string,
  wethAddress: Address
) {
  const networkId = networkNameMap[network]

  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: wethAddress,
        value: `0x${BigInt(amount).toString(16)}` as Hex,
        data: encodeFunctionData({
          abi: wethAbi,
          functionName: 'deposit',
          args: [],
        }),
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }
  return tx.data.hash as `0x${string}`
}

export async function unwrapWETH(
  amount: string,
  network: string,
  privyClient: PrivyClient,
  privyWalletId: string,
  wethAddress: Address
) {
  const networkId = networkNameMap[network]

  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: wethAddress,
        data: encodeFunctionData({
          abi: wethAbi,
          functionName: 'withdraw',
          args: [`0x${BigInt(amount).toString(16)}` as Hex],
        }),
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }
  return tx.data.hash as `0x${string}`
}
