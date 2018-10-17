/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const level = require('level');
const mempoolDB = './mempooldata';


const VALID_DURATION_IN_MEMPOOL_MS = 300000;
const MILLISECONDS_TO_SECOND = 1/1000;

//const Block = require("./block");

/* ===== Mempool Class ========================
|  Class with a constructor for new mempool    |
|  ============================================*/

class Mempool {
   constructor() {
      this.db = level(mempoolDB);
   }

   getTimestamp() {
      // UTC timestamp
      return new Date().getTime().toString().slice(0, -3);
   }

   getValidationWindow(sTimestamp) {
      let nTimestamp = parseInt(sTimestamp);
      let nDuration = getTimestamp() - nTimestamp;
      return (VALID_DURATION_IN_MEMPOOL_MS - nDuration);
   }

   isTimestampValid(sTimestamp) {
      return getValidationWindow(sTimestamp) > 0;
   }

   // ==========================
   // === DB related methods ===
   // ==========================

   cleanLevelDBData() {
      let aOperations = [];
      self.db.createReadStream().on('data', function(data) {
         if (isTimestampValid(data.value) === false) {
            aOperations.push({type: 'del', key: data.key});
         }
      }).on('error', function(err) {
         return console.log('Unable to read data stream!', err)
      }).on('close', function() {
         if (aExpiredEntries.length > 0) {
            self.db.batch(aOperations, function(err){
               if (err) return console.log('Unable to do batch delete!', err)
               console.log('Batch delete removed ' + aExpiredEntries.length + ' entries!');
            })
         }
      });
   }

   // Add data to levelDB with key/value pair
   addLevelDBData(key, value) {
      cleanLevelDBData();

      this.db.put(key, value, function(err) {
         if (err) return console.log('Mempool ' + key + ' submission failed', err);
      });
   }

   getLevelDBData(key) {
      cleanLevelDBData();

      this.db.get(key, function(err, value) {
         if (err) return console.log('Mempool ' + key + ' submission failed', err);
         return value;
      });
   }

   // // Add data to levelDB with value
   // addDataToLevelDB(value) {
   //    let i = 0;
   //    let self = this;
   //    self.db.createReadStream().on('data', function(data) {
   //       i++;
   //    }).on('error', function(err) {
   //       return console.log('Unable to read data stream!', err)
   //    }).on('close', function() {
   //       // Adding entry to mempool.
   //       self.addLevelDBData(i, value);
   //    });
   // }

   // =============================
   // === Block related methods ===
   // =============================

   /**
    * Gets timestamp.
    *
    * @param {String} The current timestamp.
    */
   getTimestamp() {
      // UTC timestamp
      return new Date().getTime().toString().slice(0, -3);
   }

   
   // /**
   //  * Display blocks for debugging.
   //  */
   // displayBlocks() {
   //    let i = 0;
   //    let self = this;

   //    self.db.createReadStream().on('data', function(data) {
   //       self.getBlock(i++).then((block) => {
   //          console.log(block);
   //       }).catch((err) => {
   //          console.log("Error display blocks");
   //       });
   //    }).on('error', function(err) {
   //       return console.log('Unable to read data stream!', err)
   //    }).on('close', function() {
   //       //console.log('addData at Block #' + i);
   //    });
   // }

   /**
    * Add new block with promise.
    * 
    * @param {Block} newBlock block to be added to the blockchain.
    */
   // addBlock(newBlock) {
   //    let self = this;

   //    return new Promise((resolve, reject) => {

   //       self.getBlockHeight().then((height) => {
   //          let newHeight = height + 1;
   //          // Block height
   //          newBlock.height = newHeight.toString();
   //          // UTC timestamp
   //          self.addTimestamp(newBlock);

   //          // Non-genesis block
   //          if (newHeight > 0) {
   //             self.getBlock(height).then((previousBlock) => {
   //                newBlock.previousBlockHash = previousBlock.hash.toString();
   //                // Block hash with SHA256 using newBlock and converting to a string
   //                newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
   //                // Adding block object to chain
   //                self.addLevelDBData(newHeight, JSON.stringify(newBlock));
   //                resolve(true);
   //             }).catch((err) => {
   //                console.log("Error getting the block at " + (height - 1));
   //                reject(err);
   //             });
   //          } else {
   //             // Block hash with SHA256 using newBlock and converting to a string
   //             newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
   //             // Adding block object to chain
   //             self.addLevelDBData(newHeight, JSON.stringify(newBlock));
   //             resolve(true);
   //          }
   //       }).catch((err) => {
   //          console.log("Error getting the block height");
   //          reject(err);
   //       });
   //    });
   // }

   // /**
   //  * Add new block without promise.
   //  * 
   //  * @param {Block} newBlock block to be added to the blockchain.
   //  */
   // np_addBlock(newBlock) {
   //    let self = this;

   //    self.getBlockHeight().then((height) => {
   //       console.log(">>>height:" + height);

   //       let newHeight = height + 1;
   //       // Block height
   //       newBlock.height = newHeight.toString();
   //       // UTC timestamp
   //       self.addTimestamp(newBlock);

   //       // Non-genesis block
   //       if (newHeight > 0) {
   //          self.getBlock(height).then((previousBlock) => {
   //             newBlock.previousBlockHash = previousBlock.hash.toString();
   //             // Block hash with SHA256 using newBlock and converting to a string
   //             newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
   //             // Adding block object to chain
   //             self.addLevelDBData(newHeight, JSON.stringify(newBlock));
   //          }).catch((err) => {
   //             console.log("Error getting the block at " + (height - 1));
   //          });
   //       } else {
   //          // Block hash with SHA256 using newBlock and converting to a string
   //          newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
   //          // Adding block object to chain
   //          self.addLevelDBData(newHeight, JSON.stringify(newBlock));
   //       }
   //    }).catch((err) => {
   //       console.log("Error getting the block height");
   //    });
   // }

   // /**
   //  * Get block height. Total # of blocks - 1 (excluding the genesis block).
   //  * 
   //  * @return {Number} The height of the block.
   //  */
   // getBlockHeight() {
   //    let i = -1;
   //    let self = this;

   //    return new Promise((resolve, reject) => {
   //       self.db.createReadStream({
   //          keys: true,
   //          values: false
   //       }).on('data', function(data) {
   //          i++;
   //       }).on('error', function(err) {
   //          console.log('Unable to read data stream!', err)
   //          reject(err);
   //       }).on('close', function() {
   //          // Exclude genesis block
   //          resolve(i);
   //       });
   //    });
   // }

   /**
    * Add new entry with promise.
    * 
    * @param {Block} newBlock block to be added to the blockchain.
    */
   addEntry(sAddress) {
      let self = this;

      return new Promise((resolve, reject) => {
         let sTimestamp = self.getTimestamp();
         try {
            self.cleanLevelDBData();

            self.db.put(key, value, function(err) {
               if (err) {
                  reject(err);
               } else {
                 resolve({
                   address: key,
                   timestamp: JSON.parse(value)
                 
               });
         } catch (err) {
            reject(err);
         }
      });
   }

   /**
    * Get entry
    * 
    * @param {String} address The wallet address
    * @return {String} The timestamp of the address in the mempool.
    */
   getEntry(sAddress) {
      let self = this;
      return new Promise((resolve, reject) => {
         try {
            self.cleanLevelDBData();

            self.db.get(sAddress, function(err, value) {
               if (err) {
                  reject(err);
               } else {
                 resolve({
                   address: sAddress,
                   timestamp: JSON.parse(value)
                 });
               }
            });
         } catch (err) {
            reject(err);
         }
      })
   }
}

module.exports = Mempool