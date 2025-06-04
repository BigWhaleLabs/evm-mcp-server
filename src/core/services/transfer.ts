import {
  parseEther,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
  getContract,
  encodeFunctionData,
} from 'viem'
import { getPublicClient } from './clients.js'
import { resolveAddress } from './ens.js'
import { PrivyClient } from '@privy-io/server-auth'
import { networkNameMap } from '../chains.js'

export function getPrivyClient(
  appId: string,
  appSecret: string,
  authorizationPrivateKey: string
) {
  return new PrivyClient(appId, appSecret, {
    walletApi: {
      authorizationPrivateKey: authorizationPrivateKey,
    },
  })
}

// Standard ERC20 ABI for transfers
const erc20TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
    ],
    name: 'transfer',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' },
    ],
    name: 'approve',
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Standard ERC721 ABI for transfers
const erc721TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'tokenId' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    name: 'ownerOf',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ERC1155 ABI for transfers
const erc1155TransferAbi = [
  {
    inputs: [
      { type: 'address', name: 'from' },
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'id' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes', name: 'data' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { type: 'address', name: 'account' },
      { type: 'uint256', name: 'id' },
    ],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Transfer ETH to an address
 * @param toAddressOrEns Recipient address or ENS name
 * @param amount Amount to send in ETH
 * @param network Network name or chain ID
 * @param privyClient Privy client instance
 * @param privyWalletId Privy wallet ID
 * @returns Transaction hash
 */
export async function transferETH(
  toAddressOrEns: string,
  amount: string, // in ether
  network = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<Hash> {
  // Resolve ENS name to address if needed
  const toAddress = await resolveAddress(toAddressOrEns, network)

  const networkId = networkNameMap[network]

  const amountWei = parseEther(amount)
  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: toAddress,
        value: `0x${amountWei.toString(16)}`,
        chainId: networkId,
      },
    },
  })
  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }
  return tx.data.hash as `0x${string}`
}

/**
 * Transfer ERC20 tokens to an address
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param toAddressOrEns Recipient address or ENS name
 * @param amount Amount to send (in token units)
 * @param network Network name or chain ID
 * @param privyClient Privy client instance
 * @param privyWalletId Privy wallet ID
 * @returns Transaction details
 */
export async function transferERC20(
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  amount: string,
  network: string = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<{
  txHash: Hash
  amount: {
    raw: bigint
    formatted: string
  }
  token: {
    symbol: string
    decimals: number
  }
}> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = (await resolveAddress(
    tokenAddressOrEns,
    network
  )) as Address
  const toAddress = (await resolveAddress(toAddressOrEns, network)) as Address

  // Get token details
  const publicClient = getPublicClient(network)
  const contract = getContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    client: publicClient,
  })

  // Get token decimals and symbol
  const decimals = await contract.read.decimals()
  const symbol = await contract.read.symbol()

  // Parse the amount with the correct number of decimals
  const rawAmount = parseUnits(amount, decimals)

  const networkId = networkNameMap[network]

  // Encode the transfer function call
  const transferData = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: 'transfer',
    args: [toAddress, rawAmount],
  })

  // Send the transaction using Privy
  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: tokenAddress,
        data: transferData,
        chainId: networkId,
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }

  return {
    txHash: tx.data.hash as Hash,
    amount: {
      raw: rawAmount,
      formatted: amount,
    },
    token: {
      symbol,
      decimals,
    },
  }
}

/**
 * Approve ERC20 token spending
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param spenderAddressOrEns Spender address or ENS name
 * @param amount Amount to approve (in token units)
 * @param network Network name or chain ID
 * @param privyClient Privy client instance
 * @param privyWalletId Privy wallet ID
 * @returns Transaction details
 */
export async function approveERC20(
  tokenAddressOrEns: string,
  spenderAddressOrEns: string,
  amount: string,
  network: string = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<{
  txHash: Hash
  amount: {
    raw: bigint
    formatted: string
  }
  token: {
    symbol: string
    decimals: number
  }
}> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = (await resolveAddress(
    tokenAddressOrEns,
    network
  )) as Address
  const spenderAddress = (await resolveAddress(
    spenderAddressOrEns,
    network
  )) as Address

  // Get token details
  const publicClient = getPublicClient(network)
  const contract = getContract({
    address: tokenAddress,
    abi: erc20TransferAbi,
    client: publicClient,
  })

  // Get token decimals and symbol
  const decimals = await contract.read.decimals()
  const symbol = await contract.read.symbol()

  // Parse the amount with the correct number of decimals
  const rawAmount = parseUnits(amount, decimals)

  const networkId = networkNameMap[network]

  // Encode the approve function call
  const approveData = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: 'approve',
    args: [spenderAddress, rawAmount],
  })

  // Send the transaction using Privy
  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: tokenAddress,
        data: approveData,
        chainId: networkId,
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }

  return {
    txHash: tx.data.hash as Hash,
    amount: {
      raw: rawAmount,
      formatted: amount,
    },
    token: {
      symbol,
      decimals,
    },
  }
}

