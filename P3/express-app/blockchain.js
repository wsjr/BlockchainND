/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const level = require('level');
const chainDB = './chaindata';
const Block = require("./block");

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain    |
|  ================================================*/

class Blockchain {
   constructor() {
      this.db = level(chainDB);

      let self = this;

      // If DB is empty, add the genesis block.
      self.getBlockHeight().then((height) => {
         // No blocks in the chain. Proceed adding the genesis block.
         if (height === -1) {
            let newBlock = self.createGenesisBlock();
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

            // Adding block object to chain
            self.addLevelDBData(0, JSON.stringify(newBlock));
         }
      });
   }

   // ==========================
   // === DB related methods ===
   // ==========================

   // Add data to levelDB with key/value pair
   addLevelDBData(key, value) {
      this.db.put(key, value, function(err) {
         if (err) return console.log('Block ' + key + ' submission failed', err);
      });
   }

   getLevelDBData(key) {
      this.db.get(key, function(err, value) {
         if (err) return console.log('Block ' + key + ' submission failed', err);
         return value;
      });
   }

   // Add data to levelDB with value
   addDataToLevelDB(value) {
      let i = 0;
      let self = this;
      self.db.createReadStream().on('data', function(data) {
         i++;
      }).on('error', function(err) {
         return console.log('Unable to read data stream!', err)
      }).on('close', function() {
         // Adding block object to chain.
         self.addLevelDBData(i, value);
      });
   }

   // =============================
   // === Block related methods ===
   // =============================

   /**
    * Adds timestamp to the block.
    *
    * @param {Block} block the block on which a timestamp is to be added.
    */
   addTimestamp(block) {
      // UTC timestamp
      block.time = new Date().getTime().toString().slice(0, -3);
   }

   /**
    * Creates genesis block.
    */
   createGenesisBlock() {
      let self = this;
      let genBlock = new Block("First block in the chain - Genesis block");

      // UTC timestamp
      self.addTimestamp(genBlock);

      return genBlock;
   }


   /**
    * Display blocks for debugging.
    */
   displayBlocks() {
      let i = 0;
      let self = this;

      self.db.createReadStream().on('data', function(data) {
         self.getBlock(i++).then((block) => {
            console.log(block);
         }).catch((err) => {
            console.log("Error display blocks");
         });
      }).on('error', function(err) {
         return console.log('Unable to read data stream!', err)
      }).on('close', function() {
         //console.log('addData at Block #' + i);
      });
   }

   /**
    * Add new block with promise.
    * 
    * @param {Block} newBlock block to be added to the blockchain.
    */
   addBlock(newBlock) {
      let self = this;

      return new Promise((resolve, reject) => {

         self.getBlockHeight().then((height) => {
            let newHeight = height + 1;
            // Block height
            newBlock.height = newHeight.toString();
            // UTC timestamp
            self.addTimestamp(newBlock);

            // Non-genesis block
            if (newHeight > 0) {
               self.getBlock(height).then((previousBlock) => {
                  newBlock.previousBlockHash = previousBlock.hash.toString();
                  // Block hash with SHA256 using newBlock and converting to a string
                  newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                  // Adding block object to chain
                  self.addLevelDBData(newHeight, JSON.stringify(newBlock));
                  resolve(true);
               }).catch((err) => {
                  console.log("Error getting the block at " + (height - 1));
                  reject(err);
               });
            } else {
               // Block hash with SHA256 using newBlock and converting to a string
               newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
               // Adding block object to chain
               self.addLevelDBData(newHeight, JSON.stringify(newBlock));
               resolve(true);
            }
         }).catch((err) => {
            console.log("Error getting the block height");
            reject(err);
         });
      });
   }

   /**
    * Add new block without promise.
    * 
    * @param {Block} newBlock block to be added to the blockchain.
    */
   np_addBlock(newBlock) {
      let self = this;

      self.getBlockHeight().then((height) => {
         console.log(">>>height:" + height);

         let newHeight = height + 1;
         // Block height
         newBlock.height = newHeight.toString();
         // UTC timestamp
         self.addTimestamp(newBlock);

         // Non-genesis block
         if (newHeight > 0) {
            self.getBlock(height).then((previousBlock) => {
               newBlock.previousBlockHash = previousBlock.hash.toString();
               // Block hash with SHA256 using newBlock and converting to a string
               newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
               // Adding block object to chain
               self.addLevelDBData(newHeight, JSON.stringify(newBlock));
            }).catch((err) => {
               console.log("Error getting the block at " + (height - 1));
            });
         } else {
            // Block hash with SHA256 using newBlock and converting to a string
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            // Adding block object to chain
            self.addLevelDBData(newHeight, JSON.stringify(newBlock));
         }
      }).catch((err) => {
         console.log("Error getting the block height");
      });
   }

