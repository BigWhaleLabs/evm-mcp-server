import { type Hash, type Block } from 'viem'
import { getPublicClient } from './clients.js'
import { DEFAULT_CHAIN_ID } from '../chains.js'

export async function getBlockNumber(
  network = DEFAULT_CHAIN_ID
): Promise<bigint> {
  const client = getPublicClient(network)
  return await client.getBlockNumber()
}

export async function getBlockByNumber(
  blockNumber: number,
  network = DEFAULT_CHAIN_ID
): Promise<Block> {
  const client = getPublicClient(network)
  return await client.getBlock({ blockNumber: BigInt(blockNumber) })
}

export async function getBlockByHash(
  blockHash: Hash,
  network = DEFAULT_CHAIN_ID
): Promise<Block> {
  const client = getPublicClient(network)
  return await client.getBlock({ blockHash })
}

export async function getLatestBlock(
  network = DEFAULT_CHAIN_ID
): Promise<Block> {
  const client = getPublicClient(network)
  return await client.getBlock()
}
