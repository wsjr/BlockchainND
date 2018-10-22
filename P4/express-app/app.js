// ==========================
// EXPRESS APP
// ==========================

const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

const app = express();

const Blockchain = require("./libs/blockchain");
const Block = require("./libs/block");
const Mempool = require("./libs/mempool");
const InvalidSignaturePool = require("./libs/invalidsignaturepool");


const port = 8000;

let oBlockchain = new Blockchain();
let oMempool = new Mempool();
let oInvalidSignaturePool = new InvalidSignaturePool();

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
 * Determines if a string contains only ascii or not.
 */
function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}

/**
 * Gets info by wallet address in the mempool.
 */
function getInfo(sAddress) {
   return new Promise((resolve, reject) => {
      oMempool.getEntry(sAddress).then((oInfo) => {
         resolve(oInfo);   
      }).catch((err) => {
         console.log("[getInfo] Error encountered:" + err + "!");
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
      oMempool.getEntry(sAddress).then((oInfo) => {
         let nValidationWindow = 0;
         let oPayload = null;

         if (!!oInfo) {
            resolve(getValidationPayload(sAddress, oInfo.timestamp));
         } else {
            oMempool.addEntry(sAddress).then((oInfo) => {
               if (!!oInfo) {
                  resolve(getValidationPayload(sAddress, oInfo.timestamp));
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

      // Let's update the signature entry first for the address.
      oMempool.updateSignatureEntry(sAddress, sSignature).then((oInfo) => {
         getInfo(sAddress).then((oInfo) => {
            let oStatus = getValidationPayload(sAddress, oInfo.timestamp);
            let oResult = {};
            let sTimestamp = oInfo.timestamp;

            // If wallet address is not in the request pool, don't proceed and flag it.
            if (!sTimestamp || !oStatus) {
               oResult.registerStar = false;
            } else {

               let bVerified = bitcoinMessage.verify(oStatus.message, sAddress, sSignature);
               console.log("bVerified:" + bVerified);
               // if message is not verified, flag it.
               if (bVerified === false) {
                  oResult.registerStar = false;
               } else {
                  // Verify the Signature
                  oResult.registerStar = true;
                  oResult.status = oStatus;
                  oResult.status.messageSignature = "valid";
               }
            }
            res.send(oResult);
         }).catch((err) => {
            res.send("ERROR: Please validate wallet address first." + err);
         });
      }).catch((err) => {
         res.send("ERROR: Updating signature entry.");
      });
   }
})

/**
 * Register a star.
 */
app.post('/block', function(req, res) {
   let oBody = req.body;

   // The post body should have: "address" and "star" registration information.
   if (oBody !== undefined && oBody.address !== undefined && 
         oBody.star !== undefined && oBody.star.dec.length > 0 && oBody.star.ra.length > 0 && oBody.star.story.length > 0) {
      
      let sAddress = oBody.address;
      let sStory = oBody.star.story;

      // Check if star's story value contains only ascii and not more than 500 bytes.
      if (sStory !== undefined && isASCII(sStory) && sStory.length <= 500) {
      
         // Convert ascii to hexadecimal for the star's story value.
         let sStoryHex = Buffer.from(sStory, 'ascii').toString('hex');
         oBody.star.story = sStoryHex;
      
         // Ensure the address is in the validated pool.
         oMempool.getEntry(sAddress).then((oInfo) => {
            if (oInfo.timestamp !== null) {
               // Check if the signature is valid.
               oInvalidSignaturePool.isSignatureValid(oInfo.signature).then((bResult) => {
                  if (bResult) {
                     // Proceed in adding a block now.
                     let newBlock = new Block(oBody);
                     oBlockchain.addBlock(newBlock).then((result) => {
                        if (result) {
                           res.send(newBlock);

                           let sSignature = oInfo.signature;

                           // Remove entry in the mempool, provide the signature to add it in the invalidate signature list.
                           oMempool.removeEntry(sAddress).then((bResult) => {
                              if (bResult) {
                                 console.log(sAddress + " successfully removed from mempool.");
                                 // Invalidate the signature
                                 oInvalidSignaturePool.invalidateSignature(sSignature, sAddress).then((bInvalidateResult) => {
                                    if (bInvalidateResult) {
                                       console.log(sSignature + " signature invalidation succeeded.");
                                    } else {
                                       console.log(sSignature + " signature invalidation failed.");
                                    }
                                 });
                              } else {
                                 console.log(sAddress + " was NOT successfully removed from mempool.");
                              }
                           });

                        } else {
                           res.send("ERROR: Failed to add new block to the block chain.");
                        }
                     });
                  }
               });
            } else {
               res.send("ERROR: Failed to add new block to the block chain. The address provided has not been validated.");
            }
         }).catch((err) => {
            res.send("ERROR: Failed to add new block to the block chain. The address provided has not been validated or signature has been invalidated.");
         });
      } else {
         res.send("ERROR: star's story is undefined, does not contain all ascii or is more than 500 bytes.");
      }
   } else {
      res.send("ERROR: Please supply the required info: wallet address and star information");
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
         if (height >= 0) {
            oBlockchain.getBlock(nBlockheight).then((block) => {
               // Non-genesis blocks should have a star's story.
               if (nBlockheight > 0) {
                  // Decode the story
                  let oBody = block.body;
                  oBody.star.storyDecoded = Buffer.from(oBody.star.story, 'hex').toString('ascii');
               }
               // Send response
               res.send(block);
            }).catch((err) => {
               res.send("ERROR: fetching the block at height " + nBlockheight + ":" + err);
            });
         } else {
            res.send("ERROR: blockheight should be greater than or equal to 0");
         }
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))