import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

const ACCOUNT_OFFSET = 20;  // First one is contract owner, next 10 is allocated for airlines, then next 5 is for passengers
const ORACLES_COUNT = 25;   // Start with 25 Oracles for now.

let oracle_accounts = [];

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

//const STATUS_CODES  = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];
const STATUS_CODES  = [STATUS_CODE_LATE_AIRLINE];

function getRandomStatusCode() {
  return STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];
}

// Register Oracles
web3.eth.getAccounts((error, accounts) => {

  let contractOwner = accounts[0];


  if(accounts.length < ORACLES_COUNT + ACCOUNT_OFFSET) {
    throw "Increase the number of accounts"
  }


  flightSuretyData.methods
    .authorizeCaller(config.appAddress)
    .send({ from: contractOwner }, (error, result) => {
      if(error) {
        console.log(error);
      } else {
        console.log("Registered App as authorized caller.");
      }
    });

  // Resolve Oracle Registration Fee from Contract
  flightSuretyApp.methods
    .REGISTRATION_FEE()
    .call({ from: contractOwner}, (error, result) => {
      if(error) {
        console.log(error);

      } else {
        let registrationFee = result;

        // Register Oracles
        for(let idx=ACCOUNT_OFFSET; idx < ORACLES_COUNT + ACCOUNT_OFFSET; idx++) {
          flightSuretyApp.methods
            .registerOracle()
            .send({ from: accounts[idx], value: registrationFee, gas: 3000000}, (reg_error, reg_result) => {
              if(reg_error) {
                console.log(reg_error);

              } else {

                // Fetch Indexes for a specific oracle account
                flightSuretyApp.methods
                  .getMyIndexes()
                  .call({ from: accounts[idx]}, (fetch_error, fetch_result) => {
                    if (error) {
                      console.log(fetch_error);

                    } else {
                      // Added registered account to oracle account list
                      let oracle = {
                        address: accounts[idx],
                        indexes: fetch_result
                      };

                      oracle_accounts.push(oracle);
                      console.log("Oracle registered: " + JSON.stringify(oracle));
                    }
                  });
              }
            });
        }
      }
    });
});


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) {
      console.log(error);

    }  else {

      let index = event.returnValues.index;
      let airline = event.returnValues.airline;
      let flight = event.returnValues.flight;
      let timestamp = event.returnValues.timestamp;
      let statusCode = getRandomStatusCode();

      console.log("-------------------------");
      console.log("Airline:" + airline);
      console.log("Flight:" + flight);
      console.log("Timestamp:" + timestamp);
      console.log("Expected index:" + index);
      console.log("-------------------------");

      // Fetching Indexes for Oracle Accounts
      for(let idx=0; idx < oracle_accounts.length; idx++) {

        if(oracle_accounts[idx].indexes.includes(index)) {
          console.log("Oracle matches an react to request: " + JSON.stringify(oracle_accounts[idx]));

          // Submit Oracle Response
          flightSuretyApp.methods
            .submitOracleResponse(index, airline, flight, timestamp, statusCode)
            .send({ from: oracle_accounts[idx].address, gas: 200000 }, (error, result) => {
              if(error) {
                console.log(error);
              } else {
                console.log("Sent Oracle Response " + JSON.stringify(oracle_accounts[idx]) + " Status Code: " + statusCode);
              }
            });
        }
      }
    }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;