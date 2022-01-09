import { expect } from 'chai'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { parseUnits } = ethers.utils

import { IERC20, Vault } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const WHALE_ADDRESS = '0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'

describe('Vault', () => {
  let vault: Vault
  let usdc: IERC20
  let wbtc: IERC20
  let deployer: SignerWithAddress
  let user: SignerWithAddress

  beforeEach(async () => {
    ;[deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('Vault', deployer)
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    vault = (await factory.deploy(usdc.address, wbtc.address)) as Vault
    await network.provider.send('hardhat_impersonateAccount', [WHALE_ADDRESS])
    user = await ethers.getSigner(WHALE_ADDRESS)
  })

  it('should deploy the contract with the provided token addresses', async () => {
    expect(await vault.from()).to.equal(usdc.address)
    expect(await vault.to()).to.equal(wbtc.address)
  })

  describe('#deposit()', () => {
    it('should revert when 0 tokens are deposited', async () => {
      const amount = 0
      await usdc.connect(user).approve(vault.address, amount)

      await expect(vault.connect(user).deposit(amount)).to.be.revertedWith("can't be 0")
    })

    it('should be possible to deposit tokens', async () => {
      const amount = parseUnits('5000', 6)
      await usdc.connect(user).approve(vault.address, amount)

      await expect(() => vault.connect(user).deposit(amount)).to.changeTokenBalances(
        usdc,
        [user, vault],
        [-amount, amount]
      )
      expect(await vault.balances(user.address, usdc.address)).to.equal(amount)
    })
  })
})
