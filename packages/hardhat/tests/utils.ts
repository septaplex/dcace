import { BigNumber } from 'ethers'

export function calcTokenOwnership(allocation: BigNumber, fromSold: BigNumber, toBought: BigNumber): BigNumber {
  const bps = allocation.mul(10000).div(fromSold)
  return bps.mul(toBought).div(10000)
}
