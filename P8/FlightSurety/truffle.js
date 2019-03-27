var HDWalletProvider = require("truffle-hdwallet-provider");
// Ganache-cli
var mnemonic = "cheap urban inmate empty join forum record saddle celery weapon blame egg";
// Ganache
//var mnemonic = "thought family poverty reunion salad van bacon combine expect level ozone discover"

//var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      provider: function() {
        // Ganache
        //return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
        // Ganache-cli
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 2000000
      //gas: 9999999
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};