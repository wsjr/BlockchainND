var SquareVerifier = artifacts.require('SquareVerifier');
var SolnSquareVerifier = artifacts.require('SolnSquareVerifier');
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var square_gen = require('../../data/proof-1')

contract('TestSolnSquareVerifier', accounts => {
    
    const account_one = accounts[0];
    const account_two = accounts[1];

    describe('Test SolnSquareVerified functions', function () {
        beforeEach(async function () { 
            let square_verifier = await SquareVerifier.new({from: account_one}); 
            this.contract = await SolnSquareVerifier.new(square_verifier.address, {from: account_one});
        });

        // Test if a new solution can be added for contract - SolnSquareVerifier
        it('add new solution', async function () {
            let key = web3.utils.fromAscii("Test Key");
            let solution_added = true; 
            try {
                await this.contract.addSolution(key, account_one, 1);
            } catch (e) {
                solution_added = false;
            }
            assert.equal(solution_added, true, "Solution should have been added.");

            // Check that it fails on attempt to add existing solution
            try {
                await this.contract.addSolution(key, account_one, 1);
            } catch (e) {
                solution_added = false;
            }
            assert.equal(solution_added, false, "Duplicate solution should not have been added.");
        });

        // Test if an ERC721 token can be minted for contract - SolnSquareVerifier
        it('mint token', async function () { 
            let mint_successful = true; 
        
            try {
                await this.contract.mintNewNFT(account_two, 
                                                1,
                                                square_gen.proof.A,
                                                square_gen.proof.A_p,
                                                square_gen.proof.B,
                                                square_gen.proof.B_p,
                                                square_gen.proof.C,
                                                square_gen.proof.C_p,
                                                square_gen.proof.H,
                                                square_gen.proof.K,
                                                square_gen.input);
            } catch (e) {
                mint_successful = false;
            }
            assert.equal(mint_successful, true, "Minting new token should be allowed");

            // Try to mint token with same proof
            try {
                await this.contract.mintNewNFT(account_two, 
                                                2,
                                                square_gen.proof.A,
                                                square_gen.proof.A_p,
                                                square_gen.proof.B,
                                                square_gen.proof.B_p,
                                                square_gen.proof.C,
                                                square_gen.proof.C_p,
                                                square_gen.proof.H,
                                                square_gen.proof.K,
                                                square_gen.input);
            } catch (e) {
                mint_successful = false;
            }
            assert.equal(mint_successful, false, "Minting new token with same proof should NOT be allowed");
        });
    })
});