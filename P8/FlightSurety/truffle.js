var HDWalletProvider = require("truffle-hdwallet-provider");
// Ganache-cli
//var mnemonic = "juice face spirit since interest mercy order pear glue skate retreat say";
// Ganache
var mnemonic = "thought family poverty reunion salad van bacon combine expect level ozone discover"

//var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 6721975
    },
    developmentOld: {
      provider: function() {
        // Ganache
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
        // Ganache-cli
        //return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      gas:6721975
      //gas: 5000000
      //gas: 9999999
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};