/* eslint-disable no-console */

import { HardhatRuntimeEnvironment } from 'hardhat/types'

export default async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const router = process.env.SUSHISWAP_ROUTER_ADDRESS

  const { address } = await deploy('ExchangeSushi', {
    from: deployer,
    args: [router],
    log: true
  })

  console.log(`ExchangeSushi deployed to ${address}`)
}
