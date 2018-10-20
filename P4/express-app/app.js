// ==========================
// EXPRESS APP
// ==========================

const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

const app = express();

const Blockchain = require("./blockchain");
const Block = require("./block");
const Mempool = require("./mempool");


const port = 8000;

let oBlockchain = new Blockchain();
let oMempool = new Mempool();

//===================
// APP 
//===================

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
   extended: false
}));

// parse application/json
app.use(bodyParser.json());

/**
 * Gets timestamp by wallet address in the mempool.
 */
function getTimestamp(sAddress) {
   return new Promise((resolve, reject) => {
      oMempool.getEntry(sAddress).then((sTimestamp) => {
         resolve(sTimestamp);   
      }).catch((err) => {
         console.log("[getTimestamp] Error encountered:" + err + "!");
         resolve(null);
      });
   });
}

/**
 * Gets validation payload with te use of address and timestamp. It adds the following
 * properties.
 *  - message: [Wallet address]:[Timestamp]:starRegistry
 *  - validationWindow: Time remaining since address was validated.
 */
function getValidationPayload(sAddress, sTimestamp) {
   let oPayload = null;
   if (!!sAddress && !!sTimestamp) {
      let nValidationWindow = oMempool.getValidationWindowInSeconds(sTimestamp);
      let sMessage = sAddress + ":" + sTimestamp + ":starRegistry";

      oPayload = {
         address: sAddress,
         requestTimestamp: sTimestamp,
         message: sMessage,
         validationWindow: nValidationWindow
      };
   }
   return oPayload;
}

/**
 * Validates address.
 */
function validateAddress(sAddress) {
   let oNow = Date.now();
   
   return new Promise((resolve, reject) => {
      oMempool.getEntry(sAddress).then((sTimestamp) => {
         let nValidationWindow = 0;
         let oPayload = null;

         if (!!sTimestamp) {
            resolve(getValidationPayload(sAddress, sTimestamp));
         } else {
            oMempool.addEntry(sAddress).then((sNewTimestamp) => {
               if (!!sNewTimestamp) {
                  resolve(getValidationPayload(sAddress, sNewTimestamp));
               } else {
                  resolve(null);
               }
            }).catch((err) => {
               console.log("[validateAddress] Error encountered:" + err + "!");
               reject(err);
            });
         }
      }).catch((err) => {
         console.log("[validateAddress] Error encountered:" + err + "!");
         reject(err);
      });
   });
}

//===================
// API END POINTS
//===================


/**
 * Validates User Request.
 * 
 * This allow users to submit their request using their wallet address. Requests
 * are timestamped and put in mempool and is valid for validationWindow duration.
 * If the validationWindow expires, the request is removed from the mempool.
 * 
 */
app.post('/requestValidation', function(req, res) {
   let oBody = req.body;
   
   // The post body has "address" key with value in it.
   if (oBody !== undefined && oBody.address !== undefined) {
      let sAddress = oBody.address;
		
      validateAddress(sAddress).then((oPayload) => {
         res.send(oPayload);
      }).catch((err) => {
         res.send(err);
      });
   }
})

/**
 * Validate Message Signature.
 * 
 * After receiving the response, users will prove their blockchain identity 
 * by signing a message with their wallet. Once they sign this message, 
 * the application will validate their request and grant access to register a star.
 * 
 */
app.post('/message-signature/validate', function(req, res) {
   let oBody = req.body;

   // The post body has "address" and "signature" key/value pair
   if (oBody !== undefined && oBody.address !== undefined && oBody.signature !== undefined) {
      let sAddress = oBody.address;
      let sSignature = oBody.signature;

      getTimestamp(sAddress).then((sTimestamp) => {
         let oStatus = getValidationPayload(sAddress, sTimestamp);
         let oResult = {};

         // If wallet address is not in the request pool, don't proceed and flag it.
         if (sTimestamp === undefined || oStatus === undefined) {
            oResult.registerStar = false;
         } else {
            // Verify the signature
            oResult.registerStar = true;
            oResult.status = oStatus;
				
            let bVerified = bitcoinMessage.verify(oResult.status.message, sAddress, sSignature);
            oResult.status.messageSignature = bVerified ? "valid" : "invalid";
         }
         res.send(oResult);
      });
   }
})

