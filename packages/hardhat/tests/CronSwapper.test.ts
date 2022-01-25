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
  let deployer: SignerWithAddress

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    toSell = usdc.address
    toBuy = wbtc.address
    // Deploy contracts
    ;[deployer] = await ethers.getSigners()
    const swapperFactory = await ethers.getContractFactory('CronSwapper', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    exchange = (await exchangeFactory.deploy()) as MockExchange
    swapper = (await swapperFactory.deploy(toSell, toBuy, exchange.address)) as CronSwapper
    // Impersonate Whale account
    await network.provider.send('hardhat_impersonateAccount', [WHALE_ADDRESS])
    user = await ethers.getSigner(WHALE_ADDRESS)
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
      const endDay = startDay + duration

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
      const endDay = startDay + duration

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
})
