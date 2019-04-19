pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    // Airline registration code
    uint8 private constant REGISTRATION_CODE_UNKNOWN             = 0;
    uint8 private constant REGISTRATION_CODE_ADDED_TO_QUEUE      = 1;
    uint8 private constant REGISTRATION_CODE_VOTED_IN            = 2;
    uint8 private constant REGISTRATION_CODE_FUNDED              = 3;
    uint8 private constant REGISTRATION_CODE_REGISTERED          = 4;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/


    uint256 private constant MULTIPARTY_CONSENSUS_THRESHOLD = 4;
    
    uint constant M = 1;

    address private contractOwner;              // Account used to deploy contract
    bool private operational = true;            // Blocks all state changes throughout the contract if false
    bool private testing = false;
    
    address[] multiCalls = new address[](0);
    mapping(address => uint256) private authorizedContracts;

    //------------
    // Airlines
    struct Airline {
        uint8 registrationCode;                 // Registration phase the airline is in.
        address[] approvedBy;                   // Registered airlines which voted for the airline.
        bytes32[] flightKeys;   
    }
    mapping(address => Airline) airlines;       // Holds all the candidate airlines
    address[] registeredAirlines;               // Holds all registered airlines

    //------------
    // Flights
    struct Flight {
        bool isRegistered;
        string flight;
        uint8 statusCode;
        uint256 timestamp;
    }
    // Key = hash(airline, flight, timestamp)
    mapping(bytes32 => Flight) private flights;

    //------------
    // Users
    struct User {
        address id;
        bool isRegistered;
        uint256 payout;                         // Holds the total payout for the user.
    }
    mapping(address => User) users;

    //------------
    // Insurances
    struct Insurance {
        uint256 paidAmount;                     // Amount paid by the insuree
        bool payoutReceived;                    // The user has been credited if insurance kicked in.
        address buyerAddress;                   // Links to Users map
    }
    // Track all paid insurances
    // Key = hash(airline, flight, timestamp)
    mapping(bytes32 => Insurance[]) private insurances;
    
                                 
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        
        // Create first Airline. Mark it as Added and VotedIn. Fund it later.
        airlines[firstAirline] = Airline({
            registrationCode: REGISTRATION_CODE_VOTED_IN, 
            approvedBy: new address[](0),
            flightKeys: new bytes32[](0)
        });
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires function caller to be authorized caller.
    */
    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized caller");
        _;
    }

    /**
     * Modifier that requires an airline to be registered.
     */
    modifier requireRegisteredAirline(address airline)
    {
        if (registeredAirlines.length > 0) {
            bool isRegistered = hasEntry(registeredAirlines, airline);
            require(isRegistered, "Airline needs to be registered.");
        }
        _;
    }

    /**
     * Modifier that requires an airline to be new and has no profile yet.
     */
    modifier requireNewAirline(address newAirline)
    {
        if (registeredAirlines.length > 0) {
            bool isNew = !hasEntry(registeredAirlines, newAirline);
            require(isNew, "Airline is new and not registered.");
        }
        _;
    }

    /**
     * Modifier that requires an airline have been added.
     */
    modifier requireAddedAirline(address newAirline)
    {
        require(airlines[newAirline].registrationCode == REGISTRATION_CODE_ADDED_TO_QUEUE, "Airline should have been added to the registration queue.");
        _;
    }

    /**
     * Modifier that requires a registered airline to have not voted yet for a candidate airline.
     */
    modifier requireRegisteredAirlineNotVotedYet(address newAirline)
    {
        bool hasVoted = false;
        address registeredAirline = msg.sender;
        if (airlines[newAirline].approvedBy.length > 0) {
            for(uint c = 0; c < airlines[newAirline].approvedBy.length; c++) {
                if (airlines[newAirline].approvedBy[c] == registeredAirline) {
                    hasVoted = true;
                    break;
                }
            }
        }
        require(hasVoted == false, "Airline should not have any vote yet for.");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        require(mode != operational, "New mode must be different from existing mode");
        
        if (hasEntry(multiCalls, msg.sender) == false) {
            multiCalls.push(msg.sender);
        } else {
            require(true, "Caller has already called this function");
        }

        // This requires multi-party consensus, ie set by M variable, to enable/disable operation..
        if (multiCalls.length >= M) {
            operational = mode;
            multiCalls = new address[](0);
        }
        operational = mode;
    }

    /**
    * @dev Sets testing mode on/off
    *
    * When operational mode is disabled, all write transactions will fail
    */    
    function setTestingMode
                            (
                                bool testing_mode
                            ) 
                            external
                            requireIsOperational 
    {
        testing = testing_mode;
    }

    /**
    * @dev Adds an address to be a authorized caller.
    */   
    function authorizeCaller
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    /**
    * @dev Removes an address to be a authorized caller.
    */   
    function deauthorizeCaller
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /**
    * @dev This checks if an address appears in the list of addresses.
    */ 
    function hasEntry   (
                            address[] memory addresses, 
                            address addressToCheck
                        ) 
                        internal 
                        pure 
                        returns(bool)
    {
        bool exists = false;
        for(uint c = 0; c < addresses.length; c++) {
            if (addresses[c] == addressToCheck) {
                exists = true;
                break;
            }
        }
        return exists;
    }

    /**
    * @dev This returns the multiparty consensus required count.
    *
    * When registered airlines is < 4, consensus count is 0. Otherwise, consensus count is 
    * half the number of registered airlines.
    */ 
    function getNextRequiredConsensusCount () 
                                public 
                                view 
                                returns (uint256) 
    {
        uint256 reqConsensusCount = 0;
        if (registeredAirlines.length + 1 > MULTIPARTY_CONSENSUS_THRESHOLD) {
            reqConsensusCount = registeredAirlines.length;
            reqConsensusCount = reqConsensusCount.div(2);
        } 
        return reqConsensusCount;
    }

    /**
    * @dev This returns the contract balance.
    */ 
    function getBalance()
                        public
                        view
                        requireIsOperational
                        requireContractOwner
                        returns (uint256) 
    {
        return address(this).balance;
    }

    /**
    * @dev This returns the number of registered airlines.
    */                     
    function getRegisteredAirlinesCount()
                                        public
                                        view
                                        returns (uint256)
    {
        return registeredAirlines.length;
    }

    function getRegisteredAirlineStatusCode(/*uint8 index*/ address airline)
                                        public
                                        view
                                        returns (uint8)
    {
        return airlines[airline].registrationCode;
    }

