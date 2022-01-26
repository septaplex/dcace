import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { IERC20, CronSwapper, MockExchange } from '../types'

const { parseUnits } = ethers.utils

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const WHALE_ADDRESS = '0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'

const SECONDS_PER_DAY = 24 * 60 * 60

async function getCurrentDay() {
  const blockNumber = await ethers.provider.getBlockNumber()
  const block = await ethers.provider.getBlock(blockNumber)
  return Math.floor(block.timestamp / SECONDS_PER_DAY)
}

describe('CronSwapper', () => {
  let usdc: IERC20
  let wbtc: IERC20
  let toSell: string
  let toBuy: string
  let swapper: CronSwapper
  let exchange: MockExchange
  let user: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress
  let keeper: SignerWithAddress
  let deployer: SignerWithAddress

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    toSell = usdc.address
    toBuy = wbtc.address
    // Deploy contracts
    ;[deployer, alice, bob, carol, keeper] = await ethers.getSigners()
    const swapperFactory = await ethers.getContractFactory('CronSwapper', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    exchange = (await exchangeFactory.deploy()) as MockExchange
    swapper = (await swapperFactory.deploy(toSell, toBuy, exchange.address)) as CronSwapper
    // Impersonate Whale account
    await network.provider.send('hardhat_impersonateAccount', [WHALE_ADDRESS])
    user = await ethers.getSigner(WHALE_ADDRESS)
    // Seed `MockExchange` with tokens from Whale
    await usdc.connect(user).transfer(exchange.address, parseUnits('1000', 6))
    await wbtc.connect(user).transfer(exchange.address, parseUnits('1000', 8))
    // Fund `alice`, `bob` and `carol` with USDC from Whale
    await usdc.connect(user).transfer(alice.address, parseUnits('100', 6))
    await usdc.connect(user).transfer(bob.address, parseUnits('100', 6))
    await usdc.connect(user).transfer(carol.address, parseUnits('100', 6))
  })

  it('should deploy the contract with the provided addresses', async () => {
    expect(await swapper.toSell()).to.equal(toSell)
    expect(await swapper.toBuy()).to.equal(toBuy)
    expect(await swapper.exchange()).to.equal(exchange.address)
  })

  it('should set the last execution to today when deploying the contract', async () => {
    const today = await getCurrentDay()

    expect(await swapper.lastExecution()).to.equal(today)
  })

  describe('#enter()', () => {
    it('should revert when the amount is 0', async () => {
      const amount = parseUnits('0', 6)
      const duration = 7

      await expect(swapper.connect(user).enter(amount, duration)).to.be.revertedWith("Amount can't be 0")
    })

    it('should revert when the duration is 0', async () => {
      const amount = parseUnits('100', 6)
      const duration = 0

      await expect(swapper.connect(user).enter(amount, duration)).to.be.revertedWith("Duration can't be 0")
    })

    it('should be possible to enter and create an allocation', async () => {
      // Contract deployment was today --> time-travel to one day in the future
      await network.provider.send('evm_increaseTime', [SECONDS_PER_DAY])
      await network.provider.send('evm_mine')

      const today = await getCurrentDay()

      const amount = parseUnits('100', 6)
      const duration = 7

      const total = amount.mul(duration)
      await usdc.connect(user).approve(swapper.address, total)

      const startDay = today
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1

      await expect(swapper.connect(user).enter(amount, duration))
        .to.emit(swapper, 'Enter')
        .withArgs(0, user.address, amount, startDay, endDay)

      expect(await usdc.balanceOf(swapper.address)).to.equal(total)
      expect(await swapper.dailyAmount()).to.equal(amount)
      expect(await swapper.removeAmount(endDay)).to.equal(amount)
      expect(await swapper.nextAllocationId()).to.equal(1)
      expect(await swapper.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address
      ])
    })

    it('should increase the start day by one if the last execution was today', async () => {
      // Contract deployment was today --> time of last execution is today
      const today = await getCurrentDay()

      const amount = parseUnits('100', 6)
      const duration = 7

      const total = amount.mul(duration)
      await usdc.connect(user).approve(swapper.address, total)

      const startDay = today + 1
      // Subtracting 1 given that we'll also swap on the `startDay`
      const endDay = startDay + duration - 1

      await expect(swapper.connect(user).enter(amount, duration))
        .to.emit(swapper, 'Enter')
        .withArgs(0, user.address, amount, startDay, endDay)

      expect(await usdc.balanceOf(swapper.address)).to.equal(total)
      expect(await swapper.dailyAmount()).to.equal(amount)
      expect(await swapper.removeAmount(endDay)).to.equal(amount)
      expect(await swapper.nextAllocationId()).to.equal(1)
      expect(await swapper.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address
      ])
    })

    it('should set the end day to the start day if the duration is 1 day', async () => {
      await network.provider.send('evm_increaseTime', [SECONDS_PER_DAY])
      await network.provider.send('evm_mine')

      const today = await getCurrentDay()

      const amount = parseUnits('100', 6)
      const duration = 1

      const total = amount.mul(duration)
      await usdc.connect(user).approve(swapper.address, total)

      const startDay = today
      const endDay = startDay

      await expect(swapper.connect(user).enter(amount, duration))
        .to.emit(swapper, 'Enter')
        .withArgs(0, user.address, amount, startDay, endDay)

      expect(await usdc.balanceOf(swapper.address)).to.equal(total)
      expect(await swapper.dailyAmount()).to.equal(amount)
      expect(await swapper.removeAmount(endDay)).to.equal(amount)
      expect(await swapper.nextAllocationId()).to.equal(1)
      expect(await swapper.allocations(0)).to.deep.equal([
        BigNumber.from(0),
        amount,
        BigNumber.from(startDay),
        BigNumber.from(endDay),
        user.address
      ])
    })
  })

  describe('#swap()', () => {
    it('should revert when the function was already called that day', async () => {
      await expect(swapper.connect(keeper).swap()).to.be.revertedWith('Function already called today')
    })

    it('should revert when there is nothing to sell', async () => {
      await network.provider.send('evm_increaseTime', [SECONDS_PER_DAY])
      await network.provider.send('evm_mine')

      await expect(swapper.connect(keeper).swap()).to.be.revertedWith('Nothing to sell')
    })

    it('should be possible perform a swap', async () => {
      // Approval + Enter
      const duration = 7
      const amount = parseUnits('100', 6)
      const total = amount.mul(duration)

      await usdc.connect(user).approve(swapper.address, total)
      await expect(swapper.connect(user).enter(amount, duration))

      // Time-travel 1 Day
      await network.provider.send('evm_increaseTime', [SECONDS_PER_DAY])
      await network.provider.send('evm_mine')

      // NOTE: The `MockExchange` we're using will always return 2x `toBuy` for every `toSell`
      const toSellSold = amount
      const toBuyBought = amount.mul(2)
      const toBuyPrice = 2
      await expect(swapper.connect(keeper).swap())
        .to.emit(swapper, 'Swap')
        .withArgs(toSellSold, toBuyBought, toBuyPrice)

      const today = await getCurrentDay()
      expect(await swapper.lastExecution()).to.equal(today)
      expect(await swapper.dailyAmount()).to.equal(amount)
      expect(await swapper.toBuyPriceCumulative(today)).to.equal(toBuyPrice)
    })

    it('should support skipped days between executions', async () => {
      // Alice: Approval + Enter
      const durationAlice = 3
      const amountAlice = parseUnits('30', 6)
      const totalAlice = amountAlice.mul(durationAlice)

      await usdc.connect(alice).approve(swapper.address, totalAlice)
      await swapper.connect(alice).enter(amountAlice, durationAlice)

      // Bob: Approval + Enter
      const durationBob = 2
      const amountBob = parseUnits('20', 6)
      const totalBob = amountBob.mul(durationBob)

      await usdc.connect(bob).approve(swapper.address, totalBob)
      await swapper.connect(bob).enter(amountBob, durationBob)

      // Carol: Approval + Enter
      const durationCarol = 1
      const amountCarol = parseUnits('10', 6)
      const totalCarol = amountCarol.mul(durationCarol)

      await usdc.connect(carol).approve(swapper.address, totalCarol)
      await swapper.connect(carol).enter(amountCarol, durationCarol)

      // Check the planned amount removals
      const tomorrow = (await getCurrentDay()) + 1
      expect(await swapper.removeAmount(tomorrow)).to.equal(amountCarol)
      expect(await swapper.removeAmount(tomorrow + 1)).to.equal(amountBob)
      expect(await swapper.removeAmount(tomorrow + 2)).to.equal(amountAlice)

      // Time-travel 3 Days
      await network.provider.send('evm_increaseTime', [3 * SECONDS_PER_DAY])
      await network.provider.send('evm_mine')

      // NOTE: The `MockExchange` we're using will always return 2x `toBuy` for every `toSell`
      const toSellSold = amountAlice.add(amountBob.add(amountCarol))
      const toBuyBought = toSellSold.mul(2)
      const toBuyPrice = 2
      await expect(swapper.connect(keeper).swap())
        .to.emit(swapper, 'Swap')
        .withArgs(toSellSold, toBuyBought, toBuyPrice)

      const today = await getCurrentDay()
      expect(await swapper.lastExecution()).to.equal(today)
      expect(await swapper.dailyAmount()).to.equal(0)
      expect(await swapper.toBuyPriceCumulative(today)).to.equal(toBuyPrice)
    })
  })
})