/* eslint-disable no-console */

import { HardhatRuntimeEnvironment } from 'hardhat/types'

export default async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const toSell = process.env.TO_SELL_ADDRESS
  const toBuy = process.env.TO_BUY_ADDRESS
  const exchange = process.env.EXCHANGE_ADDRESS

  const { address } = await deploy('CronSwapper', {
    from: deployer,
    args: [toSell, toBuy, exchange],
    log: true
  })

  console.log(`CronSwapper deployed to ${address}`)
}
