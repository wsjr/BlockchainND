const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => { 

    let owner = accounts[0]
    let user1 = accounts[1]
    let user2 = accounts[2]
    let randomMaliciousUser = accounts[3]

    let name = 'awesome star!'
    let starStory = "this star was bought for my wife's birthday"
    let ra = "1"
    let dec = "1"
    let mag = "1"
    let starId = 1

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: owner})
    })

    describe('can create a star', () => { 
        it('can create a star and get its name', async function () { 
             await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner})

             let starInfo = await this.contract.starIdToStarInfo(1)
             assert.equal(starInfo[0], 'awesome star!')
        })
    })

    describe('star uniqueness', () => { 
        it('only stars unique stars can be minted', async function() { 
            // first we mint our first star
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner});

            // then we try to mint the same star, and we expect an error
            expectThrow(this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner}));
        })

        it('only stars unique stars can be minted even if their ID is different', async function() { 
            // first we mint our first star
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner});

            // then we try to mint the same star, and we expect an error
            expectThrow(this.contract.createStar(name, starStory, ra, dec, mag, 2, {from: owner}));
        })

        it('minting unique stars does not fail', async function() { 
            for(let i = 0; i < 10; i ++) { 
                let id = i
                let newRa = i.toString()
                let newDec = i.toString()
                let newMag = i.toString()

                await this.contract.createStar(name, starStory, newRa, newDec, newMag, id, {from: user1})

                let starInfo = await this.contract.starIdToStarInfo(id)
                assert.equal(starInfo[0], name)
            }
        })
    })

    describe('buying and selling stars', () => { 

        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1})
        })

        it('user1 can put up their star for sale', async function () { 
            assert.equal(await this.contract.ownerOf(starId), user1)
            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            
            assert.equal(await this.contract.starsForSale(starId), starPrice)
        })

        describe('user2 can buy a star that was put up for sale', () => { 
            beforeEach(async function () { 
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })

            it('user2 is the owner of the star after they buy it', async function() { 
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
                assert.equal(await this.contract.ownerOf(starId), user2)
            })

            it('user2 ether balance changed correctly', async function () { 
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })

    describe('Star Basics ', () => { 
        beforeEach(async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner})
        })

        it('check star existence', async function () { 
            assert.equal(await this.contract.checkIfStarExist(starId), true)
        })

        it('check star info', async function () { 
            let starInfo = await this.contract.starIdToStarInfo(starId);
            assert.equal(starInfo[0], name)
            assert.equal(starInfo[1], starStory)
            assert.equal(starInfo[2], ra)
            assert.equal(starInfo[3], dec)
            assert.equal(starInfo[4], mag)
        })
    })

    describe('Star ERC721-related methods', () => { 
        beforeEach(async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: owner})
        })

        // ownerOf
        it('check star owner', async function () { 
            assert.equal(await this.contract.ownerOf(starId), owner)
        })

        // approve and getApproved
        it('check approve and getApproved owner', async function () { 
            // owner approves user1 for a star
            await this.contract.approve(user1, starId);

            // check if user1 was approved
            assert.equal(await this.contract.getApproved(starId), user1);
        })

        // safeTransferFrom
        it('check safeTransferFrom', async function () { 
            // owner transfers start to user1.
            await this.contract.safeTransferFrom(owner, user1, starId);

            // check if user1 was approved
            assert.equal(await this.contract.ownerOf(starId), user1);
        })

        // SetApprovalForAll and isApprovedForAll
        it('check SetApprovalForAll and isApprovedForAll', async function () { 
            // Gives user1 approval for all transaction for owner.
            await this.contract.setApprovalForAll(user1, true);
            assert.equal(await this.contract.isApprovedForAll(owner, user1), true);
            assert.equal(await this.contract.isApprovedForAll(owner, user2), false);
            assert.equal(await this.contract.isApprovedForAll(owner, randomMaliciousUser), false);

            // Removes user1 approval for all transaction for owner.
            await this.contract.setApprovalForAll(user1, false);
            assert.equal(await this.contract.isApprovedForAll(owner, user1), false);
            assert.equal(await this.contract.isApprovedForAll(owner, user2), false);
            assert.equal(await this.contract.isApprovedForAll(owner, randomMaliciousUser), false);
        })
    })
})

var expectThrow = async function(promise) { 
    try { 
        await promise
    } catch (error) { 
        assert.exists(error)
        return 
    }

    assert.fail('expected an error, but none was found')
}
