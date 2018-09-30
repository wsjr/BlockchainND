'use strict';

const Hapi = require('hapi');

const bodyParser = require('body-parser');
const Blockchain = require("./blockchain");
const Block = require("./block");

let oBlockchain = new Blockchain();


const server = Hapi.server({
    port: 8000,
    host: 'localhost'
});

// GET Block Endpoint
//   Block height is parameter is expected.
//   The response for the endpoint should provide block object is JSON format.
server.route({
    method: 'GET',
    path: '/block/{blockHeight}',
    handler: (request, reply) => {
        let nHeight = encodeURIComponent(request.params.blockHeight);

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

        return oPromise;
    }
});

// POST Block Endpoint
//   This expects the post block body to have a string of text. 
//   The response for the endpoint should provide block object in JSON format.
server.route({
    method: 'POST',
    path: '/block',
    handler: (request, reply) => {
        //return 'POST detected:' + request.payload.text;
        let oPromise = new Promise((resolve, reject) => {
            try {
                let oBody = request.payload;
                let sMsg = "";

                // The post body has "text" key with value in it.
                if (oBody !== undefined && oBody.text !== undefined) {
                    let newBlock = new Block(oBody.text);

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
                    resolve(sMsg)
                }
            } catch(e) {
                reject(e);
            }
        });

        return oPromise;
    }
});

const init = async () => {

    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();