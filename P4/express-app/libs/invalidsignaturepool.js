const level = require('level');
const invalidsignaturepoolDB = './libs/invalidsignaturepooldata';


/* ===== InvalidSignaturePool Class ===========================
|  Class with a constructor for new invalid signature pool    |
|  ===========================================================*/

class InvalidSignaturePool {
   constructor() {
      this.db = level(invalidsignaturepoolDB);
   }

   // ============================================
   // === Signature validation related methods ===
   // ============================================

   /**
    * Invalid Signature DB has entries in this format:
    *
    *   signature: wallet address
    */

   /**
    * Checks if the signature is valid or not by checking the invalidSignatureDB.
    */
   isSignatureValid(sSignature) {
      let self = this;
      return new Promise((resolve, reject) => {
         self.db.get(sSignature, function(err, value) {
            if (err) {
               console.log('isSignatureValid: invalidSignatureDB ' + sSignature + ' submission failed', err);
               // Since signature is not in the invalid signature DB, its valid.
               resolve(true);
            } else {
               // Return info
               resolve(false);
            }
         });
      })
   }

   /**
    * Invalidates signature by adding it in the invalidSignatureDB.
    */
   invalidateSignature(sSignature, sAddress) {
      let self = this;
      return new Promise((resolve, reject) => {
         self.db.put(sSignature, sAddress, function(err) {
            if (err) {
               console.log('invalidateSignature: invalidSignatureDB ' + key + ' submission failed', err);
               // invalidation failed.
               resolve(false);
            } else {
               // invalidation succeeded.
               resolve(true);
            }
         });
      })
   }
   
}

module.exports = InvalidSignaturePool