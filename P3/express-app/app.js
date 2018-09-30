// ==========================
// EXPRESS APP
// ==========================

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const Blockchain = require("./blockchain");
const Block = require("./block");
const port = 8000;

let oBlockchain = new Blockchain();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
   extended: false
}));

// parse application/json
app.use(bodyParser.json());


// GET Block Endpoint
//   Block height is parameter is expected.
//   The response for the endpoint should provide block object is JSON format.
app.get('/block/:blockHeight', function(req, res) {
   let nHeight = req.params.blockHeight;

   try {
      // Get block height
      oBlockchain.getBlockHeight().then((height) => {
         // Ensure that the block height provided by user
         // does NOT go beyond the actual block height.
         if (height >= nHeight) {
            // If valid return the block at blockheight specified by user.
            oBlockchain.getBlock(nHeight).then((block) => {
               res.send(block);
            }).catch((err) => {
               res.send("ERROR: fetching the block at height " + nHeight + ":" + err);
            });
            // Otherwise, not valid height so just warn user.  
         } else {
            res.send("Requested block height is not a valid block as of the moment. Requested height is " + nHeight + " and blockchain height is:" + height);
         }
      }).catch((err) => {
         res.send("ERROR:" + err);
      });
   } catch (e) {
      res.send("ERROR:" + e);
   }
})

// POST Block Endpoint
//   This expects the post block body to have a string of text. 
//   The response for the endpoint should provide block object in JSON format.
app.post('/block', function(req, res) {
   let oBody = req.body;

   // The post body has "text" key with value in it.
   if (oBody !== undefined && oBody.text !== undefined) {
      let newBlock = new Block(oBody.text);

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

app.listen(port, () => console.log(`Example app listening on port ${port}!`))