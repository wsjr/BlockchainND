const Blockchain = require("./blockchain");
const Block = require("./block");
// Define oBlockchain if not defined. This will be used in post-block.js as well.
global.oBlockchain = global.oBlockchain || new Blockchain();

module.exports = async function getBlockheight (req, res) {

	let nHeight = req.param("blockheight");

	let oPromise = new Promise((resolve, reject) => {
		try {
			// Get block height
			oBlockchain.getBlockHeight().then((height) => {
				// Ensure that the block height provided by user
				// does NOT go beyond the actual block height.
				if (height >= nHeight) {
					// If valid return the block at blockheight specified by user.
					oBlockchain.getBlock(nHeight).then((block) => {
						resolve(block);
					}).catch((err) => {
						reject(err);
					});
				// Otherwise, not valid height so just warn user.  
				} else {
					let msg = "Requested block height is not a valid block as of the moment. Requested height is " + nHeight + " and blockchain height is:" + height;
                    console.log(msg);
                    resolve(msg);
				}
			}).catch((err) => {
			 reject(err);
			});
		} catch (e) {
			reject(e);
		}
	});

	oPromise.then((block) => {
		return res.send(block);
	}).catch((err) => {
		return res.send(err);
	});
};