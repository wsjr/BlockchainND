const level = require('level');
const mempoolDB = './mempooldata';


// 300 seconds allowed to stay in the mempool.
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

   // ==========================
   // === DB related methods ===
   // ==========================

   /**
    * Removes entries with timestamp passed the validation window.
    */
   removeExpiredEntries() {
      let self = this;
      let aDeleteOps = [];

      return new Promise((resolve, reject) => {
         self.db.createReadStream().on('data', function(data) {
            if (self.isTimestampValid(data.value) === false) {
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
    * Add entry to the level DB using wallet address as key and timestamp as value.
    */
   addEntry(key) {
      let self = this;
      return new Promise((resolve, reject) => {
         // Removed expired entries
         self.removeExpiredEntries().then((aDeleteOps) => {
            let sTimestamp = self.getNowTimestamp();
            self.db.put(key, sTimestamp, function(err) {
               if (err) {
                  console.log('addEntry: Mempool ' + key + ' submission failed', err);
                  resolve(null);
               } else {
                  console.log("Timestamp:" + sTimestamp);
                  // return the timestamp.
                  resolve(sTimestamp);
               }
            });
         }).catch((err) => {
            console.log("Error adding entry in the mempool!");
            reject(err);
         });
      })
   }

   /**
    * Gets entry from levelDB using the wallet address.
    */
   getEntry(key) {
      let self = this;
      return new Promise((resolve, reject) => {
         // Removed expired entries 
         self.removeExpiredEntries().then((aDeleteOps) => {
            self.db.get(key, function(err, value) {
               if (err) {
                  console.log('getEntry: Mempool ' + key + ' submission failed', err);
                  resolve(null);
               } else {
                  // Return timestamp
                  resolve(JSON.parse(value));
               }
            });
         }).catch((err) => {
            console.log("Error adding entry in the mempool!");
            reject(err);
         });
      })
   }
}

module.exports = Mempool