// define a variable to import the <Verifier> or <renamedVerifier> solidity contract generated by Zokrates
var SquareVerifier = artifacts.require('SquareVerifier');
var square_gen = require('../../data/proof-1')

contract('TestSquareVerifier', accounts => {
    const account_one = accounts[0];

    // Test verification with correct proof
    // - use the contents from proof.json generated from zokrates steps
    describe('Test verification', function () {
        beforeEach(async function () {  
            this.contract = await SquareVerifier.new({from: account_one});
        });

        it('with correct proof', async function () { 
            let result = await this.contract.verifyTx.call(square_gen.proof.A,
                                                            square_gen.proof.A_p,
                                                            square_gen.proof.B,
                                                            square_gen.proof.B_p,
                                                            square_gen.proof.C,
                                                            square_gen.proof.C_p,
                                                            square_gen.proof.H,
                                                            square_gen.proof.K,
                                                            square_gen.input,
                                                            {from: account_one});
            assert.equal(result, true, "verifyTx should have returned true with correct proof");
        });

        it('with incorrect proof - Used [8,2] as input as opposed to [9,1]', async function () { 
            let result = await this.contract.verifyTx.call(square_gen.proof.A, 
                                                            square_gen.proof.A_p, 
                                                            square_gen.proof.B, 
                                                            square_gen.proof.B_p, 
                                                            square_gen.proof.C, 
                                                            square_gen.proof.C_p, 
                                                            square_gen.proof.H, 
                                                            square_gen.proof.K, 
                                                            [8, 2], 
                                                            {from: account_one});
            assert.equal(result, false, "verifyTx should have returned false with incorrect proof");
        });

        it('with incorrect proof - Used C in A', async function () { 
            let result = await this.contract.verifyTx.call(square_gen.proof.C, 
                                                            square_gen.proof.A_p, 
                                                            square_gen.proof.B, 
                                                            square_gen.proof.B_p, 
                                                            square_gen.proof.C, 
                                                            square_gen.proof.C_p, 
                                                            square_gen.proof.H, 
                                                            square_gen.proof.K, 
                                                            [8, 2], 
                                                            {from: account_one});
            assert.equal(result, false, "verifyTx should have returned false with incorrect proof");
        });
    });
});
