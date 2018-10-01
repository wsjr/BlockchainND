# RESTful Web API with Node.js Framework

This project is built using [Sails](http://sailsjs.com/) that serves as Web API on top of our private blockchain to submit and retrieve blockchain data.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites
- [npm](https://www.npmjs.com/) (Node.js package manager)
- [Node.js](https://nodejs.org/en/)
- [Postman](https://www.getpostman.com/) Used to test the webservices API.

### Configuring

- Use NPM to initialize your project and create package.json to store project dependencies.

```
npm init
```
- Install Express. Used as our web API framework. Make sure to provide **"--save"** flag to save dependency to our package.json

```
npm install express --save
```

- Install crypto-js. Used for sha256 hashing.

```
npm install crypto-js --save
```

- Install level. Used for persisting blockchain state.

```
npm install level --save
```

- Install body-parser. Used for parsing incoming request bodies.

```
npm install body-parser --save
```
### Running
Run the node application:

```
sails lift
```

If successful, it should display:

```
info: Server lifted in `/Users/wenjo2/Dev/Udacity/BCND/P3/sails-app`
info: To shut down Sails, press <CTRL> + C at any time.
info: Read more at https://sailsjs.com/support.

debug: -------------------------------------------------------
debug: :: Sun Sep 30 2018 21:08:30 GMT-0700 (PDT)

debug: Environment : development
debug: Port        : 8000
debug: -------------------------------------------------------
```

### Testing

The following **2 API Block Endpoints** are as follows:

**GET BLOCK ENDPOINT**:
____

Get block object specified by the blockheight. The response for the endpoint should provide block object in JSON format.

```
http://localhost:8000/block/[blockheight]
```
Example:

```
http://localhost:8000/block/0
```

Returns
```
{
    "hash": "6f8b41db1ee46be046b7705ed083768a90b1891fc6d6bbfcb0a757048ffcc646",
    "height": 0,
    "body": "First block in the chain - Genesis block",
    "time": "1537134644",
    "previousBlockHash": "0x"
}
```

**POST BLOCK ENDPOINT**:
____

Post a new block with data payload option to add data to the block body. The block body should support a string of text. The response for the endpoint should provide block object in JSON format.

Example:

```
http://localhost:8000/block
```
Post body
```
{
    "text": "Test Block 5"
}
```

Returns
```
{
    "hash": "db410d59fd9dc6723fb844e27e7e73702cb658604c4797658efbb9b4a065e26e",
    "height": "5",
    "body": "Test Block 5",
    "time": "1538108262",
    "previousBlockHash": "64d5e3c3f0d912f18b9aea6738ebaa00a0c9d8cf0edcc213539f7fd974e960bc"
}
```

## Built With

* [Sails](http://sailsjs.com/) - The web framework for NodeJS.
* [NodeJS](https://nodejs.org/en/) - Javascript runtime
* [LevelDB](http://leveldb.org/) - Lightweight DB to persist state.

