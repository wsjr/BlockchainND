
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

var BigNumber = require('bignumber.js');

(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {
        const WEI_MULTIPLE = (new BigNumber(10)).pow(18);

        let firstAirline = contract.airlines[0];
        
        // Fund and register first airline
        fundAndRegisterFirstAirline();
        
        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display("", "", [ { label: 'Operational Status', error: error, value: result} ], true);
        });

        //----------------------------------------------
        function fundAndRegisterFirstAirline() {
        //----------------------------------------------    
            contract.isAirlineClearedForFunding(firstAirline, (error, result) => {
                if (result) {
                    fundAirline(firstAirline, "Airline 1");
                } else {
                    // reload airlines info
                    gotoAirlineInfo(); 
                }
            });
        }

        //----------------------------------------------
        function gotoAirlineInfo() {
        //----------------------------------------------
            DOM.elid('v-pills-a-info-tab').click();
        }

        //----------------------------------------------
        function createCheckOrCrossIcon(bIsCheck) {
        //----------------------------------------------
            let elI = document.createElement("i");
            let sCssClass = bIsCheck ? "fa fa-check" : "fa fa-times";
            let sStyle = "font-size:18px";
            if (bIsCheck) {
                sStyle += ";color:green";
            } else {
                sStyle += ";color:red";
            }
            elI.setAttribute("class", sCssClass);
            elI.setAttribute("style", sStyle);
            return elI;
        }

        //----------------------------------------------
        function reloadAirlinesInfo() {
        //----------------------------------------------    
            let elTable = DOM.elid('ai-table');
            elTable.innerHTML = '';

            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let elTr = document.createElement("TR");
                    let elTh = document.createElement("TH");
                    elTh.setAttribute("scope", "row");
                    elTh.innerText = i + 1;
                    // Append head to row
                    elTr.appendChild(elTh);
                    // Added
                    let elTdAdded = document.createElement("TD");
                    elTdAdded.appendChild(createCheckOrCrossIcon(result[0]));
                    elTr.appendChild(elTdAdded);
                    // Voted
                    let elTdVoted = document.createElement("TD");
                    elTdVoted.appendChild(createCheckOrCrossIcon(result[1]));
                    elTr.appendChild(elTdVoted);
                    // Funded
                    let elTdFunded = document.createElement("TD");
                    elTdFunded.appendChild(createCheckOrCrossIcon(result[2]));
                    elTr.appendChild(elTdFunded);
                    // Registered
                    let elTdRegistered = document.createElement("TD");
                    elTdRegistered.appendChild(createCheckOrCrossIcon(result[3]));
                    elTr.appendChild(elTdRegistered);
                    // Votes Needed
                    let elTdVotesNeeded = document.createElement("TD");
                    elTdVotesNeeded.appendChild(document.createTextNode(result[4]));
                    elTr.appendChild(elTdVotesNeeded);
                    // Append row to table
                    elTable.appendChild(elTr);
                });
            }    
        }

        //----------------------------------------------
        function cleanListByID(id) {
        //----------------------------------------------    
            let $dropdown = $("#" + id);
            $dropdown.empty();
            $dropdown.append($("<option value='-1'>SELECT ONE</option>"));
            return $dropdown;
        }

        //----------------------------------------------
        function refreshAirlineList() {
        //----------------------------------------------    
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID("ar-airlines");
            
            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let added = result[0];
                    if (added === false) {
                        let $option = $("<option value='" + airline + "'>" + airlineIndex + "</option>");
                        $dropdown.append($option);
                    }
                });
            }
        }

        //----------------------------------------------
        function refreshRegisteredAirlineList(id) {
        //----------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID(id);
            
            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let registered = result[3];
                    if (registered) {
                        let $option = $("<option value='" + airline + "'>" + airlineIndex + "</option>");
                        $dropdown.append($option);
                    }
                });
            }
        }

        //----------------------------------------------
        function refreshFlightList(id, airline) {
        //----------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID(id);
            
            contract.getAirlineStatusInfo(airline, (error, result) => {
                let registered = result[3];
                if (registered) {
                    // Get the flightkeys count 
                    contract.getAirlineFlightKeysCount(airline, (error, result) => {
                        if (!error) {
                            let count = result;
                            for (let i = 0; i < count; i++) {
                                contract.getAirlineFlightKey(airline, i, (error, result) => {
                                    if (!error) {
                                        let flightkey = result;
                                        contract.getAirlineFlightInfo(flightkey, (error, result) => {
                                            if (!error) {
                                                let flight = result.flight;
                                                let timestamp = result.timestamp;
                                                let value = flight + "###" + timestamp;
                                                let $option = $("<option value='" + value + "'>" + flight + " - " + timestamp + "</option>");
                                                $dropdown.append($option);
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }

        //----------------------------------------------
        function refreshPassengerList(id) {
        //----------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID(id);
            
            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.passengers.length; i++) {
                let passenger = contract.passengers[i];
                let passengerIndex = i + 1;

                let $option = $("<option value='" + passenger + "'>" + passengerIndex + "</option>");
                $dropdown.append($option);
            }
        }

        //----------------------------------------------
        function refreshAirlineNeedVotesList() {
        //----------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID("av-airlines");
            
            // Populate it with airlines that needs votes.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let added = result [0];
                    let votedIn = result[1];
                    if (added && !votedIn) {
                        let $option = $("<option value='" + airline + "'>" + airlineIndex + "</option>");
                        $dropdown.append($option);
                    }
                });
            }
        }

        //--------------------------------------------------------------------
        function refreshRegisteredAirlineHasNotVotedList(applicantAirline) {
        //--------------------------------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID("av-registered-airlines");

            // Populate it with airlines that needs votes.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let registered = result[3];
                    if (registered) {
                        contract.hasVotedForAirline(airline, applicantAirline, (error, result) => {
                            if (result == false) {
                                let $option = $("<option value='" + airline + "'>" + airlineIndex + "</option>");
                                $dropdown.append($option);
                            }
                        });
                    }
                });
            }
        }

        //----------------------------------------------
        function refreshAirlineNeedFundingList() {
        //----------------------------------------------
            // Get the applicant list element and populate it.
            let $dropdown = cleanListByID("af-airlines");
            
            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let voted = result[1];
                    let funded = result[2];
                    if (voted === true && funded === false) {
                        let $option = $("<option value='" + airline + "'>" + airlineIndex + "</option>");
                        $dropdown.append($option);
                    }
                });
            }
        }

        //--------------------------------------------------
        function fundAirline(airline, airlineDescription) {
        //--------------------------------------------------
            let fee = contract.web3.utils.toWei("10", "ether");

            contract.fundAirline(airline, fee, (error, result) => {
                if (error)
                    display('', '', [ { label: 'Fund ' + airlineDescription, error: error} ], false);
                else
                    display('', '', [ { label: 'Fund ' + airlineDescription, value: "Successful!"} ], false);   
                
                // reload airlines info
                gotoAirlineInfo(); 
            });
        }

        //********************************************
        //
        // TAB CLICK HANDLERS
        //
        //********************************************

        //-----------
        // Airline
        //-----------

        // Info
        DOM.elid('v-pills-a-info-tab').addEventListener('click', () => {
            reloadAirlinesInfo();
        });

        // Register
        DOM.elid('v-pills-a-register-tab').addEventListener('click', () => {
            refreshAirlineList();

            // Hide the registered airlines area if consensus count still zero
            contract.getNextRequiredConsensusCount((error, result) => {
                if (error)
                    display('', '', [ { label: 'getNextRequiredConsensusCount', error: error} ], true);
                
                // Ensure result in desired integer state.
                result = parseInt(result);

                let $regContainer = $("#ar-registered-airlines-group");

                // Hide registered airlines group if no registered airlines exists.
                if (result === 0) {
                    $regContainer.hide();
                } else {
                    $regContainer.show();

                    refreshRegisteredAirlineList("ar-registered-airlines");
                }
            });
        });

        // Vote
        DOM.elid('v-pills-a-vote-tab').addEventListener('click', () => {
            cleanListByID("av-airlines");
            cleanListByID("av-registered-airlines");

            refreshAirlineNeedVotesList();
        });

        // Fund
        DOM.elid('v-pills-a-fund-tab').addEventListener('click', () => {
            refreshAirlineNeedFundingList();
        });

        //-----------
        // Flight
        //-----------

        // Header Tab
        DOM.elid('pills-flight-tab').addEventListener('click', () => {
            cleanListByID("fr-airlines");
            refreshRegisteredAirlineList("fr-airlines");
            $("#fr-flight").value = "";
        });

        // Register
        DOM.elid('v-pills-f-register-tab').addEventListener('click', () => {
            cleanListByID("fr-airlines");
            refreshRegisteredAirlineList("fr-airlines");
            $("#fr-flight").value = "";
        });

        // Simulate
        DOM.elid('v-pills-f-simulate-tab').addEventListener('click', () => {
            // Reset and populate the airlines dropdown
            cleanListByID("fs-airlines");
            refreshRegisteredAirlineList("fs-airlines");
            // Reset flights dropdown
            cleanListByID("fs-flights");
        });

        //-----------
        // Passenger
        //-----------

        function initPassengerMainTab() {
            // Reset and populate the airlines dropdown
            cleanListByID("pb-airlines");
            refreshRegisteredAirlineList("pb-airlines");
            // Reset flights dropdown
            cleanListByID("pb-flights");
            
            // Reset and populate passengers dropdown 
            cleanListByID("pb-passengers");
            refreshPassengerList("pb-passengers");
            // Reset the amounts dropdown.
            $('#pb-amounts option:first-child').attr("selected", "selected");
        };

        // Header Tab
        DOM.elid('pills-passenger-tab').addEventListener('click', () => {
            initPassengerMainTab();
        });

        // Buy Insurance
        DOM.elid('v-pills-p-buy-tab').addEventListener('click', () => {
            initPassengerMainTab();
        });

        // Payout
        DOM.elid('v-pills-p-payout-tab').addEventListener('click', () => {
            // Reset and populate passengers dropdown 
            cleanListByID("pp-passengers");
            refreshPassengerList("pp-passengers");
        });

        //********************************************
        //
        // BUTTON CLICK HANDLERS
        //
        //********************************************

        // Airline Register
        DOM.elid('ar-register-button').addEventListener('click', () => {
            let $airlines = $("#ar-airlines");
            let $registeredAirlines = $("#ar-registered-airlines");
            let airlineDesc = $airlines.find(':selected').text();
            let airline = $airlines.find(':selected').val();
            let registeredAirline = $registeredAirlines.find(':selected').val() || firstAirline;
            
            // Nothing was selected. Notify the user!
            if (airline === "-1" || registeredAirline === "-1") {
                display('', '', [ { label: 'Register Airline ', error: "ERROR: No Airline Selected. Please try again."} ], true);
            } else {
                contract.registerAirline(airline, registeredAirline, (error, result) => {
                    let msg = 'Register Airline ' + airlineDesc;
                    if (error) {
                        display('', '', [ { label: msg, error: error} ], true);
                    } else {
                        display('', '', [ { label: msg, value: "Successful!"} ], true);

                        contract.needsRegisteredAirline((error, result) => {
                            if (error) {
                                display('', '', [ { label: 'needsRegisteredAirline', error: error} ], true);
                            } else {
                                // Consensus is need, need to get votes first.
                                if (result) {
                                    // Go to airline info area.
                                    gotoAirlineInfo();
                                // No consensus needed, fund it.
                                } else {
                                    fundAirline(airline, "Airline " + airlineDesc);
                                }
                            }
                        });                   
                    }
                });
            }
        });

        // Airline Vote
        DOM.elid('av-vote-button').addEventListener('click', () => {
            let $airlines = $("#av-airlines");
            let airlineDesc = $airlines.find(':selected').text();
            let airline = $airlines.find(':selected').val();

            let $registeredAirlines = $("#av-registered-airlines");
            let registeredAirlineDesc = $registeredAirlines.find(':selected').text();
            let registeredAirline = $registeredAirlines.find(':selected').val();
            
            if (airline === "-1" || registeredAirline === "-1") {
                display('', '', [ { label: 'Funding Airline ', error: "ERROR: No Airline selected to be voted. Please try again."} ], true);
            } else {
                contract.voteAirline(registeredAirline, airline, (error, result) => {
                    let msg = 'Airline ' + registeredAirlineDesc + ' voting for Airline ' + airlineDesc;
                    if (error)
                        display('', '', [ { label: msg, error: error} ], true);
                    else 
                        display('', '', [ { label: msg, value: "Successful!"} ], true);

                    // Go to airline info area.
                    gotoAirlineInfo();
                });
            }
        });

        // Airline Fund
        DOM.elid('af-fund-button').addEventListener('click', () => {
            let $airlines = $("#af-airlines");
            let airlineDesc = $airlines.find(':selected').text();
            let airline = $airlines.find(':selected').val();
            let fee = contract.web3.utils.toWei("10", "ether");

            // Nothing was selected. Notify the user!
            if (airline === "-1") {
                display('', '', [ { label: 'Funding Airline ', error: "ERROR: No Airline selected to be funded. Please try again."} ], true);
            } else {
                contract.fundAirline(airline, fee, (error, result) => {
                    let msg = 'Fund Airline ' + airlineDesc;
                    if (error)
                        display('', '', [ { label: msg, error: error} ], true);
                    else 
                        display('', '', [ { label: msg, value: "Successful!"} ], true);

                    // Go to airline info area.
                    gotoAirlineInfo();
                });
            }
        });

        // Flight Register
        DOM.elid('fr-register-button').addEventListener('click', () => {
            let $dropdown = $("#fr-airlines");
            let airlineDesc = $dropdown.find(':selected').text();
            let airline = $dropdown.find(':selected').val();
            let flight = $("#fr-flight")[0].value;
            let timestamp = Date.now();
            
            contract.registerFlight(airline, flight, timestamp, (error, result) => {
                let msg = 'Register Airline ' + airlineDesc + ' Flight ' + airlineDesc + " - " + timestamp;
                if (error)
                    display('', '', [ { label: msg, error: error} ], true);
                else 
                    display('', '', [ { label: msg, value: "Successful!"} ], true);
            });
        });

        // Flight Simulation

        // User-submitted transaction
        DOM.elid('fs-submit-oracle-button').addEventListener('click', () => {
            // airline
            let $airlines = $("#fs-airlines");
            let airline = $airlines.find(':selected').val();
            let airlineDesc = $airlines.find(':selected').text();
            // flight
            let flightInfo = $("#fs-flights").find(':selected').val();
            let flightDesc = $("#fs-flights").find(':selected').text();
            var aFlightInfo = flightInfo.split("###");
            let flight = aFlightInfo[0];
            let timestamp = aFlightInfo[1];

            // Write transaction
            contract.fetchFlightStatus(airline, flight, timestamp, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: 'airline: ' + result.airline + ', flight:' + result.flight + ', timestamp:' + result.timestamp} ], true);
            });
        });

        // Flight Insurance Buy
        DOM.elid('pb-buy-button').addEventListener('click', () => {
            // passenger
            let $passengers = $("#pb-passengers");
            let passenger = $passengers.find(':selected').val();
            let passengerDesc = $passengers.find(':selected').text();
            // airline
            let $airlines = $("#pb-airlines");
            let airline = $airlines.find(':selected').val();
            let airlineDesc = $airlines.find(':selected').text();
            // flight
            let flightInfo = $("#pb-flights").find(':selected').val();
            let flightDesc = $("#pb-flights").find(':selected').text();
            var aFlightInfo = flightInfo.split("###");
            let flight = aFlightInfo[0];
            let timestamp = aFlightInfo[1];
            // amount
            let amount = $("#pb-amounts").find(':selected').val();
            let amountInWei = amount * WEI_MULTIPLE;
            
            if (airline === "-1" || passenger === "-1" || flightInfo === "-1" || amount === "-1") {
                display('', '', [ { label: 'Buy Insurance ', error: "ERROR: Missing info. Please provide necessary information."} ], true);
            } else {
                contract.buyInsurance(passenger, amountInWei, airline, flight, timestamp, (error, result) => {
                    let msg = "Buy Insurance, Airline " + airlineDesc + " Flight " + flightDesc + " was bought by Passenger " + passengerDesc + " for " + amount + " ETH.";
                    if (error)
                        display('', '', [ { label: msg, error: error} ], true);
                    else 
                        display('', '', [ { label: msg, value: "Successful!"} ], true);
                });
            }
        });

        // Passenger > Payout > Check Payout button
        DOM.elid('pp-check-button').addEventListener('click', () => {
            // passenger
            let $passengers = $("#pp-passengers");
            let passenger = $passengers.find(':selected').val();
            let passengerDesc = $passengers.find(':selected').text();

            if (passenger === "-1") {
                display('', '', [ { label: 'Check Payout ', error: "ERROR: Please select a passenger"} ], true);
            } else {
                contract.checkPayoutBalance(passenger, (error, result) => {
                    let msg = "Check Payout, Passenger " + passengerDesc + " has " + (result/WEI_MULTIPLE) + " ETH payout balance";
                    if (error)
                        display('', '', [ { label: msg, error: error} ], true);
                    else 
                        display('', '', [ { label: msg, value: "Successful!"} ], true);
                });
            }
        });

        // Passenger > Payout > Withdraw Payout button
        DOM.elid('pp-withdraw-button').addEventListener('click', () => {
            // passenger
            let $passengers = $("#pp-passengers");
            let passenger = $passengers.find(':selected').val();
            let passengerDesc = $passengers.find(':selected').text();

            if (passenger === "-1") {
                display('', '', [ { label: 'Check Payout ', error: "ERROR: Please select a passenger"} ], true);
            } else {
                contract.checkPayoutBalance(passenger, (error, result1) => {
                    let ethPayout = result1/WEI_MULTIPLE;
                    let msg1 = "Check Payout, Passenger " + passengerDesc + " has " + ethPayout + " ETH payout balance";
                    if (error) {
                        display('', '', [ { label: msg1, error: error} ], true);
                    } else { 
                        contract.withdrawPayoutBalance(passenger, (error, result2) => {
                            let msg = "Withdraw Payout, Passenger " + passengerDesc + " withdrawn " + ethPayout + " ETH";
                            if (error)
                                display('', '', [ { label: msg, error: error} ], true);
                            else 
                                display('', '', [ { label: msg, value: "Successful!"} ], true);
                        });
                    }
                });
            }
        });

        //**********************
        // CHANGE HANDLERS
        //**********************

        // Airline > Vote: Applicant Airlines
        $("#av-airlines").change(function() {
            let airline = this.value;
            refreshRegisteredAirlineHasNotVotedList(airline);
        });

        // Passenger > Buy: Flight List
        $("#pb-airlines").change(function() {
            let airline = this.value;
            refreshFlightList('pb-flights', airline);
        });

        // Flight > Status: Flight List
        $("#fs-airlines").change(function() {
            let airline = this.value;
           refreshFlightList('fs-flights', airline);
        });
    });
    
})();


function display(title, description, results, bClearContainer) {
    let displayDiv = DOM.elid("display-wrapper");
    if (bClearContainer) {
        displayDiv.innerHTML = "";
    }
    let section = DOM.section();
    if (!title && !description) {
        section.appendChild(DOM.h2(title));
        section.appendChild(DOM.h5(description));
    }
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        if (result.error) {
            row.appendChild(DOM.div({className: 'col-sm-8 field-value-error'}, String(result.error)));
        } else {
            row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, String(result.value)));
        }
        section.appendChild(row);
    })
    displayDiv.append(section);

}







