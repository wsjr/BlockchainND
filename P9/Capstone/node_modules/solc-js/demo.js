console.time('[start]')
const bel = require('bel')
const sca = require('smartcontract-app')

const solcjs = require('./')
const selectVersion = solcjs.version2url // require('./src/node_modules/version2url')

/* @TODO:

  var { all } = await solcjs.versions()
  var compiler = await solcjs(all[0])
  var output = compiler`...code...`

*/

selectVersion((error, select) => {
  if (error) return console.error(error)
  const useVersion = (error, url) => {
    if (error) return console.error(error)
    console.log('url:', url)
    solcjs(url, start)
  }
  const { releases, nightly, all} = select

  const version = releases[0] // @NOTE: hard code to use latest version

  select(version, useVersion)
  document.body.appendChild(selector(releases, v => select(v, useVersion)))
})

function selector (list, action) {
  const onchange = event => action(event.target.value)
  return bel`
    <select onchange=${onchange}>
      ${list.map(x => bel`<option value="${x}">${x}</option>`)}
    </select>`
}

async function start (error, solc) {
  if (error) return console.error(error)
  console.time('[compile stuff]')
  try {
    // pragma solidity ^0.4.25;
    var output = await /* solc(input) // OR */ solc`
    contract Mortal {
      address public owner;
      constructor() public { owner = msg.sender; }
      function kill() { if (msg.sender == owner) selfdestruct(owner); }
    }

    contract Greeter is Mortal {
      string public greeting;
      constructor(string memory _greeting) public {
        greeting = _greeting;
      }
    }`
    console.log('***   success   ***')
    document.body.appendChild(bel`<h1>success</h1>`)
    console.log('[output]', output)
    var opts = {
        metadata: {
        compiler: { version: output[0].compiler.version },
        language: output[0].compiler.language,
        output: {
          abi: JSON.parse(output[0].abi),
          devdoc: output[0].metadata.devdoc,
          userdoc: output[0].metadata.userdoc
        },
        settings: {
          compilationTarget: { '': output[0].sources.compilationTarget },
          evmVersion: output[0].compiler.evmVersion,
          libraries: output[0].sources.libraries,
          optimizer: { enabled: output[0].compiler.optimizer, runs: output[0].compiler.runs },
          remapings: output[0].sources.remappings
        },
        sources: { '': output[0].sources.sourcecode }
      }
    }
    var el = sca(opts)
    document.body.appendChild(el)
    // @TODO: do in-website-only most minimal test library + iframe compatible dom reporter
    // testCompiler(solc)
  } catch (error) {
    console.log('***   fail   ***')
    document.body.appendChild(bel`<h1>fail</h1>`)
    console.error('[error]', error)
  } finally {
    console.timeEnd('[compile stuff]')
    console.timeEnd('[start]')
  }
}


function testCompiler (solc) {
  var input1 = 'contract x { function g() {} }'
  var input2 = 'contract y { function f() {} }'
  // Setting 1 as second paramateractivates the optimiser
  async function compile (input) {
    console.time('[compile]')
    // var output = await solc(input)
    var output = solc.compile(input, 1)
    console.timeEnd('[compile]')
    console.log('output', output)
  }
  var id = setInterval(() => compile(input1), 500)
  setTimeout(() => {
    console.log('====================')
    clearInterval(id)
    id = setInterval(() => compile(input2), 500)
    setTimeout(() => clearInterval(id), 5000)
  }, 5000)
}
