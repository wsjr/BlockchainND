import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {
        async function initilizeProvider() {
            if (window.ethereum) {
              try {
                // Request account access
                await window.ethereum.enable();
  
                return window.ethereum;;
              } catch (error) {
                // User denied account access...
                console.error("User denied account access")
              }
            }
            // Legacy dapp browsers...
            else if (window.web3) {
              return window.web3.currentProvider;
            }
            // If no injected web3 instance is detected, fall back to Ganache
            else {
              return new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws'));
            }
          }
  
          let self = this;
          initilizeProvider().then(function (provider) {
            let config = Config[network];
            self.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
            self.web3Metamask = new Web3(provider);
            self.flightSuretyApp = new self.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
            self.flightSuretyData = new self.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
            self.flightSuretyAppMetamask = new self.web3Metamask.eth.Contract(FlightSuretyApp.abi, config.appAddress);
            self.initialize(callback, config);
            self.owner = null;
            self.airlines = [];
            self.passengers = [];
          });
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 10) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    //------------
    // Airline
    //------------
    
    // Register Airline
    registerAirline(applicantAirline, registeredAirline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(applicantAirline)
            .send({from: registeredAirline, gas: 4712388, gasPrice: 100000000000}, callback);
    }

    // Vote Airline
    voteAirline(registeredAirline, applicantAirline, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .voteAirline(applicantAirline)
          .send({from: registeredAirline}, callback);
    }

    // Fund Airline
    fundAirline(airline, fee, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fund()
            .send({from: airline, value: fee}, callback);
    }

    //--- Utilities ---
    
    // Is Airline cleared for funding
    isAirlineClearedForFunding(airline, callback) {
        let self = this;
        self.flightSuretyData.methods
            .isAirlineClearedForFunding(airline)
            .call({from: self.owner}, callback);
    }

    // Does airline need a registered airline for registration?
    needsRegisteredAirline(callback) {
      let self = this;
      self.flightSuretyData.methods
          .needsRegisteredAirline()
          .call({ from: self.owner}, callback);
    }

    // Gets airline status info
    getAirlineStatusInfo(airline, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .getAirlineStatusInfo(airline)
          .call({from: self.owner}, callback);
    }

    // Checks the next consensus count.
    getNextRequiredConsensusCount(callback) {
      let self = this;
      self.flightSuretyData.methods
          .getNextRequiredConsensusCount()
          .call({from: self.owner}, callback);
    }

    // Checks if the airline has already voted for the applicant airline
    hasVotedForAirline(registeredAirline, applicantAirline, callback) {
      let self = this;
      self.flightSuretyData.methods
          .hasVotedForAirline(registeredAirline, applicantAirline)
          .call({from: self.owner}, callback);
    }

    //------------
    // Flight
    //------------

    // Register
    registerFlight(airline, flight, timestamp, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .registerFlight(airline, flight, timestamp)
          .send({from: self.owner, gas: 4712388, gasPrice: 100000000000}, callback);
    }

    // Simulate Flight Status
    fetchFlightStatus(airline, flight, timestamp, callback) {
      let self = this;
      let payload = {
        airline: airline,
        flight: flight,
        timestamp: timestamp
      };

      self.flightSuretyApp.methods
          .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
          .send({from: self.owner}, (error, result) => {
              callback(error, payload);
          });
    }

    //--- Utilities ---

    // Get flight keys count
    getAirlineFlightKeysCount(airline, callback) {
      let self = this;
      self.flightSuretyData.methods
          .getAirlineFlightKeysCount(airline)
          .call({from: self.owner}, callback);
    }

    // Get airline flight key
    getAirlineFlightKey(airline, index, callback) {
      let self = this;
      self.flightSuretyData.methods
          .getAirlineFlightKey(airline, index)
          .call({from: self.owner}, callback);
    }

    // Get airline flight info
    getAirlineFlightInfo(key, callback) {
      let self = this;
      self.flightSuretyData.methods
          .getAirlineFlightInfo(key)
          .call({from: self.owner}, callback);
    }

    //------------
    // Passenger
    //------------

    // Buy Insurance
    buyInsurance(passenger, amount, airline, flight, timestamp, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .buyInsurance(airline, flight, timestamp)
          .send({from: passenger, value: amount, gas: 4712388, gasPrice: 100000000000}, callback);
    }

    // Check payout
    checkPayoutBalance(passenger, callback) {
      let self = this;
      self.flightSuretyData.methods
          .getPayoutBalance(passenger)
          .call({from: self.owner}, callback);
    }

    // Withdraw payout
    withdrawPayoutBalance(passenger, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .payInsuree()
          .send({from: passenger, gas: 4712388, gasPrice: 100000000000}, callback);
    }
}