const Blockchain = require("./blockchain");
const Block = require("./block");
// Define oBlockchain if not defined. This will be used in get-blockheight.js as well.
global.oBlockchain = global.oBlockchain || new Blockchain();

module.exports = async function postBlock (req, res) {
	let oPromise = new Promise((resolve, reject) => {
		try {
			let sText = req.param("text");
			let sMsg = "";
		
			// The post body has "text" key with value in it.
			if (sText !== undefined) {
				let newBlock = new Block(sText);
				oBlockchain.addBlock(newBlock).then((result) => {
					if (result) {
						resolve(newBlock);
					} else {
						sMsg = "ERROR: Failed to add new block to the block chain.";
						console.log(sMsg);
						resolve(sMsg);
					}
				}).catch((err) => {
					reject(err);
				});
			} else {
				sMsg = "ERROR: Either the body is empty or the body.text has no value.";
            	console.log(sMsg);
            	resolve(sMsg);
			}
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