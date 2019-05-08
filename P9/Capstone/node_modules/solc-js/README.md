# solc-js

cross-browser solidity compiler for the web

**smaller and faster alternative to [solc](https://www.npmjs.com/package/solc) for browser-only environments**
* JavaScript bindings for the [solidity compiler](https://github.com/ethereum/solidity)
* Uses the emscripten compiled solidity found in the [solc-bin repository](https://github.com/ethereum/solc-bin)

In nodejs you can instead use [solc](https://www.npmjs.com/package/solc) or [solc-native](https://www.npmjs.com/package/solc-native)

### usage

**this module is work in progress**  
[`npm install solc-js`](https://www.npmjs.com/package/solc-js)
```js
const solcjs = require('solc-js')

// for now, see `demo.js`
```

### Standard Output Format

```json
{
  "abi": [{…}, {…}],
  "contractName": "SimpleStorage",
  "errors": [{…}],
  "metadata": {compiler: {…}, language: "Solidity", output: {…}, settings: {…}, sources: {…}, …},
  "success": true,
  "version": "0.5.0+commit.1d4f565a"
}
```

# contribute
feel free to make pull requests or file issues [here](https://github.com/ethereum/play/issues)