/**
 * Register a star.
 */
app.post('/block', function(req, res) {
   let oBody = req.body;

   // The post body should have: "address" and "star" registration information.
   if (oBody !== undefined && oBody.address !== undefined && oBody.star !== undefined) {
      let sAddress = oBody.address;

      // Convert ascii to hexadecimal for the star's story value.
      if (oBody.star.story !== undefined) {
         let sStoryHex = Buffer.from(oBody.star.story, 'ascii').toString('hex');
         oBody.star.story = sStoryHex;
      }


      // Ensure the address is in the validated pool.
      oMempool.getEntry(sAddress).then((sTimestamp) => {
         if (sTimestamp !== null) {
            // Proceed in adding a block now.
            let newBlock = new Block(oBody);
            oBlockchain.addBlock(newBlock).then((result) => {
               if (result) {
                  res.send(newBlock);

                  // Remove entry in the mempool
                  oMempool.removeEntry(sAddress).then((result) => {
                     if (result) {
                        console.log(sAddress + " successfully removed from mempool.");
                     } else {
                        console.log(sAddress + " was NOT successfully removed from mempool.");
                     }
                  });

               } else {
                  res.send("ERROR: Failed to add new block to the block chain.");
               }
            });
         } else {
            res.send("ERROR: Failed to add new block to the block chain. The address provided has not been validated.");
         }
      }).catch((err) => {
         console.log("Error encountered at adding block for " + sAddress + ":" + err + "!");
         resolve(null);
      });
   } else {
      res.send("ERROR: Either the body is empty or the body.text has no value.");
   }
});

/**
 * Gets stars by wallet address
 */
app.get('/stars/address::address', function(req, res) {
   let sAddress = req.params.address;
   let aStars = [];

   try {
      // Get block height
      oBlockchain.getBlockHeight().then((height) => {
         // More than the genesis block.
         if (height > 0) {
            // Traverse the chain.
            for (let i = 1; i <= height; i++) {
               oBlockchain.getBlock(i).then((block) => {
                  // If address matches, add it to the result.
                  if (block.body.address === sAddress) {
                     // Decode the story
                     let oBody = block.body;
                     oBody.star.storyDecoded = Buffer.from(oBody.star.story, 'hex').toString('ascii');
                     // Collect block
                     aStars.push(block);
                  }

                  // Last entry to process.
                  if (i === height) {
                     res.send(aStars);
                  }
               }).catch((err) => {
                  res.send("ERROR: fetching the block at height " + i + ":" + err);
               });
            }
         }
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
});

/**
 * Gets stars by blockchain hash.
 */
app.get('/stars/hash::hash', function(req, res) {
   let sHash = req.params.hash;
   let aStars = [];

   try {
      // Get block height
      oBlockchain.getBlockHeight().then((height) => {
         // More than the genesis block.
         if (height > 0) {
            // Traverse the chain.
            for (let i = 1; i <= height; i++) {
               oBlockchain.getBlock(i).then((block) => {
                  // If address matches, add it to the result.
                  if (block.hash === sHash) {
                     // Decode the story
                     let oBody = block.body;
                     oBody.star.storyDecoded = Buffer.from(oBody.star.story, 'hex').toString('ascii');
                     // Collect block
                     aStars.push(block);
                  }

                  // Last entry to process.
                  if (i === height) {
                     res.send(aStars);
                  }
               }).catch((err) => {
                  res.send("ERROR: fetching the block at height " + i + ":" + err);
               });
            }
         }
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
});

/**
 * Gets star by block height
 */
app.get('/block/:blockheight', function(req, res) {
   let nBlockheight = req.params.blockheight;
	
   try {
      // Get block height
      oBlockchain.getBlockHeight().then((height) => {
         // More than the genesis block.
         if (height > 0) {
            oBlockchain.getBlock(nBlockheight).then((block) => {
               // Decode the story
               let oBody = block.body;
               oBody.star.storyDecoded = Buffer.from(oBody.star.story, 'hex').toString('ascii');
               // Send response
               res.send(oBody);
            }).catch((err) => {
               res.send("ERROR: fetching the block at height " + nBlockheight + ":" + err);
            });
         }
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))