# Decentralized Star Notary

This project builds a Decentralized Star Notary that allows users to claim ownership of their favorite star in the night sky and deployed on Ethereum's Rinkeby Test Network. Users can register/create stars by providing the following properties: id, name, story, and star coordinates namely ra, dec and mag. In addition, Users can find stars by its ID. This application is built using [Solidity](https://solidity.readthedocs.io/en/v0.4.25/) to built the smart contract, [Truffle Suite](https://truffleframework.com/) to compile, deploy and test smart contract, [Remix](https://remix.ethereum.org/#optimize=false&version=soljson-v0.5.0+commit.1d4f565a.js) to test smart contracts, [OpenZeppelin](https://openzeppelin.org/) to make ERC-721 tokens easily.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- [npm](https://www.npmjs.com/) (Node.js package manager)
- [Truffle](https://truffleframework.com/) to compile, deploy and test smart contracts.
- [OpenZeppelin](https://openzeppelin.org/) to make ERC-721 tokens easily.
- [http-server](https://www.npmjs.com/package/http-server) A command-line http server.
- [Metamask](https://metamask.io/) Ether wallet.

### Install necessary packages

- Install http-server if you don't have it yet.
```
npm install http-server -g
```

- Install Truffle if you don't have it yet.
```
npm install truffle -g
```

- Install Truffle HDWallet Provider
```
npm install --save truffle-hdwallet-provider
```

### Configuring

- Initialize Truffle
```
truffle init
```

- Go to [Infura.io](https://www.infura.io/). 
  - Create an account and a new project.
  - Change the endpoint to **Rinkeby** Test Network.
  - Copy the link to be used later in the truffle.js configuration part.

- Install Metamask and create account.
  - Make sure to point to **Rinkeby** network.
  - To fund your wallet to be used for **Rinkeby** network, go to this (faucet)[https://faucet.rinkeby.io/] and follow the instructions.
  - Get the wallet seed to be used later in the the truffle.js configuration part.

- Go to truffle.js (for Mac or truffle-config.js for Windows).
  - Replace **[Metamask wallet seed goes here]** with the Metamask seed you got from above instructions..
  - Replace **[Infura link goes here]** with the Infura link you got from above instructions.

- Load the index.html
  - Launch the http-server by doing: ***http-server***
  - Open index.html
  - Start registering and querying stars



### Testing, Compile, Deploy smart contracts using Truffle

- Enter Truffle development environment
```
truffle develop
```

- To run unit tests
```
truffle(develop)> test
```

- To compile smart contract
```
truffle(develop)> compile
```

- To migrate for the first time to **Rinkeby** Test Network
```
truffle(develop)> migrate --network Rinkeby
```
or 
- To migrate onwards
```
truffle(develop)> migrate --reset --network Rinkeby
```

- To migrate for the first time to local blockchain
```
truffle(develop)> migrate
```
or 
- To migrate onwards
```
truffle(develop)> migrate --reset
```

## Built With

- [Truffle](https://truffleframework.com/) to compile, deploy and test smart contracts.
- [OpenZeppelin](https://openzeppelin.org/) to make ERC-721 tokens easily.
