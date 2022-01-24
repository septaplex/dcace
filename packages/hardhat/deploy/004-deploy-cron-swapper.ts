/* eslint-disable no-console */

import { HardhatRuntimeEnvironment } from 'hardhat/types'

export default async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const { address } = await deploy('CronSwapper', {
    from: deployer,
    args: [],
    log: true
  })

  console.log(`CronSwapper deployed to ${address}`)
}
