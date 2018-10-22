const level = require('level');
const mempoolDB = './libs/mempooldata';


// 300 seconds allowed to stay in the mempool.
const VALID_DURATION_IN_MEMPOOL_MS = 300000;
const MILLISECONDS_TO_SECOND = 1/1000;


/* ===== Mempool Class ========================
|  Class with a constructor for new mempool    |
|  ============================================*/

class Mempool {
   constructor() {
      this.db = level(mempoolDB, { valueEncoding : 'json' });
   }

   /**
    * Get the "now" timestamp.
    */
   getNowTimestamp() {
      // UTC timestamp
      return new Date().getTime().toString();
   }

   /**
    * Get the validation window or time left in milliseconds since wallet address was validated.
    */
   getValidationWindow(sTimestamp) {
      let nDuration = parseInt(this.getNowTimestamp()) - parseInt(sTimestamp);
      return (VALID_DURATION_IN_MEMPOOL_MS - nDuration);
   }

   /**
    * Get the validation window in seconds.
    */
   getValidationWindowInSeconds(sTimestamp) {
      return this.getValidationWindow(sTimestamp) * MILLISECONDS_TO_SECOND;
   }

   /**
    * Deterimines if timestamp is still valid.
    */
   isTimestampValid(sTimestamp) {
      return this.getValidationWindow(sTimestamp) > 0;
   }

   // ====================================================
   // === Address+Timestamp validation related methods ===
   //  ====================================================

   /**
    *  DB has entries in this format:
    *
    *   wallet address: {
    *       timestamp: [timestamp],
    *       signature: [signature] 
    *   }
    */

   /**
    * Removes entries with timestamp passed the validation window.
    */
   removeExpiredEntries() {
      let self = this;
      let aDeleteOps = [];
      let aInvalidSignatures = [];

      return new Promise((resolve, reject) => {
         self.db.createReadStream().on('data', function(data) {
            if (self.isTimestampValid(data.value.timestamp) === false) {
               console.log("timestamp not valid for " + data.key);
               aDeleteOps.push({type: 'del', key: data.key});
            }
         }).on('error', function(err) {
            console.log('Unable to read data stream!', err);
            reject(err);
         }).on('close', function() {
            if (aDeleteOps.length > 0) {
               self.db.batch(aDeleteOps, function(err){
                  if (err) {
                     console.log('Unable to do batch delete!', err);
                     reject(err);
                  } else {
                     console.log('Batch delete removed ' + aDeleteOps.length + ' entries!');
                     resolve(aDeleteOps.length);
                  }
               })
            }
            resolve(0);
         });
      });
   }

   /**
    * Add entry to the level DB using wallet address as key and timestamp .
    */
   addEntry(sAddress) {
      let self = this;
      return new Promise((resolve, reject) => {
         // Removed expired entries
         self.removeExpiredEntries().then((aDeleteOps) => {
            let sTimestamp = self.getNowTimestamp();
            let oInfo = {timestamp: sTimestamp};
            self.db.put(sAddress, oInfo, function(err) {
               if (err) {
                  console.log('addEntry: Mempool ' + sAddress + ' submission failed', err);
                  resolve(null);
               } else {
                  // return the info.
                  console.log("oInfo:" + oInfo);
                  resolve(oInfo);
               }
            });
         }).catch((err) => {
            console.log("Error adding entry in the mempool!");
            reject(err);
         });
      })
   }

   /**
    * Update entry to the level DB using wallet address as key and signature.
    */
   updateSignatureEntry(sAddress, sSignature) {
      let self = this;
      return new Promise((resolve, reject) => {
         // Removed expired entries
         self.removeExpiredEntries().then((aDeleteOps) => {
            self.db.get(sAddress, function(err, value) {
               if (err) {
                  console.log('updateSignatureEntry, getEntry: Mempool ' + sAddress + ' submission failed', err);
                  resolve(null);
               } else {
                  let oInfo = value;
                  // Add the signature
                  oInfo.signature = sSignature;

                  self.db.put(sAddress, oInfo, function(err) {
                     if (err) {
                        console.log('updateSignatureEntry, Updating: Mempool ' + sAddress + ' submission failed', err);
                        resolve(null);
                     } else {
                        // return the info.
                        resolve(oInfo);
                     }
                  });

               }
            });
         }).catch((err) => {
            console.log("Error adding signature entry in the mempool!");
            reject(err);
         });
      })
   }


   /**
    * Gets entry from levelDB using the wallet address.
    */
   getEntry(sAddress) {
      let self = this;
      return new Promise((resolve, reject) => {
         // Removed expired entries 
         self.removeExpiredEntries().then((aDeleteOps) => {
            self.db.get(sAddress, function(err, value) {
               if (err) {
                  console.log('getEntry: Mempool ' + sAddress + ' submission failed', err);
                  resolve(null);
               } else {
                  // Return info
                  resolve(value);
               }
            });
         }).catch((err) => {
            console.log("Error adding entry in the mempool!");
            reject(err);
         });
      })
   }

   /**
    * Removes entry from levelDB using the wallet address.
    */
    removeEntry(sAddress) {
      let self = this;
      return new Promise((resolve, reject) => {
         self.db.del(sAddress, function(err) {
           if (err) {
              console.log('removeEntry: Mempool ' + sAddress + ' submission failed', err);
              resolve(false);
           } else {
              // return the timestamp.
              resolve(true);
           }
        });
      });
   }
}

module.exports = Mempool