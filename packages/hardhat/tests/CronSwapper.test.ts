import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { CronSwapper } from '../types'

describe('CronSwapper', () => {
  let swapper: CronSwapper
  let deployer: SignerWithAddress

  beforeEach(async () => {
    ;[deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('CronSwapper', deployer)
    swapper = (await factory.deploy()) as CronSwapper
  })

  it('should deploy the contract', async () => {
    expect(await swapper.isDeployed()).to.equal(true)
  })
})
