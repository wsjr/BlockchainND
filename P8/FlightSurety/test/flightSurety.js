var Web3Utils = require('web3-utils');
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  const ORACLES_COUNT = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;

  var diffLessThan= function(a, b, factor) {
    return (a - b) < factor;
  };

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);
      
      let reverted = false;
      let balance = 0;
      let operational = false;
      
      try 
      {
          operational = await config.flightSuretyData.isOperational();
          balance = await config.flightSuretyApp.getBalance.call({from: config.owner});
      }
      catch(e) {
        reverted = true;
      }

      assert.equal(reverted, true, "Access not blocked for requireIsOperational");    
      assert.equal(operational, false, "Operating status should be false.");
      assert.equal(balance, 0, "Balance should be zero");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);
  });

  //=========================
  // Airline related tests
  //=========================

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) fund is below registration fee', async () => {
    
    // ARRANGE
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();
    let oneEtherLessFee = registrationFee - (1 * config.weiMultiple);

    // ACT
    let reverted = false;
    try 
    {
        await config.flightSuretyApp.fund.call({from: config.firstAirline, value: oneEtherLessFee, gasPrice: 0});
    }
    catch(e) {
      reverted = true;
    }
    let balance = await config.flightSuretyApp.getBalance.call({from: config.owner});

    // ASSERT
    assert.equal(reverted, true, "Airline fund should be atleast 10 ether.");
    assert.equal(balance, 0, "Contract balance should be 0 eth");
  
  });
 
  it('(airline) fund 1st Airline then register 2nd airline', async () => {
    // ARRANGE
    let balance = 0;
    let requiredConsensusCount = 0;
    let registeredAirlineCount = 0;
    
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();
    let registrationFeeETH = web3.utils.fromWei(registrationFee.toString(), 'ether');
    
    let firstAirlineBalance = await web3.eth.getBalance(config.firstAirline);
    let firstAirlineBalanceETH = web3.utils.fromWei(firstAirlineBalance.toString(), 'ether');
    
    let secondAirline = accounts[2];
    let secondAirlineBalance = await web3.eth.getBalance(secondAirline);
    let secondAirlineBalanceETH = web3.utils.fromWei(secondAirlineBalance.toString(), 'ether');

    // ACT
    let reverted = false;

    try 
    {
        // fund 1st
        await config.flightSuretyApp.fund({from: config.firstAirline, value: registrationFee.toString()});   
        // register and fund 2nd
        await config.flightSuretyApp.registerAirline(secondAirline, {from: config.firstAirline});
        await config.flightSuretyApp.fund({from: secondAirline, value: registrationFee.toString()});
    }
    catch(e) {
      console.log("Error:" + e);
      reverted = true;
    }
    
    // Get updated values
    balance = await config.flightSuretyApp.getBalance.call({from: config.owner});
    registeredAirlineCount = await config.flightSuretyData.getRegisteredAirlinesCount.call({from: config.owner});
    requiredConsensusCount = await config.flightSuretyData.getNextRequiredConsensusCount.call({from: config.owner});
    
    let firstAirlineNewBalance = await web3.eth.getBalance(config.firstAirline);
    let firstAirlineNewBalanceETH = web3.utils.fromWei(firstAirlineNewBalance.toString(), 'ether');
    let firstAirlineDiffBalanceETH = (firstAirlineBalanceETH - firstAirlineNewBalanceETH);

    let secondAirlineNewBalance = await web3.eth.getBalance(secondAirline);
    let secondAirlineNewBalanceETH = web3.utils.fromWei(secondAirlineNewBalance.toString(), 'ether');
    let secondAirlineDiffBalanceETH = (secondAirlineBalanceETH - secondAirlineNewBalanceETH);

    // ASSERT
    assert.equal(reverted, false, "1st Airline should have been funded.");
    assert.equal(registeredAirlineCount, 2, "Registered airlines count should be 2.");
    assert.equal(requiredConsensusCount, 0, "Required consensus count is still 0.");
    // Check balances
    assert.equal(balance.toString(), (2 * registrationFee).toString(), "Balance should only be " + registrationFeeETH);
    assert.equal(diffLessThan(firstAirlineDiffBalanceETH, registrationFeeETH, 1.0), true, "1st Airline should have only been charged 10 ETH");
    assert.equal(diffLessThan(secondAirlineDiffBalanceETH, registrationFeeETH, 1.0), true, "2nd Airline should have only been charged 10 ETH");
  });

  it('(airline) 1st Airline registers 3rd and 4th airlines', async () => {
    // ARRANGE
    let balance = 0;
    let requiredConsensusCount = 0;
    let registeredAirlineCount = 0;
    
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();
    let registrationFeeETH = web3.utils.fromWei(registrationFee.toString(), 'ether');
    
    let thirdAirline = accounts[3];
    let thirdAirlineBalance = await web3.eth.getBalance(thirdAirline);
    let thirdAirlineBalanceETH = web3.utils.fromWei(thirdAirlineBalance.toString(), 'ether');

    let fourthAirline = accounts[4];
    let fourthAirlineBalance = await web3.eth.getBalance(fourthAirline);
    let fourthAirlineBalanceETH = web3.utils.fromWei(fourthAirlineBalance.toString(), 'ether');

    // ACT
    let reverted = false;

    try 
    {
        //register and fund 3rd
        await config.flightSuretyApp.registerAirline(thirdAirline, {from: config.firstAirline});
        await config.flightSuretyApp.fund({from: thirdAirline, value: registrationFee.toString()});
        // register and fund 4th
        await config.flightSuretyApp.registerAirline(fourthAirline, {from: config.firstAirline});
        await config.flightSuretyApp.fund({from: fourthAirline, value: registrationFee.toString()});
    }
    catch(e) {
      console.log("Error:" + e);
      reverted = true;
    }
    
    // Get updated values
    balance = await config.flightSuretyApp.getBalance.call({from: config.owner});
    registeredAirlineCount = await config.flightSuretyData.getRegisteredAirlinesCount.call({from: config.owner});
    requiredConsensusCount = await config.flightSuretyData.getNextRequiredConsensusCount.call({from: config.owner});

    let thirdAirlineNewBalance = await web3.eth.getBalance(thirdAirline);
    let thirdAirlineNewBalanceETH = web3.utils.fromWei(thirdAirlineNewBalance.toString(), 'ether');
    let thirdAirlineDiffBalanceETH = (thirdAirlineBalanceETH - thirdAirlineNewBalanceETH);

    let fourthAirlineNewBalance = await web3.eth.getBalance(fourthAirline);
    let fourthAirlineNewBalanceETH = web3.utils.fromWei(fourthAirlineNewBalance.toString(), 'ether');
    let fourthAirlineDiffBalanceETH = (fourthAirlineBalanceETH - fourthAirlineNewBalanceETH);
    
    // ASSERT
    assert.equal(reverted, false, "1st Airline should have been funded.");
    assert.equal(registeredAirlineCount, 4, "Registered airlines count should be 4.");
    assert.equal(requiredConsensusCount, 2, "Next required consensus count is still 2. The 5th airline will need half of the votes");
    // Check balances
    assert.equal(balance.toString(), (4 * registrationFee).toString(), "Balance should only be " + registrationFeeETH);
    assert.equal(diffLessThan(thirdAirlineDiffBalanceETH, registrationFeeETH, 1.0), true, "3rd Airline should have only been charged 10 ETH");
    assert.equal(diffLessThan(fourthAirlineDiffBalanceETH, registrationFeeETH, 1.0), true, "4th Airline should have only been charged 10 ETH");
  });

  it('(airline) register an airline with non-registered/non-funded airline', async () => {
    // ARRANGE
    let newAirline = accounts[5];
    let airline = accounts[6];

    // ACT
    let reverted = false;

    try 
    {
        //register and fund 3rd
        await config.flightSuretyApp.registerAirline(newAirline, {from: airline});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "New airline should not have been registered by a non-registered airline");
  });

  it('(airline) firstAirline registers 5th airline and try to fund with insufficient consensus votes', async () => {
    // ARRANGE
    let newAirline = accounts[5];

    // ACT
    let reverted = false;
    let requiredConsensusCount = 0;
    let registeredAirlines = 0;
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();

    try 
    {
        // add 5th airline in the register queue
        let (success, votes) = await config.flightSuretyApp.registerAirline.call(newAirline, {from: config.firstAirline});
        requiredConsensusCount = await config.flightSuretyData.getNextRequiredConsensusCount.call({from: config.owner});
        assert.equal(success, false, "5th airline should not be marked registered.");
        assert.equal(votes, 1, "5th airline should only have 1 vote from first airline.");
        assert.equal(requiredConsensusCount, 2, "5th airline should need atleast 2 votes to be eligible for funding.");

        // Try to fund it with insufficient votes.
        await config.flightSuretyApp.fund({from: newAirline, value: registrationFee.toString()});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "New airline should NOT have been funded.");
  });

  it('(airline) firstAirline tries to re-vote for 5th airline', async () => {
    // ARRANGE
    let newAirline = accounts[5];

    // ACT
    let reverted = false;
    
    try 
    {
        // Re-vote for 5th airline. This should fail. Only succeed with unique votes.
        await config.flightSuretyApp.voteAirline.call(newAirline, {from: config.firstAirline});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "5th airline should NOT accept a re-vote of firstAirline.");
  });

  it('(airline) 5th airline gets a unique vote from another registered airline and proceeds with funding', async () => {
    // ARRANGE
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();
    let secondAirline = accounts[2];
    let newAirline = accounts[5];

    // ACT
    let reverted = false;
    
    try 
    {
      await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
      await config.flightSuretyApp.voteAirline(newAirline, {from: secondAirline});
      await config.flightSuretyApp.fund({from: newAirline, value: registrationFee.toString()});
    }
    catch(e) {
      console.log(e);
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, false, "5th airline should have been funded successfully.");
  });

  it('(airline) register a flight', async () => {
    // ARRANGE
    let registrationFee = await config.flightSuretyApp.AIRLINE_REGISTRATION_FEE.call();
    
    // ACT
    let secondAirline = accounts[2];
    let reverted = false;
    
    try 
    {
      await config.flightSuretyApp.registerFlight(config.firstAirline, "A1F1", 11);
      await config.flightSuretyApp.registerFlight(config.firstAirline, "A1F2", 12);
      await config.flightSuretyApp.registerFlight(config.firstAirline, "A1F3", 13);
      await config.flightSuretyApp.registerFlight(config.firstAirline, "A1F4", 14);
      await config.flightSuretyApp.registerFlight(config.firstAirline, "A1F5", 15);

      await config.flightSuretyApp.registerFlight(secondAirline, "A2F1", 21);
      await config.flightSuretyApp.registerFlight(secondAirline, "A2F2", 22);
      await config.flightSuretyApp.registerFlight(secondAirline, "A2F3", 23);
      await config.flightSuretyApp.registerFlight(secondAirline, "A2F4", 24);
      await config.flightSuretyApp.registerFlight(secondAirline, "A2F5", 25);
    }
    catch(e) {
      console.log(e);
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, false, "Flight registration should be successful");
  });
  
  //=========================
  // Passenger related tests
  //=========================

  it('(passenger) buy insurance more than max insurance allowed', async () => {
    // ARRANGE
    let maxInsurance = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();
    let overMaxInsurance = maxInsurance + (1 * config.weiMultiple);

    let passenger = accounts[11];
    
    // ACT
    let reverted = false;
    
    try 
    {
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "A1F1", 1, {from: passenger, value: overMaxInsurance});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "Buying flight insurance is capped at 1 ETH.");
  });

  it('(passenger) buy insurance from non-registered airline', async () => {
    // ARRANGE
    let maxInsurance = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();

    let nonRegisteredAirline = accounts[7];
    let passenger = accounts[11];
    
    // ACT
    let reverted = false;
    
    try 
    {
      await config.flightSuretyApp.buyInsurance(nonRegisteredAirline, "A1F1", 1, {from: passenger, value: maxInsurance.toString()});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "Buying insurance from non-registered airlines should not be allowed.");
  });

  it('(passenger) buy insurance from non-registered flight', async () => {
    // ARRANGE
    let maxInsurance = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();

    let passenger = accounts[11];
    
    // ACT
    let reverted = false;
    
    try 
    {
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "A1F2", 1, {from: passenger, value: maxInsurance.toString()});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "Buying insurance from non-registered flight should not be allowed.");
  });

  it('(passenger) buy insurance from registered flight', async () => {
    // ARRANGE
    let maxInsurance = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();

    let secondAirline = accounts[2];
    let passenger = accounts[11];
    let passenger2 = accounts[12];
    let passenger3 = accounts[13];


    let initialBalance = 0;
    let currentBalance = 0;
    let amountAdded = 0;
    let isInsured1 = false;
    let isInsured2 = false;
    let isInsured3 = false;

    // ACT
    let reverted = false;
    
    try 
    { 
      initialBalance = await config.flightSuretyApp.getBalance.call({from: config.owner});

      // Passenger 1 buys Airline 1 Flight 1 insurance and Airline 2 Flight 2 insurance.
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "A1F1", 11, {from: passenger, value: maxInsurance.toString()});
      await config.flightSuretyApp.buyInsurance(secondAirline, "A2F2", 22, {from: passenger, value: maxInsurance.toString()});

      // Passenger 2 buys Airline 1 Flight 1 insurance
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "A1F1", 11, {from: passenger2, value: maxInsurance.toString()});

      currentBalance = await config.flightSuretyApp.getBalance.call({from: config.owner});
      amountAdded = web3.utils.fromWei((currentBalance - initialBalance).toString(), 'ether');

      // Check if the passengers was insure successfully
      isInsured1 = await config.flightSuretyApp.isInsured.call(config.firstAirline, "A1F1", 11, passenger);
      isInsured2 = await config.flightSuretyApp.isInsured.call(secondAirline, "A2F2", 22, passenger);
      isInsured3 = await config.flightSuretyApp.isInsured.call(config.firstAirline, "A1F1", 11, passenger2);

    }
    catch(e) {
      console.log(e);
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, false, "Buying insurance from registered flight should be allowed.");
    assert.equal(amountAdded, 3, "The amount added to the contract should be 3 ETH.");
    assert.equal(isInsured1, true, "The passenger1 should have been insured for Flight A1F1");
    assert.equal(isInsured2, true, "The passenger2 should have been insured for Flight A2F2.");
    assert.equal(isInsured3, true, "The passenger3 should have been insured for Flight A2F5.");
  });

  it('(passenger) buy same insurance from the same registered flight', async () => {
    // ARRANGE
    let maxInsurance = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();

    let passenger = accounts[11];
    
    // ACT
    let reverted = false;
    
    try 
    { 
      await config.flightSuretyApp.buyInsurance(config.firstAirline, "A1F1", 1, {from: passenger, value: maxInsurance.toString()});
    }
    catch(e) {
      reverted = true;
    }
    
    // ASSERT
    assert.equal(reverted, true, "Buying same insurance from the same registered flight should NOT be allowed.");
  });

  it('(oracles) forcing submitOracleResponse() to emit processFlightStatus()', async () => {
    console.log("Forcing submitOracleResponse(), may take a moment ...")
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
    let airline = config.firstAirline;
    let flight = 'A1F1';
    let timestamp = 11;

    // ACT
    for(let a = 0; a < ORACLES_COUNT; a++) {
      let startOracleIndex = 20;
      await config.flightSuretyApp.registerOracle({from: accounts[startOracleIndex + a], value: fee});
      
      let indexes = await config.flightSuretyApp.getMyIndexes({from: accounts[startOracleIndex + a]});
      await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp, {from: accounts[startOracleIndex + a]});
      
      for (let idx = 0; idx < 9; idx++) {
        try {
          await config.flightSuretyApp.submitOracleResponse(idx, airline, flight, timestamp, STATUS_CODE_LATE_AIRLINE, {from: accounts[startOracleIndex + a]});
        } catch (e) {
        }
      }      
    }
  });

  it('(passenger) check balance after payout from delayed flight', async () => {
    let passenger = accounts[11];
    let passenger2 = accounts[12];

    let passengerPayout = web3.utils.fromWei(await config.flightSuretyData.getPayoutBalance.call(passenger), 'ether');
    let passenger2Payout = web3.utils.fromWei(await config.flightSuretyData.getPayoutBalance.call(passenger2), 'ether');

    let passengerBalance = web3.utils.fromWei(await web3.eth.getBalance(passenger), 'ether');
    let passenger2Balance = web3.utils.fromWei(await web3.eth.getBalance(passenger2), 'ether');

    // ACT
    let reverted = false;
    
    try 
    { 
      await config.flightSuretyApp.payInsuree({from: passenger});
      await config.flightSuretyApp.payInsuree({from: passenger2});
    }
    catch(e) {
      reverted = true;
    }

    let passengerNewBalance = web3.utils.fromWei(await web3.eth.getBalance(passenger), 'ether');
    let passenger2NewBalance = web3.utils.fromWei(await web3.eth.getBalance(passenger2), 'ether');

    // ASSERT
    assert.equal(diffLessThan(passengerBalance, passengerNewBalance, passengerPayout), true, "Passenger's new and previous balance difference should be relatively close to the payout amount.");
    assert.equal(diffLessThan(passenger2Balance, passenger2NewBalance, passenger2Payout), true, "Passenger2's new and previous balance difference should be relatively close to the payout amount.");

  });

  it('(passenger) pay insuree which have been paid already', async () => {
    let passenger = accounts[11];
    
    // ACT
    let reverted = false;
    
    try 
    { 
      await config.flightSuretyApp.payInsuree({from: passenger});
    }
    catch(e) {
      reverted = true;
    }

    // ASSERT
    assert.equal(reverted, true, "Passenger should not have been paid again after being paid payout amount already.");

  });

});