/**
 * Transfer an NFT (ERC721) to an address
 * @param fromAddress Sender address
 * @param tokenAddressOrEns NFT contract address or ENS name
 * @param toAddressOrEns Recipient address or ENS name
 * @param tokenId Token ID to transfer
 * @param network Network name or chain ID
 * @param privyClient Privy client instance
 * @param privyWalletId Privy wallet ID
 * @returns Transaction details
 */
export async function transferERC721(
  fromAddress: Address,
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  tokenId: bigint,
  network: string = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<{
  txHash: Hash
  tokenId: string
  token: {
    name: string
    symbol: string
  }
}> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = (await resolveAddress(
    tokenAddressOrEns,
    network
  )) as Address
  const toAddress = (await resolveAddress(toAddressOrEns, network)) as Address

  const networkId = networkNameMap[network]

  // Encode the transferFrom function call
  const transferData = encodeFunctionData({
    abi: erc721TransferAbi,
    functionName: 'transferFrom',
    args: [fromAddress, toAddress, tokenId],
  })

  // Send the transaction using Privy
  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: tokenAddress,
        data: transferData,
        chainId: networkId,
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }

  // Get token metadata
  const publicClient = getPublicClient(network)
  const contract = getContract({
    address: tokenAddress,
    abi: erc721TransferAbi,
    client: publicClient,
  })

  // Get token name and symbol
  let name = 'Unknown'
  let symbol = 'NFT'

  try {
    ;[name, symbol] = await Promise.all([
      contract.read.name(),
      contract.read.symbol(),
    ])
  } catch (error) {
    console.error('Error fetching NFT metadata:', error)
  }

  return {
    txHash: tx.data.hash as Hash,
    tokenId: tokenId.toString(),
    token: {
      name,
      symbol,
    },
  }
}

/**
 * Transfer ERC1155 tokens to an address
 * @param fromAddress Sender address
 * @param tokenAddressOrEns Token contract address or ENS name
 * @param toAddressOrEns Recipient address or ENS name
 * @param tokenId Token ID to transfer
 * @param amount Amount to transfer
 * @param network Network name or chain ID
 * @param privyClient Privy client instance
 * @param privyWalletId Privy wallet ID
 * @returns Transaction details
 */
export async function transferERC1155(
  fromAddress: Address,
  tokenAddressOrEns: string,
  toAddressOrEns: string,
  tokenId: bigint,
  amount: string,
  network: string = 'base',
  privyClient: PrivyClient,
  privyWalletId: string
): Promise<{
  txHash: Hash
  tokenId: string
  amount: string
}> {
  // Resolve ENS names to addresses if needed
  const tokenAddress = (await resolveAddress(
    tokenAddressOrEns,
    network
  )) as Address
  const toAddress = (await resolveAddress(toAddressOrEns, network)) as Address

  const networkId = networkNameMap[network]

  // Parse amount to bigint
  const amountBigInt = BigInt(amount)

  // Encode the safeTransferFrom function call
  const transferData = encodeFunctionData({
    abi: erc1155TransferAbi,
    functionName: 'safeTransferFrom',
    args: [fromAddress, toAddress, tokenId, amountBigInt, '0x'],
  })

  // Send the transaction using Privy
  const tx = await privyClient.walletApi.rpc({
    walletId: privyWalletId,
    method: 'eth_sendTransaction',
    caip2: `eip155:${networkId}`,
    params: {
      transaction: {
        to: tokenAddress,
        data: transferData,
        chainId: networkId,
      },
    },
  })

  if ('error' in tx) {
    throw new Error(`Transaction failed: ${tx.error.message}`)
  }

  return {
    txHash: tx.data.hash as Hash,
    tokenId: tokenId.toString(),
    amount,
  }
}
