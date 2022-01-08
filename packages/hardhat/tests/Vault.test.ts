import { ethers } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { IERC20, Vault } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

describe('Vault', () => {
  let vault: Vault
  let usdc: IERC20
  let wbtc: IERC20
  let deployer: SignerWithAddress

  beforeEach(async () => {
    ;[deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('Vault', deployer)
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    vault = (await factory.deploy(usdc.address, wbtc.address)) as Vault
  })

  it('should deploy the contract with the provided token addresses', async () => {
    expect(await vault.from()).to.equal(usdc.address)
    expect(await vault.to()).to.equal(wbtc.address)
  })
})
