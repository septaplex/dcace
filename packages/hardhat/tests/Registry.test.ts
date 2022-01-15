import { expect } from 'chai'
import { ethers } from 'hardhat'
import { ContractFactory } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { AddressZero } = ethers.constants

import { IERC20, MockExchange, Registry, Vault } from '../types'

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const WBTC_ADDRESS = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

describe('Registry', () => {
  let to: string
  let from: string
  let usdc: IERC20
  let wbtc: IERC20
  let vault: Vault
  let registry: Registry
  let exchange: MockExchange
  let owner: SignerWithAddress
  let deployer: SignerWithAddress
  let vaultFactory: ContractFactory

  beforeEach(async () => {
    usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS)
    wbtc = await ethers.getContractAt('IERC20', WBTC_ADDRESS)
    from = usdc.address
    to = wbtc.address
    // Deploy contracts
    ;[deployer, owner] = await ethers.getSigners()
    const registryFactory = await ethers.getContractFactory('Registry', deployer)
    const exchangeFactory = await ethers.getContractFactory('MockExchange', deployer)
    vaultFactory = await ethers.getContractFactory('Vault', deployer)
    registry = (await registryFactory.deploy()) as Registry
    exchange = (await exchangeFactory.deploy()) as MockExchange
    vault = (await vaultFactory.deploy(from, to, exchange.address)) as Vault
  })

  describe('#addVault()', () => {
    it('should revert when the Vault is the zero address', async () => {
      const vault = AddressZero

      await expect(registry.connect(owner).addVault(vault)).to.be.revertedWith('the zero address')
    })

    it('should revert when the Vault\'s "from" token is the zero address', async () => {
      const from = AddressZero
      const vault = (await vaultFactory.deploy(from, to, exchange.address)) as Vault

      await expect(registry.connect(owner).addVault(vault.address)).to.be.revertedWith('the zero address')
    })

    it('should revert when the Vault\'s "to" token is the zero address', async () => {
      const to = AddressZero
      const vault = (await vaultFactory.deploy(from, to, exchange.address)) as Vault

      await expect(registry.connect(owner).addVault(vault.address)).to.be.revertedWith('the zero address')
    })

    it('should revert when the Vault was already added', async () => {
      await registry.connect(owner).addVault(vault.address)
      await expect(registry.connect(owner).addVault(vault.address)).to.be.revertedWith('already added')
    })

    it('should be possible to add a Vault', async () => {
      const id = ethers.BigNumber.from(0)
      const isEntity = true

      await expect(registry.connect(owner).addVault(vault.address))
        .to.emit(registry, 'AddVault')
        .withArgs(id, vault.address, from, to)
      expect(await registry.nextVaultId()).to.equal(id.add(1))
      expect(await registry.vaults(id)).to.deep.equal([id, vault.address, from, to, isEntity])
      expect(await registry.tokensToVault(from, to)).to.deep.equal(vault.address)
    })
  })

  describe('#removeVault()', () => {
    it("should revert when the Vault doesn't exist", async () => {
      await expect(registry.connect(owner).removeVault(0)).to.be.revertedWith("doesn't exist")
    })

    it('should be possible to remove a Vault', async () => {
      const id = ethers.BigNumber.from(0)

      await registry.connect(owner).addVault(vault.address)
      expect(await registry.nextVaultId()).to.equal(id.add(1))

      await expect(registry.connect(owner).removeVault(id))
        .to.emit(registry, 'RemoveVault')
        .withArgs(id, vault.address, from, to)

      await expect(registry.getVault(id)).to.be.revertedWith("doesn't exist")
    })
  })

  describe('#getVault()', () => {
    it("should revert when the Vault doesn't exist", async () => {
      await expect(registry.connect(owner).getVault(0)).to.be.revertedWith("doesn't exist")
    })

    it('should be possible to get information about a Vault', async () => {
      const id = ethers.BigNumber.from(0)
      const isEntity = true

      await registry.connect(owner).addVault(vault.address)
      expect(await registry.nextVaultId()).to.equal(id.add(1))

      expect(await registry.getVault(id)).to.deep.equal([id, vault.address, from, to, isEntity])
    })
  })
})