/**
    * @dev Returns true if airline is registered. Otherwise, false.
    */ 
    function isAirline      (
                                address newAirline
                            ) 
                            external
                            view 
                            returns (bool)
    {
        return airlines[newAirline].registrationCode == REGISTRATION_CODE_REGISTERED;
    }

    /**
    * @dev Returns true if flight is registered. Otherwise, false.
    */ 
    function isFlight      (
                                address airline,
                                string flight,
                                uint256 timestamp
                            ) 
                            external
                            view 
                            returns (bool)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        return flights[flightKey].isRegistered;
        //return flights[flightKey].isRegistered;
        //return airlines[airline].flights[]
    }

    /**
    * @dev Returns true if passenger is registered.
    */ 
    function isUser
                            (
                                address passenger
                            ) 
                            external
                            view 
                            returns (bool)
    {
        return users[passenger].isRegistered;
    }

    /**
     * @dev Returns if airline is clear for funding. Only airlines that have been voted in are cleared
     *  for funding. Airlines that are only added are not cleared for funding - needs half of the registered
     *  airlines vote to get voted in.
     */
    function isAirlineClearedForFunding (
                                            address airline
                                        )
                                        external
                                        view
                                        returns (bool)
    {
        return airlines[airline].registrationCode == REGISTRATION_CODE_VOTED_IN;
    }

    function isAirlineAdded         (
                                        address airline
                                    ) 
                                    internal 
                                    view 
                                    returns (bool) 
    {
        return airlines[airline].registrationCode >= REGISTRATION_CODE_ADDED_TO_QUEUE;
    }

    function isAirlineVotedIn       (
                                        address airline
                                    ) 
                                    internal 
                                    view 
                                    returns (bool)
    {
         return airlines[airline].registrationCode >= REGISTRATION_CODE_VOTED_IN;
    }

    function isAirlineFunded        (
                                        address airline
                                    ) 
                                    internal 
                                    view 
                                    returns (bool)
    {
        return airlines[airline].registrationCode >= REGISTRATION_CODE_FUNDED;
    }

    function isAirlineRegistered    (
                                        address airline
                                    ) 
                                    internal 
                                    view 
                                    returns (bool)
    {
        return airlines[airline].registrationCode == REGISTRATION_CODE_REGISTERED;
    }

    function getAirlineStatusInfo   (
                                        address airline
                                    )
                                    external 
                                    view 
                                    returns (bool added, bool voted, bool funded, bool registered, uint256 votesNeeded)
    {
        bool isRegistered = isAirlineRegistered(airline);
        votesNeeded = isRegistered ? 0 : getNextRequiredConsensusCount() - airlines[airline].approvedBy.length;

        return (
            isAirlineAdded(airline),
            isAirlineVotedIn(airline),
            isAirlineFunded(airline),
            isRegistered,
            votesNeeded
        );
    }

    /**
    * @dev Returns vote count.
    */ 
    function voteCount      (
                                address newAirline
                            ) 
                            internal
                            view 
                            returns (uint256)
    {
        return airlines[newAirline].approvedBy.length;
    }

    /**
    * @dev Returns total payout balance for particular insuree.
    */ 
    function getPayoutBalance   (
                                    address insuree
                                )
                            external
                            view
                            returns(uint256)
    {
        return users[insuree].payout;
    }

