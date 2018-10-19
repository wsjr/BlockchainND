# Build a Private Blockchain Notary Service

This project builds a Star Registry service that allows users to claim ownership of their favorite star in the night sky. It is built using [ExpressJS](http://expressjs.com/) that serves as Web API on top of our private blockchain. Our app validates requests, registers your favorite star and queries stars by wallet address or blockchain hash.

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

- Install bitcoinjs-lib package. A javascript Bitcoin library for node.js and browsers.

```
npm install bitcoinjs-lib --save
```

- Install bitcoinjs-message package. This will be used to verify a bitcoin message.

```
npm install bitcoinjs-message --save
```
### Running
Run the node application:

```
node app.js
```

If successful, it should display:

```
Example app listening on port 8000!
```

### Testing

The following **5 API Block Endpoints** are as follows:

**POST BLOCK ENDPOINT**:
____

**1. Validates User Request**

This allow users to submit their request using their wallet address. Requests are timestamped and put in mempool and is valid for validationWindow duration. If the validationWindow expires, the request is removed from the mempool and proceeding actions should be blocked until a new request validation is submitted.

Example:

```
http://localhost:8000/requestValidation
```
Post body
```
{
    "address": "TestWalletAddress1"
}
```

Returns
```
{
    "address": "TestWalletAddress1",
    "requestTimestamp": 1539916547290,
    "message": "TestWalletAddress1:1539916547290:starRegistry",
    "validationWindow": 300
}
```
**2.    Validates User Request**

After receiving the response, users will prove their blockchain identity by signing a message with their wallet. Once they sign this message, the application will validate their request and grant access to register a star.

Example:

```
http://localhost:8000/message-signature/validate
```
Post body
```
{
    "address": "TestWalletAddress1",
    "signature": "TestWalletSignature1"
}
```

Returns
```
{
    "registerStar": true,
    "status": {
        "address": "TestWalletAddress1",
        "requestTimestamp": 1539914796436,
        "message": "TestWalletAddress1:1539914796436:starRegistry",
        "validationWindow": 296.627,
        "messageSignature": "valid"
    }
}
```

**3. Register a star**

Once a request has been validated, a user can proceed to register his own star.

Example:

```
http://localhost:8000/block
```
Post body
```
{
  "address": "TestWalletAddress1",
  "star": {
    "dec": "-26° 29' 24.9",
    "ra": "16h 29m 1.0s",
    "story": "Found star using https://www.google.com/sky/"
  }
}
```

Returns
```
{
    "hash": "a3d67cdfd2fd32c872d8c7cc9ebd399091bde2d48cb78a652826614b26be75e0",
    "height": "2",
    "body": {
        "address": "TestWalletAddress1",
        "star": {
            "dec": "-26° 29' 24.9",
            "ra": "16h 29m 1.0s",
            "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
        }
    },
    "time": "1539914820",
    "previousBlockHash": "e9cc5f2713b4c4c3f045caac555acf56c02ae4861b7e62438273537244fb6c66"
}
```

**GET BLOCK ENDPOINT**:
____
**4. Get stars by wallet address**

Example:

```
http://localhost:8000/stars/address:TestWalletAddress1
```
Returns
```
[
    {
        "hash": "e9cc5f2713b4c4c3f045caac555acf56c02ae4861b7e62438273537244fb6c66",
        "height": "1",
        "body": {
            "address": "TestWalletAddress1",
            "star": {
                "dec": "-26° 29' 24.9",
                "ra": "16h 29m 1.0s",
                "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
            }
        },
        "time": "1539914812",
        "previousBlockHash": "a257c1ae4172ddce0cf95a328f7482862714a1aa9c47319e958da676852e7c92"
    },
    {
        "hash": "a3d67cdfd2fd32c872d8c7cc9ebd399091bde2d48cb78a652826614b26be75e0",
        "height": "2",
        "body": {
            "address": "TestWalletAddress1",
            "star": {
                "dec": "-26° 29' 24.9",
                "ra": "16h 29m 1.0s",
                "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
            }
        },
        "time": "1539914820",
        "previousBlockHash": "e9cc5f2713b4c4c3f045caac555acf56c02ae4861b7e62438273537244fb6c66"
    }
]
```

**5. Get star by blockchain hash**

Example:

```
http://localhost:8000/stars/hash:a3d67cdfd2fd32c872d8c7cc9ebd399091bde2d48cb78a652826614b26be75e0
```
Returns
```
[
    {
        "hash": "a3d67cdfd2fd32c872d8c7cc9ebd399091bde2d48cb78a652826614b26be75e0",
        "height": "2",
        "body": {
            "address": "TestWalletAddress1",
            "star": {
                "dec": "-26° 29' 24.9",
                "ra": "16h 29m 1.0s",
                "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
            }
        },
        "time": "1539914820",
        "previousBlockHash": "e9cc5f2713b4c4c3f045caac555acf56c02ae4861b7e62438273537244fb6c66"
    }
]
```

**6. Get star by block height**

Example:

```
http://localhost:8000/block/2
```
Returns
```
[
    {
        "hash": "a3d67cdfd2fd32c872d8c7cc9ebd399091bde2d48cb78a652826614b26be75e0",
        "height": "2",
        "body": {
            "address": "TestWalletAddress1",
            "star": {
                "dec": "-26° 29' 24.9",
                "ra": "16h 29m 1.0s",
                "story": "466f756e642073746172207573696e672068747470733a2f2f7777772e676f6f676c652e636f6d2f736b792f"
            }
        },
        "time": "1539914820",
        "previousBlockHash": "e9cc5f2713b4c4c3f045caac555acf56c02ae4861b7e62438273537244fb6c66"
    }
]
```


## Built With

* [Express](http://expressjs.com/) - The web framework for NodeJS.
* [NodeJS](https://nodejs.org/en/) - Javascript runtime
* [LevelDB](http://leveldb.org/) - Lightweight DB to persist state.
