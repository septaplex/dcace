import { expect } from 'chai'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { MockReentrancyGuard } from '../types'

describe('ReentrancyGuard', function () {
  let user: SignerWithAddress
  let deployer: SignerWithAddress
  let mock: MockReentrancyGuard

  beforeEach(async () => {
    ;[deployer, user] = await ethers.getSigners()
    const factory = await ethers.getContractFactory('MockReentrancyGuard', deployer)
    mock = (await factory.deploy()) as MockReentrancyGuard
  })

  describe('#nonReentrant()', () => {
    it('should be possible to re-enter an unprotected function', async () => {
      expect(await mock.invokeCount()).to.equal(0)

      await mock.connect(user).unprotected()

      expect(await mock.invokeCount()).to.equal(2)
    })

    it("shouldn't be possible to re-enter a protected function", async () => {
      expect(await mock.invokeCount()).to.equal(0)

      await expect(mock.connect(user).protected()).to.be.revertedWith('Reentrancy')
    })
  })
})
