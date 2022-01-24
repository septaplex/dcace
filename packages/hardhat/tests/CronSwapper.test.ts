import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { IERC20, CronSwapper, MockExchange } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

describe('CronSwapper', () => {
  let usdc: IERC20
  let wbtc: IERC20
  let toSell: string
  let toBuy: string
  let swapper: CronSwapper
  let exchange: MockExchange
  let deployer: SignerWithAddress

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    toSell = usdc.address
    toBuy = wbtc.address
    ;[deployer] = await ethers.getSigners()
    const swapperFactory = await ethers.getContractFactory('CronSwapper', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    exchange = (await exchangeFactory.deploy()) as MockExchange
    swapper = (await swapperFactory.deploy(toSell, toBuy, exchange.address)) as CronSwapper
  })

  it('should deploy the contract with the provided addresses', async () => {
    expect(await swapper.toSell()).to.equal(toSell)
    expect(await swapper.toBuy()).to.equal(toBuy)
    expect(await swapper.exchange()).to.equal(exchange.address)
  })
})
