var ERC721MintableComplete = artifacts.require('SolnSquareVerifier');
var SquareVerifier = artifacts.require('SquareVerifier');

contract('TestERC721Mintable', accounts => {

    const account_one = accounts[0];
    const account_two = accounts[1];

    describe('match erc721 spec', function () {
        beforeEach(async function () { 
            let square_verfier = await SquareVerifier.new({from: account_one});
            this.contract = await ERC721MintableComplete.new(square_verfier.address, {from: account_one});

            // TODO: mint multiple tokens

            // Mint 3 tokens for account one.
            this.contract.mint(account_one, 1, {from: account_one});
            this.contract.mint(account_one, 2, {from: account_one});
            this.contract.mint(account_one, 3, {from: account_one});
            // Mint 4 tokens for account two.
            this.contract.mint(account_two, 4, {from: account_one});
            this.contract.mint(account_two, 5, {from: account_one});
            this.contract.mint(account_two, 6, {from: account_one});
            this.contract.mint(account_two, 7, {from: account_one});
        })

        it('should return total supply', async function () { 
            let total_supply = await this.contract.totalSupply.call({from: account_one});
            assert.equal(total_supply, 7, "Total supply should be 7");
        })

        it('should get token balance', async function () { 
            let balance_account_one = await this.contract.balanceOf.call(account_one, {from: account_one});
            assert.equal(balance_account_one, 3, "Balance of account one should be 3");

            let balance_account_two = await this.contract.balanceOf.call(account_two, {from: account_one});
            assert.equal(balance_account_two, 4, "Balance of account two should be 4");
        })

        // token uri should be complete i.e: https://s3-us-west-2.amazonaws.com/udacity-blockchain/capstone/1
        it('should return token uri', async function () { 
            let base_token_uri = await this.contract.baseTokenURI.call({from: account_one});

            let token_uri = await this.contract.tokenURI.call(1, {from: account_one});
            let expected_uri = base_token_uri + 1;
            assert.equal(token_uri, expected_uri, "Token URI for token 1 should be " + expected_uri + " but got " + token_uri);

            token_uri = await this.contract.tokenURI.call(2, {from: account_one});
            expected_uri = base_token_uri + 2;
            assert.equal(token_uri, expected_uri, "Token URI for token 2 should be " + expected_uri + " but got " + token_uri);
        })

        it('should NOT transfer token from one owner to another if not owner', async function () { 
            // Transfer token that's NOT owned by account one to account two.
            let transfer_failed = false;
            try {
                await this.contract.transferFrom(account_one, account_two, 4, {from: account_one});
            } catch (e) {
                transfer_failed  = true;
            }
            assert.equal(transfer_failed, true, "Transferring token that's not owned by an account should fail.");
        })

        it('should transfer token from one owner to another', async function () { 
            // Transfer account one token to account two
            await this.contract.transferFrom(account_one, account_two, 3, {from: account_one});

            // Check balance
            let balance_account_one = await this.contract.balanceOf.call(account_one, {from: account_one});
            assert.equal(balance_account_one, 2, "Balance of account one should be 2");

            let balance_account_two = await this.contract.balanceOf.call(account_two, {from: account_one});
            assert.equal(balance_account_two, 5, "Balance of account two should be 5");
        })
    });

    describe('have ownership properties', function () {
        beforeEach(async function () { 
            let square_verfier = await SquareVerifier.new({from: account_one});
            this.contract = await ERC721MintableComplete.new(square_verfier.address, {from: account_one});
        })

        it('should fail when minting when address is not contract owner', async function () { 
            let mint_failed = false;
            try {
                await this.contract.mint(account_one, 1, {from: account_two});
            } catch (e) {
                mint_failed = true;
            }
            assert.equal(mint_failed, true, "Minting when address is not contract owner should fail");
        })

        it('should return contract owner', async function () { 
            let contract_owner = await this.contract._owner.call({from: account_one});
            assert.equal(contract_owner, account_one, "Contract owner should be account one");
        })
    });
})