   /**
    * Get block height. Total # of blocks - 1 (excluding the genesis block).
    * 
    * @return {Number} The height of the block.
    */
   getBlockHeight() {
      let i = -1;
      let self = this;

      return new Promise((resolve, reject) => {
         self.db.createReadStream({
            keys: true,
            values: false
         }).on('data', function(data) {
            i++;
         }).on('error', function(err) {
            console.log('Unable to read data stream!', err)
            reject(err);
         }).on('close', function() {
            // Exclude genesis block
            resolve(i);
         });
      });
   }

   /**
    * Get block
    * 
    * @param {Number} key The key or block height of the block.
    * @return {Object} The block at specified key or block height.
    */
   getBlock(key) {
      let self = this;
      return new Promise((resolve, reject) => {
         self.db.get(key, function(err, value) {
            if (err) {
               resolve(null);
            } else {
               resolve(JSON.parse(value));
            }
         });
      })
   }

   /**
    * Validates a block. A block is considered valid if its hash is equal to the hash of the whole block.
    * 
    * @param {Number} blockHeight The block height of the block to be validated.
    * @return {Boolean} The flag indicating whether a block is valid or not.
    */
   validateBlock(blockHeight) {
      let self = this;

      return new Promise((resolve, reject) => {
         self.getBlock(blockHeight).then((block) => {
            if (!block)
               resolve(false);

            // get block hash
            let blockHash = block.hash;
            // remove block hash to test block integrity
            block.hash = '';
            // generate block hash
            let validBlockHash = SHA256(JSON.stringify(block)).toString();
            // Compare
            if (blockHash === validBlockHash) {
               //console.log("Block is valid!")
               resolve(true);
            } else {
               //console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
               resolve(false);
            }
         }).catch((err) => {
            reject(err);
         });
      });
   }

   /**
    * Validates 2 blocks. 2 blocks are considered valid if the first block's hash is the same as the next
    * block's previousBlockHash value.
    * 
    * @param {Number} blockHeight The block height of the block to be validated.
    * @return {Boolean} The flag indicating whether 2 blocks are valid or not.
    */
   validateTwoBlocks(blockHeight) {
      let self = this;

      return new Promise((resolve, reject) => {
         // Current block
         self.getBlock(blockHeight).then((block) => {
            let blockHash = block.hash;

            // Next block
            self.getBlock(blockHeight + 1).then((nextBlock) => {
               let previousHash = nextBlock.previousBlockHash;

               let bValidation = (blockHash === previousHash);
               resolve(bValidation);
            }).catch((err) => {
               reject(err);
            });
         }).catch((err) => {
            reject(err);
         });
      });
   }

   /**
    * Validates blockchain.
    *
    * It displays message if the chain is valid or has encountered invalid blocks.
    */
   validateChain() {
      let self = this;
      let validatePromises = [];
      let promise;

      self.getBlockHeight().then((height) => {
         // Genesis block
         if (height === 0) {
            promise = Promise.resolve(null);

            validatePromises.append(promise);
            // Non-genesis block.
         } else {
            let promiseFactory = function(blockHeight, isLastBlock) {
               return new Promise((resolve, reject) => {
                  self.validateBlock(blockHeight).then((result) => {
                     if (isLastBlock) {
                        // if block is validated, return null. Otherwise, return the height of the block with problem.
                        resolve(result ? null : blockHeight);
                     } else {
                        if (result) {
                           self.validateTwoBlocks(blockHeight).then((validationResult) => {
                              if (validationResult === false) {
                                 // return the height of the block with problem
                                 resolve(blockHeight);
                              } else {
                                 resolve(null);
                              }
                           });
                        } else {
                           // return the height of the block with problem
                           resolve(blockHeight);
                        }
                     }
                  });
               });
            };

            for (let i = 0; i < height; i++) {
               let isLastBlock = i === (height - 1);
               validatePromises.push(promiseFactory(i, isLastBlock));
            }

            console.log("validation promises length:" + validatePromises.length);

            Promise.all(validatePromises).then((results) => {
               // Strip null in the results
               let errorLog = results.filter((obj) => obj);

               if (errorLog.length > 0) {
                  console.log('Block errors = ' + errorLog.length);
                  console.log('Blocks: ' + errorLog);
               } else {
                  console.log('No errors detected');
               }
            });
         }
      });
   }
}

module.exports = Blockchain