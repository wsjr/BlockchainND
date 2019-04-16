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

            self.setupRegisteredAirlines = false;
          });
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
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

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    // Register Airline
    registerAirline(applicantAirline, registeredAirline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .registerAirline(applicantAirline)
            .send({from: registeredAirline}, callback);
    }

    // Fund Airline
    fundAirline(airline, fee, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fund()
            .send({from: airline, value: fee}, callback);
    }

    // Fund Airline
    isAirlineClearedForFunding(airline, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isAirlineClearedForFunding(airline)
            .call({from: self.owner}, callback);
    }

    getRegisteredAirlinesCount(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getRegisteredAirlinesCount()
            .call({from: self.owner}, callback);
    }

    getRegisteredAirlineStatusCode(index, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getRegisteredAirlineStatusCode(index)
            .call({from: self.owner}, callback);
    }

    getAirlines(statusCode, callback) {
      let self = this;
      self.flightSuretyApp.methods
          .getAirlines()
          .call({from: self.owner}, callback);
    }

    getAirlineStatusInfo(airline, callback) {
      let self = this;
      self.flightSuretyApp.methods
            .getAirlineStatusInfo(airline)
            .call({from: self.owner}, callback);
    }

    getNextRequiredConsensusCount(callback) {
      let self = this;
      self.flightSuretyApp.methods
            .getNextRequiredConsensusCount()
            .call({from: self.owner}, callback);
    }
}