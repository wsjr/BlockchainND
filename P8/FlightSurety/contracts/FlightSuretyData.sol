pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    // Airline registration code
    uint8 private constant REGISTRATION_CODE_UNKNOWN             = 0;
    uint8 private constant REGISTRATION_CODE_ADDED_TO_QUEUE      = 1;
    uint8 private constant REGISTRATION_CODE_VOTED_IN            = 2;
    uint8 private constant REGISTRATION_CODE_PAID                = 3;
    uint8 private constant REGISTRATION_CODE_REGISTERED          = 4;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/


    // Fee to be paid when registering airline
    uint256 public constant REGISTRATION_FEE = 10 ether;
    uint256 private constant MAX_INSURANCE_PAYMENT = 1 ether;
    uint256 private constant MULTIPARTY_CONSENSUS_THRESHOLD = 4;
    
    uint constant M = 1;
    uint256 private insuranceBalance = 0 ether;

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    bool private testing = false;

    address[] multiCalls = new address[](0);
    mapping(address => uint256) private authorizedContracts;

    //------------
    // Users
    struct User {
        address id;
        bool isRegistered;
        bool isAdmin;
        uint256 payout;
    }
    mapping(address => User) users;

    //------------
    // Airlines
    struct Airline {
        uint8 registrationCode;
        address[] approvedBy;
    }
    // This holds all the applicant airlines.
    mapping(address => Airline) airlines;
    // This holds all the registered airlines.
    address[] registeredAirlines;

    //------------
    // Flights
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    // Key = hash(airline, flight, timestamp)
    mapping(bytes32 => Flight) private flights;

    //------------
    // Insurances
    struct Insurance {
        uint256 paidAmount;
        User buyer;
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
            approvedBy: new address[](0)
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
        require(airlines[newAirline].registrationCode == REGISTRATION_CODE_UNKNOWN, "Airline should not have been added.");
        _;
    }

    /**
     * Modifier that requires an airline have been added.
     */
    modifier requireAddedAirline(address newAirline)
    {
        require(airlines[newAirline].registrationCode == REGISTRATION_CODE_ADDED_TO_QUEUE, "Airline should have been added.");
        _;
    }

    /**
     * Modifier that requires an airline to have not voted yet for an airline.
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

    /**
     * Modifier that requires an airline to have the funding.
     */
    modifier requireAirlineHasFunding(address newAirline)
    {
        require(newAirline.balance >= REGISTRATION_FEE, "Airline should have atleast 10 ether for registration.");
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
        
        if (hasEntry(multiCalls, msg.sender)) {
            multiCalls.push(msg.sender);
        } else {
            require(true, "Caller has already called this function");
        }

        // This requires multi-party consensus, ie set by M variable, to enable/disable operation..
        if (multiCalls.length >= M) {
            operational = mode;
            multiCalls = new address[](0);
        }
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
    function authorizeContract
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
    function deauthorizeContract
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
    function getMultiPartyConsensusRequiredCount () 
                                internal 
                                view 
                                returns (uint256) 
    {
        uint256 reqConsensusCount = 0;
        if (registeredAirlines.length > MULTIPARTY_CONSENSUS_THRESHOLD) {
            reqConsensusCount = registeredAirlines.length;
            reqConsensusCount.div(2);
        } 
        return reqConsensusCount;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address airline,
                                address newAirline
                            )
                            external
                            requireRegisteredAirline(airline) 
                            requireNewAirline(newAirline)
    {

        // Rules for registering an airline:

        // Rule #1: First airline is registered and funded immediately.
        if (registeredAirlines.length == 0) {
            // Mark as VotedIn (no need for sponsor)
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_VOTED_IN, 
                approvedBy: new address[](0)
            });

        // Rule #2: Only existing airline may register a new airline until there are 
        //          atleast 4 airlines registered.
        } else if (registeredAirlines.length <= MULTIPARTY_CONSENSUS_THRESHOLD) {
            // Mark as VotedIn by sponsor. No need for multiparty consensus yet.
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_VOTED_IN, 
                approvedBy: new address[](0)
            });
            airlines[newAirline].approvedBy.push(airline);

        // Rule #3: Registration of 5th and subsequent airlines requires multi-party 
        //          consensus of 50% of registered airlines.
        } else {
            // Mark as Added to the queue and Voted in by sponsor
            airlines[newAirline] = Airline({
                registrationCode: REGISTRATION_CODE_ADDED_TO_QUEUE,
                approvedBy: new address[](0)
            });
            // 1st vote from sponsor, need to gather more votes.
            airlines[newAirline].approvedBy.push(airline);
        }
    }

    /**
    * @dev 
    *
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
            statusCode: statusCode,
            updatedTimestamp: timestamp,
            airline: airline
        });
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
        if (airlines[newAirline].approvedBy.length >= getMultiPartyConsensusRequiredCount()) {
            airlines[newAirline].registrationCode = REGISTRATION_CODE_VOTED_IN;
        }
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
    * @dev Returns airline count.
    */ 
    function airlineCount   (
                            ) 
                            external
                            view 
                            returns (uint256)
    {
        return registeredAirlines.length;
    }

    /**
    * @dev Returns vote count.
    */ 
    function voteCount      (
                                address newAirline
                            ) 
                            external
                            view 
                            returns (uint256)
    {
        return airlines[newAirline].approvedBy.length;
    }

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
        require(amount <= MAX_INSURANCE_PAYMENT, "Maximum insurance exceeded");

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        
        // Check if user has profile, otherwise, create one.
        if (users[insuree].id == 0) {
            users[insuree] = User({
                id: insuree,
                isRegistered: true,
                isAdmin: false,
                payout: 0
            });
        }

        // Deduct amount from buyer's wallet
        contractOwner.transfer(amount);

        // Create insurance
        Insurance memory insurance = Insurance({paidAmount: amount, buyer: users[insuree]});
        insurances[flightKey].push(insurance);
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
                                view
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);

        Insurance[] storage paidFlightInsurances = insurances[flightKey];
        for(uint c = 0; c < paidFlightInsurances.length; c++) {
            Insurance storage insurance = paidFlightInsurances[c];
            User storage user = insurance.buyer;
            user.payout.add(insurance.paidAmount.mul(3).div(2));
        }
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
        require(insuranceBalance > payout, "Insurance Balance needs to be greater than payout");

        // Reset payee payout.
        users[insuree].payout = 0;

        // Transfer payout to payee.
        insuree.transfer(payout);
        
        // Update insurance balance.
        insuranceBalance.sub(payout);
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

    function fundAirline
                            (   
                                address airline,
                                uint256 amount
                            )
                            external
                            payable
    {
        require(amount >= REGISTRATION_FEE, "Registration fee is 10 ether.");
        require(airlines[airline].registrationCode > REGISTRATION_CODE_UNKNOWN, "Airline's registration code should be valid");
        
        insuranceBalance.add(REGISTRATION_FEE);

        // Transfer funding
        contractOwner.transfer(REGISTRATION_FEE);
        
        // Mark as Paid
        airlines[airline].registrationCode = REGISTRATION_CODE_PAID;

        // Added to registered airlines
        registeredAirlines.push(airline);

        // Mark as Registered.
        airlines[airline].registrationCode = REGISTRATION_CODE_REGISTERED;
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

