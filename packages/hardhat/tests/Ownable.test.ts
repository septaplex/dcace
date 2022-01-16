import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { MockOwnable } from '../types'

describe('Ownable', function () {
  let user: SignerWithAddress
  let deployer: SignerWithAddress
  let mock: MockOwnable

  beforeEach(async () => {
    ;[deployer, user] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('MockOwnable', deployer)
    mock = (await factory.deploy()) as MockOwnable
  })

  describe('#onlyOwner()', () => {
    describe('ownership management', () => {
      it('should set the deployer as the default owner', async () => {
        expect(await mock.owner()).to.equal(deployer.address)
      })

      it('should be possible to transfer the ownership', async () => {
        const oldOwner = deployer
        const newOwner = user

        expect(await mock.owner()).to.equal(oldOwner.address)

        await expect(mock.connect(oldOwner).transferOwnership(newOwner.address))
          .to.emit(mock, 'TransferOwnership')
          .withArgs(oldOwner.address, newOwner.address)

        expect(await mock.owner()).to.equal(newOwner.address)
      })

      it('should only be possible for the old owner to transfer the ownership', async () => {
        const owner = deployer
        const nonOwner = user

        expect(await mock.owner()).to.equal(owner.address)

        await expect(mock.connect(nonOwner).transferOwnership(nonOwner.address)).to.be.revertedWith('Only Owner')

        expect(await mock.owner()).to.equal(owner.address)
      })
    })

    describe('as a non-owner', () => {
      let owner: SignerWithAddress
      let nonOwner: SignerWithAddress

      beforeEach(() => {
        owner = deployer
        nonOwner = user
      })

      it('should be possible to invoke an unprotected function', async () => {
        await expect(mock.connect(nonOwner).unprotected())
          .to.emit(mock, 'Success')
          .withArgs(nonOwner.address, owner.address)
      })

      it("shouldn't be possible to invoke a protected function", async () => {
        await expect(mock.connect(nonOwner).protected()).to.be.revertedWith('Only Owner')
      })
    })

    describe('as an owner', () => {
      let owner: SignerWithAddress

      beforeEach(() => {
        owner = deployer
      })

      it('should be possible to invoke an unprotected function', async () => {
        await expect(mock.connect(owner).unprotected()).to.emit(mock, 'Success').withArgs(owner.address, owner.address)
      })

      it('should be possible to invoke a protected function', async () => {
        await expect(mock.connect(owner).protected()).to.emit(mock, 'Success').withArgs(owner.address, owner.address)
      })
    })
  })
})
