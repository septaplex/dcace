import { expect } from 'chai'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { parseUnits } = ethers.utils

import { IERC20, ExchangeSushi } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const SUSHI_V2_PAIR = '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0' // USDC / (W)ETH
const WHALE_ADDRESS = '0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'

describe('ExchangeSushi', function () {
  let usdc: IERC20
  let weth: IERC20
  let exchange: ExchangeSushi
  let deployer: SignerWithAddress
  let user: SignerWithAddress

  beforeEach(async () => {
    ;[deployer] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('ExchangeSushi', deployer)
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    weth = await ethers.getContractAt('IERC20', WETH_ADDRESS)
    exchange = (await factory.deploy(SUSHI_V2_PAIR)) as ExchangeSushi
    await network.provider.send('hardhat_impersonateAccount', [WHALE_ADDRESS])
    user = await ethers.getSigner(WHALE_ADDRESS)
  })

  describe('#swap()', () => {
    it('should be possible to swap tokens (USDC -> (W)ETH)', async () => {
      const from = usdc.address
      const to = weth.address
      const amount = parseUnits('5000', 6)

      const usdcBalanceBeforeSwap = await usdc.balanceOf(user.address)
      const wethBalanceBeforeSwap = await weth.balanceOf(user.address)

      await usdc.connect(user).approve(exchange.address, amount)
      await expect(exchange.connect(user).swap(from, to, amount)).to.emit(exchange, 'Swap').withArgs(from, to, amount)

      const usdcBalanceAfterSwap = await usdc.balanceOf(user.address)
      const wethBalanceAfterSwap = await weth.balanceOf(user.address)

      const usdcSold = usdcBalanceBeforeSwap.sub(usdcBalanceAfterSwap)
      const wethBought = wethBalanceAfterSwap.sub(wethBalanceBeforeSwap)

      expect(usdcSold).to.equal(amount)
      expect(wethBought).to.equal(parseUnits('1.634225990655068318', 18)) // Block #13979500
    })

    it('should be possible to swap tokens ((W)ETH -> USDC)', async () => {
      const from = weth.address
      const to = usdc.address
      const amount = parseUnits('1.5', 18)

      const wethBalanceBeforeSwap = await weth.balanceOf(user.address)
      const usdcBalanceBeforeSwap = await usdc.balanceOf(user.address)

      await weth.connect(user).approve(exchange.address, amount)
      await expect(exchange.connect(user).swap(from, to, amount)).to.emit(exchange, 'Swap').withArgs(from, to, amount)

      const wethBalanceAfterSwap = await weth.balanceOf(user.address)
      const usdcBalanceAfterSwap = await usdc.balanceOf(user.address)

      const wethSold = wethBalanceBeforeSwap.sub(wethBalanceAfterSwap)
      const usdcBought = usdcBalanceAfterSwap.sub(usdcBalanceBeforeSwap)

      expect(wethSold).to.equal(amount)
      expect(usdcBought).to.equal(parseUnits('4561.846848', 6)) // Block #13979500
    })
  })
})
