/* eslint-disable no-console */

import { HardhatRuntimeEnvironment } from 'hardhat/types'

export default async ({ getNamedAccounts, deployments }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const from = process.env.FROM_ADDRESS
  const to = process.env.TO_ADDRESS

  const { address } = await deploy('Vault', {
    from: deployer,
    args: [from, to],
    log: true
  })

  console.log(`Vault deployed to ${address}`)
}
