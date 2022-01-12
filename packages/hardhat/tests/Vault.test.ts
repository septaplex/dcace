import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { parseUnits } = ethers.utils

import { calcTokenOwnership } from './utils'
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
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let carol: SignerWithAddress
  let keeper: SignerWithAddress

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    shib = await ethers.getContractAt('IERC20', SHIB_ADDRESS)
    // Deploy contracts
    ;[deployer, alice, bob, carol, keeper] = await ethers.getSigners()
    const vaultFactory = await ethers.getContractFactory('Vault', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    exchange = (await exchangeFactory.deploy()) as MockExchange
    vault = (await vaultFactory.deploy(usdc.address, wbtc.address, exchange.address)) as Vault
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

    it('should add the sender to the participants array', async () => {
      const amount = parseUnits('5000', 6)
      await usdc.connect(user).approve(vault.address, amount)
      await vault.connect(user).deposit(amount)

      expect(await vault.participants(0)).to.equal(user.address)
      await expect(vault.participants(1)).to.be.reverted
    })

    it("shouldn't add the sender to the participants array twice", async () => {
      const amount = parseUnits('5000', 6)
      await usdc.connect(user).approve(vault.address, amount)

      await vault.connect(user).deposit(amount.div(2))
      expect(await vault.participants(0)).to.equal(user.address)
      await expect(vault.participants(1)).to.be.reverted

      await vault.connect(user).deposit(amount.div(2))
      expect(await vault.participants(0)).to.equal(user.address)
      await expect(vault.participants(1)).to.be.reverted
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

  describe('#allocate()', () => {
    it('should revert when 0 tokens are allocated', async () => {
      const amountPerDay = 0

      await expect(vault.connect(user).allocate(amountPerDay)).to.be.revertedWith("can't be 0")
    })

    it("should revert when allocated amount exceeds the user's balance", async () => {
      const amountPerDay = 10

      await expect(vault.connect(user).allocate(amountPerDay)).to.be.revertedWith('exceeds balance')
    })

    it('should be possible to create allocations', async () => {
      const amount = 10
      const amountPerDay = 1

      await usdc.connect(user).approve(vault.address, amount)
      await vault.connect(user).deposit(amount)

      await expect(vault.connect(user).allocate(amountPerDay))
        .to.emit(vault, 'Allocate')
        .withArgs(user.address, amountPerDay)
      expect(await vault.amountPerDay(user.address)).to.equal(1)
    })
  })

  describe('#buy()', () => {
    it('should revert when there are no "from" tokens in the Vault', async () => {
      await expect(vault.connect(keeper).buy()).to.be.revertedWith('balance is 0')
    })

    it('should revert when there is nothing to sell', async () => {
      const amount = 10

      await usdc.connect(alice).approve(vault.address, amount)
      await vault.connect(alice).deposit(amount)

      await expect(vault.connect(keeper).buy()).to.be.revertedWith('Nothing to sell')
    })

    describe('when buying "to" tokens', () => {
      let depositAlice: BigNumber
      let depositBob: BigNumber
      let depositCarol: BigNumber

      beforeEach(async () => {
        // Users deposit funds
        depositAlice = parseUnits('100', 6)
        depositBob = parseUnits('100', 6)
        depositCarol = parseUnits('100', 6)

        await usdc.connect(alice).approve(vault.address, depositAlice)
        await vault.connect(alice).deposit(depositAlice)
        await usdc.connect(bob).approve(vault.address, depositBob)
        await vault.connect(bob).deposit(depositBob)
        await usdc.connect(carol).approve(vault.address, depositCarol)
        await vault.connect(carol).deposit(depositCarol)
      })

      it('should distribute acquired "to" tokens according to percentage of "from" token ownership', async () => {
        // Users create allocations
        const allocationAlice = parseUnits('58', 6)
        const allocationBob = parseUnits('16', 6)
        const allocationCarol = parseUnits('76', 6)

        await vault.connect(alice).allocate(allocationAlice)
        await vault.connect(bob).allocate(allocationBob)
        await vault.connect(carol).allocate(allocationCarol)

        // The `MockExchange` we're using returns twice the amount of "from" tokens
        const fromSold = allocationAlice.add(allocationBob).add(allocationCarol)
        const toBought = fromSold.mul(2)

        await expect(vault.connect(keeper).buy()).to.emit(vault, 'Buy').withArgs(fromSold, toBought)

        // Assertions for user balances
        const fromBalanceAlice = await vault.balances(alice.address, usdc.address)
        const fromBalanceBob = await vault.balances(bob.address, usdc.address)
        const fromBalanceCarol = await vault.balances(carol.address, usdc.address)
        const toBalanceAlice = await vault.balances(alice.address, wbtc.address)
        const toBalanceBob = await vault.balances(bob.address, wbtc.address)
        const toBalanceCarol = await vault.balances(carol.address, wbtc.address)

        expect(fromBalanceAlice).to.equal(depositAlice.sub(allocationAlice))
        expect(fromBalanceBob).to.equal(depositBob.sub(allocationBob))
        expect(fromBalanceCarol).to.equal(depositCarol.sub(allocationCarol))

        const ownershipAlice = calcTokenOwnership(allocationAlice, fromSold, toBought)
        const ownershipBob = calcTokenOwnership(allocationBob, fromSold, toBought)
        const ownershipCarol = calcTokenOwnership(allocationCarol, fromSold, toBought)
        expect(toBalanceAlice).to.equal(ownershipAlice)
        expect(toBalanceBob).to.equal(ownershipBob)
        expect(toBalanceCarol).to.equal(ownershipCarol)

        // Assertions for `Vault` balances
        const fromBalanceVault = await usdc.balanceOf(vault.address)
        const toBalanceVault = await wbtc.balanceOf(vault.address)
        expect(fromBalanceVault).to.equal(depositAlice.add(depositBob).add(depositCarol).sub(fromSold))
        expect(toBalanceVault).to.equal(toBought)

        // Summing up the individual user's "to" balances should roughly equal the amount of "to" tokens bought
        expect(toBalanceAlice.add(toBalanceBob).add(toBalanceCarol)).to.be.closeTo(toBought, 1e6)
      })

      it("should exclude users who haven't created allocations", async () => {
        // Users create allocations
        // NOTE: Bob didn't create an allocation
        const allocationAlice = parseUnits('58', 6)
        const allocationCarol = parseUnits('76', 6)

        await vault.connect(alice).allocate(allocationAlice)
        await vault.connect(carol).allocate(allocationCarol)

        // The `MockExchange` we're using returns twice the amount of "from" tokens
        const fromSold = allocationAlice.add(allocationCarol)
        const toBought = fromSold.mul(2)

        await expect(vault.connect(keeper).buy()).to.emit(vault, 'Buy').withArgs(fromSold, toBought)

        // Assertions for user balances
        const fromBalanceAlice = await vault.balances(alice.address, usdc.address)
        const fromBalanceBob = await vault.balances(bob.address, usdc.address)
        const fromBalanceCarol = await vault.balances(carol.address, usdc.address)
        const toBalanceAlice = await vault.balances(alice.address, wbtc.address)
        const toBalanceBob = await vault.balances(bob.address, wbtc.address)
        const toBalanceCarol = await vault.balances(carol.address, wbtc.address)

        expect(fromBalanceAlice).to.equal(depositAlice.sub(allocationAlice))
        expect(fromBalanceBob).to.equal(depositBob)
        expect(fromBalanceCarol).to.equal(depositCarol.sub(allocationCarol))

        const ownershipAlice = calcTokenOwnership(allocationAlice, fromSold, toBought)
        const ownershipBob = 0
        const ownershipCarol = calcTokenOwnership(allocationCarol, fromSold, toBought)
        expect(toBalanceAlice).to.equal(ownershipAlice)
        expect(toBalanceBob).to.equal(ownershipBob)
        expect(toBalanceCarol).to.equal(ownershipCarol)

        // Assertions for `Vault` balances
        const fromBalanceVault = await usdc.balanceOf(vault.address)
        const toBalanceVault = await wbtc.balanceOf(vault.address)
        expect(fromBalanceVault).to.equal(depositAlice.add(depositBob).add(depositCarol).sub(fromSold))
        expect(toBalanceVault).to.equal(toBought)

        // Summing up the individual user's "to" balances should roughly equal the amount of "to" tokens bought
        expect(toBalanceAlice.add(toBalanceBob).add(toBalanceCarol)).to.be.closeTo(toBought, 1e6)
      })

      it('should exclude users who ran out of funds', async () => {
        let fromBalanceAlice: BigNumber
        let fromBalanceBob: BigNumber
        let fromBalanceCarol: BigNumber
        let toBalanceAlice: BigNumber
        let toBalanceBob: BigNumber
        let toBalanceCarol: BigNumber
        let fromBalanceVault: BigNumber
        let toBalanceVault: BigNumber

        // Users create allocations
        // NOTE: Alice allocates all her capital and should run out of funds on day 2
        const allocationAlice = parseUnits('100', 6)
        const allocationBob = parseUnits('41', 6)
        const allocationCarol = parseUnits('23', 6)

        await vault.connect(alice).allocate(allocationAlice)
        await vault.connect(bob).allocate(allocationBob)
        await vault.connect(carol).allocate(allocationCarol)

        // --- Day 1 ---

        // The `MockExchange` we're using returns twice the amount of "from" tokens
        const fromSoldDay1 = allocationAlice.add(allocationBob).add(allocationCarol)
        const toBoughtDay1 = fromSoldDay1.mul(2)

        await expect(vault.connect(keeper).buy()).to.emit(vault, 'Buy').withArgs(fromSoldDay1, toBoughtDay1)

        // Assertions for user balances
        fromBalanceAlice = await vault.balances(alice.address, usdc.address)
        fromBalanceBob = await vault.balances(bob.address, usdc.address)
        fromBalanceCarol = await vault.balances(carol.address, usdc.address)
        toBalanceAlice = await vault.balances(alice.address, wbtc.address)
        toBalanceBob = await vault.balances(bob.address, wbtc.address)
        toBalanceCarol = await vault.balances(carol.address, wbtc.address)

        expect(fromBalanceAlice).to.equal(depositAlice.sub(allocationAlice))
        expect(fromBalanceBob).to.equal(depositBob.sub(allocationBob))
        expect(fromBalanceCarol).to.equal(depositCarol.sub(allocationCarol))

        const ownershipAliceDay1 = calcTokenOwnership(allocationAlice, fromSoldDay1, toBoughtDay1)
        const ownershipBobDay1 = calcTokenOwnership(allocationBob, fromSoldDay1, toBoughtDay1)
        const ownershipCarolDay1 = calcTokenOwnership(allocationCarol, fromSoldDay1, toBoughtDay1)
        expect(toBalanceAlice).to.equal(ownershipAliceDay1)
        expect(toBalanceBob).to.equal(ownershipBobDay1)
        expect(toBalanceCarol).to.equal(ownershipCarolDay1)

        // Assertions for `Vault` balances
        fromBalanceVault = await usdc.balanceOf(vault.address)
        toBalanceVault = await wbtc.balanceOf(vault.address)
        expect(fromBalanceVault).to.equal(depositAlice.add(depositBob).add(depositCarol).sub(fromSoldDay1))
        expect(toBalanceVault).to.equal(toBoughtDay1)

        // Summing up the individual user's "to" balances should roughly equal the amount of "to" tokens bought
        expect(toBalanceAlice.add(toBalanceBob).add(toBalanceCarol)).to.be.closeTo(toBoughtDay1, 1e6)

        // --- Day 2 ---
        // NOTE: Alice ran out of funds after day 1

        // The `MockExchange` we're using returns twice the amount of "from" tokens
        const fromSoldDay2 = allocationBob.add(allocationCarol)
        const toBoughtDay2 = fromSoldDay2.mul(2)

        await expect(vault.connect(keeper).buy()).to.emit(vault, 'Buy').withArgs(fromSoldDay2, toBoughtDay2)

        // Assertions for user balances
        fromBalanceAlice = await vault.balances(alice.address, usdc.address)
        fromBalanceBob = await vault.balances(bob.address, usdc.address)
        fromBalanceCarol = await vault.balances(carol.address, usdc.address)
        toBalanceAlice = await vault.balances(alice.address, wbtc.address)
        toBalanceBob = await vault.balances(bob.address, wbtc.address)
        toBalanceCarol = await vault.balances(carol.address, wbtc.address)

        expect(fromBalanceAlice).to.equal(depositAlice.sub(allocationAlice))
        expect(fromBalanceBob).to.equal(depositBob.sub(allocationBob).sub(allocationBob))
        expect(fromBalanceCarol).to.equal(depositCarol.sub(allocationCarol).sub(allocationCarol))

        const ownershipBobDay2 = calcTokenOwnership(allocationBob, fromSoldDay2, toBoughtDay2)
        const ownershipCarolDay2 = calcTokenOwnership(allocationCarol, fromSoldDay2, toBoughtDay2)
        expect(toBalanceAlice).to.equal(ownershipAliceDay1)
        expect(toBalanceBob).to.equal(ownershipBobDay1.add(ownershipBobDay2))
        expect(toBalanceCarol).to.equal(ownershipCarolDay1.add(ownershipCarolDay2))

        // Assertions for `Vault` balances
        fromBalanceVault = await usdc.balanceOf(vault.address)
        toBalanceVault = await wbtc.balanceOf(vault.address)
        expect(fromBalanceVault).to.equal(
          depositAlice.add(depositBob).add(depositCarol).sub(fromSoldDay1).sub(fromSoldDay2)
        )
        expect(toBalanceVault).to.equal(toBoughtDay1.add(toBoughtDay2))

        // Summing up the individual user's "to" balances should roughly equal the amount of "to" tokens bought
        expect(toBalanceAlice.add(toBalanceBob).add(toBalanceCarol)).to.be.closeTo(toBoughtDay1.add(toBoughtDay2), 1e6)
      })
    })
  })
})
