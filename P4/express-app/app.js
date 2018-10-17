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

const port = 8000;
// 300 seconds
const VALID_DURATION_IN_MEMPOOL_MS = 300000;
const MILLISECONDS_TO_SECOND = 1/1000;

let aRequestPool = [];
let oBlockchain = new Blockchain();


function getValidationWindow(sTimestamp) {
	let nTimestamp = parseInt(sTimestamp);
	let nDuration = Date.now() - nTimestamp;
	return (VALID_DURATION_IN_MEMPOOL_MS - nDuration);
}

function isTimestampValid(sTimestamp) {
	return getValidationWindow(sTimestamp) > 0;
}

function getEntryInRequestPool(sAddress) {
	// Clean the mempool with expired transactions.
	aRequestPool = aRequestPool.filter(function(entry) {
		return isTimestampValid(entry.timestamp);
	});

	// Find if there's any entry with the wallet address in the mempool.
	let aMatch = aRequestPool.filter(function(entry) {
		return entry.address === sAddress;
	});

	return aMatch[0];
}

function getStarRegistryPayload(oEntry) {
	let oPayload = null;
	if (oEntry !== undefined) {
		let sTimestamp = oEntry.timestamp;
		let sAddress = oEntry.address;
		let nValidationWindow = getValidationWindow(sTimestamp) * MILLISECONDS_TO_SECOND;
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

function validateEntry(sAddress) {
	let oNow = Date.now();

	let oMatch = getEntryInRequestPool(sAddress);
	let sTimestamp = "";
	let nValidationWindow = 0;
	let oPayload = null;

	if (oMatch !== undefined) {
		oPayload = getStarRegistryPayload(oMatch);
	} else {
		let oEntry = {
			address: sAddress,
			timestamp: Date.now().toString()
		};
		aRequestPool.push(oEntry);

		oPayload = getStarRegistryPayload(oEntry);
	}
	return oPayload;
}


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
   extended: false
}));

// parse application/json
app.use(bodyParser.json());


/**
 * Validate User Request End Point: http://localhost:8000/requestValidation
 * 
 * This allow users to submit their request using their wallet address. Requests
 * are timestamped and put in mempool and is valid for validationWindow duration.
 * If the validationWindow expires, the request is removed from the mempool.
 * 
 * Method: Post
 * Expected payload:
 *    {
 *       "address": [Blockchain ID or wallet address]
 *    }
 * Response:
 *    {
 *       "address": [wallet address],
 *       "requestTimestamp": [timestamp],
 *       "message": [wallet address]:[requestTimestamp]:starRegistry,
 *       "validationWindow": [seconds]
 *    }
 */
app.post('/requestValidation', function(req, res) {
	let oBody = req.body;

	// The post body has "address" key with value in it.
	if (oBody !== undefined && oBody.address !== undefined) {
		let sAddress = oBody.address;
		let oPayload = validateEntry(sAddress);

		res.send(oPayload);
	}
})

/**
 * Validate Message Signature End Point: http://localhost:8000/message-signature/validate
 * 
 * After receiving the response, users will prove their blockchain identity 
 * by signing a message with their wallet. Once they sign this message, 
 * the application will validate their request and grant access to register a star.
 * 
 * Method: Post
 * Expected payload:
 *    {
 *       "address": [Blockchain ID or wallet address]
 *		 	"signature": [Message signature]
 *    }
 * Response:
 *    {
 *		 	"registarStar": true,
 *		 	"status": {
 *       	"address": [wallet address],
 *       	"requestTimestamp": [timestamp],
 *       	"message": [wallet address]:[requestTimestamp]:starRegistry,
 *       	"validationWindow": [seconds]
 *		 	}
 *    }
 */
app.post('/message-signature/validate', function(req, res) {
	let oBody = req.body;

	// The post body has "address" and "signature" key/value pair
	if (oBody !== undefined && oBody.address !== undefined && oBody.signature !== undefined) {
		let sAddress = oBody.address;
		let sSignature = oBody.signature;
		
		let oEntry = getEntryInRequestPool(sAddress);
		let oStatus = getStarRegistryPayload(oEntry);
		let oResult = {};

		// If wallet address is not in the request pool, don't proceed and flag it.
		if (oEntry === undefined || oStatus === undefined) {
			oResult.registerStar = false;
		} else {
			// Verify the signature
			oResult.registerStar = true;
			oResult.status = oStatus;
			

			// TODO: Hardcode to valid for now.
			oResult.status.messageSignature = "valid";
			// let bVerified = bitcoinMessage.verify(oResult.message, sAddress, sSignature);
			// oResult.status.messageSignature = bVerified ? "valid" : "invalid";
		}
		res.send(oResult);
	}
})

// POST Block Endpoint
//   This expects the post block body to have a string of text. 
//   The response for the endpoint should provide block object in JSON format.
app.post('/block', function(req, res) {
	let oBody = req.body;

   // The post body should have: "address" and "star" registration information.
   if (oBody !== undefined && oBody.address !== undefined && oBody.star !== undefined) {
   	// Convert ascii to hexadecimal for the star's story value.
   	if (oBody.star.story !== undefined) {
   		let sStoryHex = Buffer.from(oBody.star.story, 'ascii').toString('hex')
   		oBody.star.story = sStoryHex;
   	}

      let newBlock = new Block(oBody);

      oBlockchain.addBlock(newBlock).then((result) => {
         if (result) {
            res.send(newBlock);
         } else {
            res.send("ERROR: Failed to add new block to the block chain.");
         }
      });
   } else {
      res.send("ERROR: Either the body is empty or the body.text has no value.");
   }
})

// GET

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
	      			console.log(block.body.address + ":" + sAddress);

	      			// If address matches, add it to the result.
	      			if (block.body.address === sAddress) {
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
})

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
	      	//res.send(aStars);
      	}
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))