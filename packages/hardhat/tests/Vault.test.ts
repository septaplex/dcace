import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { parseUnits } = ethers.utils

import { IERC20, MockExchange, Vault } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const SHIB_ADDRESS = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'
const WHALE_ADDRESS = '0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'

describe('Vault', () => {
  let usdc: IERC20
  let wbtc: IERC20
  let shib: IERC20
  let vault: Vault
  let exchange: MockExchange
  let deployer: SignerWithAddress
  let user: SignerWithAddress

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    shib = await ethers.getContractAt('IERC20', SHIB_ADDRESS)
    // Deploy contracts
    ;[deployer] = await ethers.getSigners()
    const vaultFactory = await ethers.getContractFactory('Vault', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    exchange = (await exchangeFactory.deploy()) as MockExchange
    vault = (await vaultFactory.deploy(usdc.address, wbtc.address, exchange.address)) as Vault
    // Impersonate Whale account
    await network.provider.send('hardhat_impersonateAccount', [WHALE_ADDRESS])
    user = await ethers.getSigner(WHALE_ADDRESS)
    // Seed `MockExchange` with tokens from Whale
    await usdc.connect(user).transfer(exchange.address, parseUnits('100', 6))
    await wbtc.connect(user).transfer(exchange.address, parseUnits('100', 8))
  })

  it('should deploy the contract with the provided token addresses', async () => {
    expect(await vault.from()).to.equal(usdc.address)
    expect(await vault.to()).to.equal(wbtc.address)
    expect(await vault.exchange()).to.equal(exchange.address)
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

  describe('#withdraw()', () => {
    let amount: BigNumber

    beforeEach(async () => {
      amount = parseUnits('5000', 6)
      await usdc.connect(user).approve(vault.address, amount)
      await vault.connect(user).deposit(amount)
    })

    it('should revert when 0 tokens are withdrawn', async () => {
      const amount = 0

      await expect(vault.connect(user).withdraw(usdc.address, amount)).to.be.revertedWith("can't be 0")
    })

    it('should revert when the wrong token is used', async () => {
      await expect(vault.connect(user).withdraw(shib.address, amount)).to.be.revertedWith('Token not allowed')
    })

    it('should revert when withdrawal amount exceeds balance', async () => {
      amount = amount.add(1)

      await expect(vault.connect(user).withdraw(usdc.address, amount)).to.be.revertedWith('exceeds balance')
    })

    it('should be possible to withdraw tokens', async () => {
      await expect(() => vault.connect(user).withdraw(usdc.address, amount)).to.changeTokenBalances(
        usdc,
        [user, vault],
        [amount, -amount]
      )
      expect(await vault.balances(user.address, usdc.address)).to.equal(0)
    })
  })
})