/**
    * @dev Returns true if passenger is insured. Otherwise, false.
    *
    */ 
    function isInsured  (
                            address airline,
                            string flight,
                            uint256 timestamp,
                            address insuree
                        )
                        external
                        view
                        returns(bool)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        bool insured = false;

        Insurance[] storage paidFlightInsurances = insurances[flightKey];
        for(uint c = 0; c < paidFlightInsurances.length; c++) {
            Insurance storage insurance = paidFlightInsurances[c];
            // Check if the user hasn't been credited yet.
            if (insurance.buyerAddress == insuree && insurance.paidAmount > 0) {
                insured = true;
            }
        }
        return insured;
    }

    /**
    *  @dev Returns insurance paid by passenger for particular airline, flight and timestamp.
    */
    function getInsuredAmount  (
                            address airline,
                            string flight,
                            uint256 timestamp,
                            address insuree
                        )
                        external
                        view
                        returns(uint256)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        uint256 amount = 0;

        Insurance[] storage paidFlightInsurances = insurances[flightKey];
        for(uint c = 0; c < paidFlightInsurances.length; c++) {
            Insurance storage insurance = paidFlightInsurances[c];
            if (insurance.buyerAddress == insuree) {
                amount = insurance.paidAmount;
            }
        }
        return amount;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    //--------------------
    // Airline functions
    //--------------------

    /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    */   
    function registerAirline
                            (   
                                address airline,
                                address newAirline
                            )
                            public
                            requireRegisteredAirline(airline) 
                            requireNewAirline(newAirline)
                            //returns (bool success, uint256 votes)
    {
        // Rules for registering an airline:
        
        // Rule #1: First airline is registered and voted in.
        if (registeredAirlines.length == 0) {
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_VOTED_IN, 
                approvedBy: new address[](0),
                flightKeys: new bytes32[](0)
            });

            // success = true;
            // votes = 0;

        // Rule #2: Only existing airline may register a new airline until there are 
        //          atleast 4 airlines registered.
        } else if (registeredAirlines.length < MULTIPARTY_CONSENSUS_THRESHOLD) {
            // Mark as VotedIn by sponsor. No need for multiparty consensus yet.
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_VOTED_IN, 
                approvedBy: new address[](0),
                flightKeys: new bytes32[](0)
            });
            airlines[newAirline].approvedBy.push(airline);

        // Rule #3: Registration of 5th and subsequent airlines requires multi-party 
        //          consensus of 50% of registered airlines.
        } else {
            // Mark as Added to the queue and Voted in by sponsor
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_ADDED_TO_QUEUE,
                approvedBy: new address[](0),
                flightKeys: new bytes32[](0)
            });
            // 1st vote from sponsor, need to gather more votes.
            airlines[newAirline].approvedBy.push(airline);
            //votes = 1;
        }

        //return (success, votes);
    }

    function needsRegisteredAirline ()
                                    external
                                    returns(bool)
    {
        return registeredAirlines.length >= MULTIPARTY_CONSENSUS_THRESHOLD;
    }

    /**
    * @dev Vote an airline after its been added. 
    *       Can only be called from FlightSuretyApp contract
    */ 
    function voteAirline    (
                                address airline,
                                address newAirline
                            )
                            external
                            requireAddedAirline(newAirline)
                            requireRegisteredAirline(airline)
                            requireRegisteredAirlineNotVotedYet(newAirline)
    {
        airlines[newAirline].approvedBy.push(airline);

        // if the approved count is equal or greater than the max vote needed then mark 
        // it as voted in. Next step is to pay.
        if (airlines[newAirline].approvedBy.length >= getNextRequiredConsensusCount()) {
            airlines[newAirline].registrationCode = REGISTRATION_CODE_VOTED_IN;
        }
    }

    function hasVotedForAirline     (
                                        address airline,
                                        address newAirline
                                    )
                                    external
                                    returns (bool)
    {
        return hasEntry(airlines[newAirline].approvedBy, airline);
    }

    /**
    * @dev Adds airline as part of registered airlines and marks it as registered.
    */
    function fundAirline
                            (   
                                address airline
                            )
                            external
    {
        // Mark as Funded.
        airlines[airline].registrationCode = REGISTRATION_CODE_FUNDED;

        // Added to registered airlines
        registeredAirlines.push(airline);

        // Mark as Registered.
        airlines[airline].registrationCode = REGISTRATION_CODE_REGISTERED;
    }

    //--------------------
    // Flight functions
    //--------------------

    function getAirlineFlightKeysCount  (
                                            address airline
                                        )
                                        external
                                        view
                                        returns(uint256)
    {
        return airlines[airline].flightKeys.length;
    }

    function getAirlineFlightKey    (
                                        address airline,
                                        uint256 index
                                    )
                                    external
                                    view
                                    returns(bytes32)
    {
        return airlines[airline].flightKeys[index];
    }

    function getAirlineFlightInfo   (
                                        bytes32 flightKey
                                    )
                                    external
                                    view
                                    returns(string memory flight, uint256 timestamp)
    {
        Flight storage flightEntry = flights[flightKey];
        return (flightEntry.flight, flightEntry.timestamp);
    }

    /**
    * @dev This registers a flight.
    */ 
    function registerFlight
                            (   
                                address airline,
                                string flight,
                                uint256 timestamp,
                                bool isRegistered,
                                uint8 statusCode
                            )
                            external
                            requireRegisteredAirline(airline)
    {

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        flights[flightKey] = Flight({
            isRegistered: isRegistered,
            flight: flight,
            statusCode: statusCode,
            timestamp: timestamp
            /*updatedTimestamp: timestamp,
            airline: airline*/
        });
        
        // add a link
        airlines[airline].flightKeys.push(flightKey);
    }

    //--------------------
    // Insurance functions

    //--------------------

    /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (   
                                address insuree,  
                                address airline,
                                string flight,
                                uint256 timestamp,
                                uint256 amount       
                            )
                            external
                            payable
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        
        // Check if user has profile, otherwise, create user profile.
        if (users[insuree].id == address(0)) {
            users[insuree] = User({
                id: insuree,
                isRegistered: true,
                payout: 0
            });
        }

        insurances[flightKey].push(Insurance({buyerAddress: insuree, paidAmount: amount, payoutReceived: false}));
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address insuree
                            )
                            external
    {
        uint256 payout = users[insuree].payout;

        require(payout > 0, "Payout needs to be over 0 ETH");
        
        // Reset payee payout.
        users[insuree].payout = 0;

        // Transfer payout to payee.
        insuree.transfer(payout);
    }

    /**
    *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp 
                                )
                                external
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        Insurance[] storage paidFlightInsurances = insurances[flightKey];
        for(uint c = 0; c < paidFlightInsurances.length; c++) {
            Insurance storage insurance = paidFlightInsurances[c];
            // Check if the user has not receive payout for this insurance.
            if (insurance.payoutReceived == false && insurance.paidAmount > 0) {
                insurance.payoutReceived = true;

                uint256 paidAmount = insurance.paidAmount;
                
                // Credit user account, 1.5 times the amount paid.
                uint256 payoutAmount = paidAmount.mul(3).div(2);
                users[insurance.buyerAddress].payout = users[insurance.buyerAddress].payout.add(payoutAmount);

                // Reset paid amount in the insurance
                insurance.paidAmount = 0;
            }
        }
    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

