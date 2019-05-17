// export INFURA_KEY="41210f21e7e3429fb712b68457963210"
// export MNEMONIC=""
// export OWNER_ADDRESS=""
// export CONTRACT_ADDRESS=""
// export NETWORK="rinkeby"

const SolnSquareVerifier = require("../eth-contracts/build/contracts/SolnSquareVerifier");
const SolnSquareVerifier_ABI = SolnSquareVerifier.abi;

const aProofs = [
    require("../data/proof-1")/*,
    require("../data/proof-2"),
    require("../data/proof-3"),
    require("../data/proof-4"),
    require("../data/proof-5"),
    require("../data/proof-6"),
    require("../data/proof-7"),
    require("../data/proof-8"),
    require("../data/proof-9"),
    require("../data/proof-10")*/
];

const NUM_TO_MINT = aProofs.length;

const HDWalletProvider = require("truffle-hdwallet-provider");
const web3 = require('web3');
const MNEMONIC = process.env.MNEMONIC;
const INFURA_KEY = process.env.INFURA_KEY;
const OWNER_ADDRESS = process.env.OWNER_ADDRESS;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const NETWORK = process.env.NETWORK;

if (!MNEMONIC || !INFURA_KEY || !OWNER_ADDRESS || !CONTRACT_ADDRESS || !NETWORK) {
  console.error("Please set a mnemonic, infura key, owner, network, and contract address.");
  return
}

console.log("mnemonic:" + MNEMONIC);
console.log("infura key:" + INFURA_KEY);
console.log("owner address:" + OWNER_ADDRESS);
console.log("contract address:" + CONTRACT_ADDRESS);
console.log("network:" + NETWORK);
console.log("number to token to mint:" + NUM_TO_MINT);

async function main() {
    const provider = new HDWalletProvider(MNEMONIC, `https://rinkeby.infura.io/v3/${INFURA_KEY}`);
    const web3Instance = new web3(provider);
  
    const contract = new web3Instance.eth.Contract(SolnSquareVerifier_ABI, CONTRACT_ADDRESS, { gasLimit: "1000000" });
    aProofs.forEach(async function(proof, index) {
      try {
        const result = await contract.methods.mintNewNFT(OWNER_ADDRESS, index, proof.proof.A, proof.proof.A_p, proof.proof.B, proof.proof.B_p, proof.proof.C, proof.proof.C_p, proof.proof.H, proof.proof.K, proof.input).send({ from: OWNER_ADDRESS, gas: 3000000 });
        console.log("Minted . Transaction: " + result.transactionHash);
      } catch (e) {
        console.log("Error:" + e.message);
      }
    });
  }
  
  main();