import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { Registry } from '../types'

describe('Registry', () => {
  let registry: Registry
  let deployer: SignerWithAddress

  beforeEach(async () => {
    ;[deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('Registry', deployer)
    registry = (await factory.deploy()) as Registry
  })

  it('should deploy the contract', async () => {
    expect(await registry.isDeployed()).to.equal(true)
  })
})
