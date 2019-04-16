
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {
        let firstAirline = contract.airlines[0];
        let noVoteNeededCount = 4;

        function createCheckOrCrossIcon(bIsCheck) {
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
        function reloadAirlinesInfo() {
            let elTable = DOM.elid('a-info-table');
            elTable.innerHTML = '';

            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let elTr = document.createElement("TR");
                    let elTh = document.createElement("TH");
                    elTh.setAttribute("scope", "row");
                    elTh.innerText = i + 1;
                    //elTh.innerText = airline;
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
                    // Append row to table
                    elTable.appendChild(elTr);
                });
            }    
        }
        function refreshApplicantsList() {
            // Get the applicant list element and populate it.
            let $appDropdown = $("#applicant-airlines");
            $appDropdown.empty();
            $appDropdown.append($("<option value='-1'>SELECT ONE</option>"));

            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let added = result[0];
                    if (added === false) {
                        let $option = $("<option value=" + airline + ">" + airlineIndex + "</option>");
                        $appDropdown.append($option);
                    }
                });
            }
        }
        function refreshNeedFundingAirlinesList() {
            // Get the applicant list element and populate it.
            let $needfundingDropdown = $("#needfunding-airlines");
            $needfundingDropdown.empty();
            $needfundingDropdown.append($("<option value='-1'>SELECT ONE</option>"));

            // Populate it with airlines that's not been added yet.
            for (let i = 0; i < contract.airlines.length; i++) {
                let airline = contract.airlines[i];
                let airlineIndex = i + 1;
                contract.getAirlineStatusInfo(airline, (error, result) => {
                    let voted = result[1];
                    let funded = result[2];
                    if (voted === true && funded === false) {
                        let $option = $("<option value=" + airline + ">" + airlineIndex + "</option>");
                        $needfundingDropdown.append($option);
                    }
                });
            }
        }
        function fundAndRegisterFirstAirline() {
            contract.isAirlineClearedForFunding(firstAirline, (error, result) => {
                if (result) {
                    let fee = contract.web3.utils.toWei("10", "ether");

                    contract.fundAirline(firstAirline, fee, (error, result) => {
                        if (error)
                            display('', '', [ { label: 'Fund Airline 1', error: error} ], false);
                        else
                            display('', '', [ { label: 'Fund Airline 1', value: "Successful!"} ], false);   
                        
                        // reload airlines info
                        gotoAirlineInfo();           
                    });
                } else {
                    // reload airlines info
                    gotoAirlineInfo(); 
                }
            });
        }
        function gotoAirlineInfo() {
            DOM.elid('v-pills-a-info-tab').click();
        }

        fundAndRegisterFirstAirline();
        //reloadAirlinesInfo(); 
        

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display("", "", [ { label: 'Operational Status', error: error, value: result} ], true);
            //display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ], true);
        });
    
        
        // Tabs
        DOM.elid('v-pills-a-info-tab').addEventListener('click', () => {
            reloadAirlinesInfo();
        });

        DOM.elid('v-pills-a-register-tab').addEventListener('click', () => {
            refreshApplicantsList();

            // Hide the registered airlines area if consensus count still zero
            contract.getNextRequiredConsensusCount((error, result) => {
                if (error)
                    display('', '', [ { label: 'getNextRequiredConsensusCount', error: error} ], true);
                
                // Ensure result in desired integer state.
                result = parseInt(result);

                let $regContainer = $("#registered-airlines-group");

                // Hide registered airlines group if no registered airlines exists.
                if (result === 0) {
                    $regContainer.hide();
                } else {
                    $regContainer.show();

                    let $regDropDown = $("#registered-airlines");
                    $regDropDown.empty();

                    // Populate it with registered airlines.
                    for (let i = 0; i < contract.airlines.length; i++) {
                        let airline = contract.airlines[i];
                        let airlineIndex = i + 1;
                        contract.getAirlineStatusInfo(airline, (error, result) => {
                            let registered = result[4];
                            if (registered) {
                                let $option = $("<option value=" + airline + ">" + airlineIndex + "</option>");
                                $regDropDown.append($option);
                            }
                        });
                    }
                }
            });
        });

        // Tabs
        DOM.elid('v-pills-a-fund-tab').addEventListener('click', () => {
            refreshNeedFundingAirlinesList();
        });



        //---------------
        // Airlines
        //---------------
        


        // Register
        DOM.elid('register-airline').addEventListener('click', () => {
            let $applicantAirline = $("#applicant-airlines");
            let $registeredAirline = $("#registered-airlines");
            let applicantAirlineNo = $applicantAirline.find(':selected').text();
            let applicantAirline = $applicantAirline.find(':selected').val();
            let registeredAirline = $registeredAirline.find(':selected').val() || firstAirline;
            
            // Nothing was selected. Notify the user!
            if (applicantAirline === "-1") {
                display('', '', [ { label: 'Register Airline ', error: "ERROR: No Candidate Airline Selected. Please try again."} ], true);
            } else {
                contract.registerAirline(applicantAirline, registeredAirline, (error, result) => {
                    if (error) {
                        display('', '', [ { label: 'Register Airline ' + applicantAirlineNo, error: error} ], true);
                    } else {
                        display('', '', [ { label: 'Register Airline ' + applicantAirlineNo, value: "Successful!"} ], true);

                        // Check registered airlines count, if less than consensus fund it.
                        // contract.getRegisteredAirlinesCount((error, result) => {
                        //     if (error) {
                        //         display('', '', [ { label: 'Registered Airlines Count', error: error} ], true);
                        //     } else {
                        //         if (result <= noVoteNeededCount) {
                        //             let fee = contract.web3.utils.toWei("10", "ether");
                        //             // Fund it
                        //             contract.fundAirline(applicantAirline, fee, (error, result) => {
                        //                 if (error) {
                        //                     display('', '', [ { label: 'Fund Airline ' + applicantAirlineNo, error: error} ], true);
                        //                 } else {
                        //                     display('', '', [ { label: 'Fund Airline ' + applicantAirlineNo, value: "Successful!"} ], true);

                        //                     // Go to airline info area.
                        //                     //DOM.elid('v-pills-a-info-tab').click();
                        //                     gotoAirlineInfo();
                        //                 }
                        //             });
                        //         } else {
                        //             // Go to airline info area.
                        //             //DOM.elid('v-pills-a-info-tab').click();
                        //             gotoAirlineInfo();
                        //         }
                        //     }
                        // });                        
                    }
                });
            }
        });

        // Vote
        DOM.elid('vote-airline').addEventListener('click', () => {
            let airline = DOM.elid('v-airline').value;
            window.alert("vote airline:" + airline);
            //contract.registerAirline((error, result) => {
                //display('Airlines', 'Registered Airline', [ { label: 'Count', value: result.flight + ' ' + result} ], true);
            //});
        });

        // Fund
        DOM.elid('fund-airline').addEventListener('click', () => {
            let $needFundingAirline = $("#needfunding-airlines");
            let needFundingAirlineNo = $needFundingAirline.find(':selected').text();
            let needFundingAirline = $needFundingAirline.find(':selected').val();
            let fee = contract.web3.utils.toWei("10", "ether");

            // Nothing was selected. Notify the user!
            if (needFundingAirline === "-1") {
                display('', '', [ { label: 'Funding Airline ', error: "ERROR: No Airline To Be Funded Selected. Please try again."} ], true);
            } else {
                contract.fundAirline(needFundingAirline, fee, (error, result) => {
                    if (error)
                        display('', '', [ { label: 'Fund Airline ' + needFundingAirlineNo, error: error} ], true);
                    else 
                        display('', '', [ { label: 'Fund Airline ' + needFundingAirlineNo, value: "Successful!"} ], true);

                    // Go to airline info area.
                    gotoAirlineInfo();
                    //DOM.elid('v-pills-a-info-tab').click();
                });
            }



            // let airline = DOM.elid('f-airline').value;
            // let fee = contract.web3.utils.toWei("10", "ether");
            // window.alert(airline + " " + fee);

            // contract.fundAirline(airline, fee, (error, result) => {
            //     display('Airlines', 'Fund Airline', [ { label: 'Fund Result', error: error, value: result} ], true);
            // });
        });

        // Debug
        // DOM.elid('get-airlines-count').addEventListener('click', () => {
        //     contract.getRegisteredAirlinesCount((error, result) => {
        //         display('Airlines', 'Registered Airlines Count', [ { label: 'Count', value: result} ], true);
        //     });
        // });

        // DOM.elid('get-airline-status-code').addEventListener('click', () => {
        //     let airline = DOM.elid('d-airline').value;
        //     contract.getRegisteredAirlineStatusCode(airline, (error, result) => {
        //         let statusCode = "";
        //         switch(result) {
        //             case "1":
        //                 statusCode = "Added to Queue";
        //                 break;
        //             case "2":
        //                 statusCode = "Voted In";
        //                 break;
        //             case "3":
        //                 statusCode = "Funded";
        //                 break;
        //             case "4":
        //                 statusCode = "Registered";
        //                 break;    
        //             default:
        //                 statusCode = "Unknown";
        //         }
        //         display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: statusCode} ], true);
        //     });
        // });

        // DOM.elid('get-cleared-for-funding').addEventListener('click', () => {
        //     let airline = DOM.elid('d-airline').value;
        //     contract.isAirlineClearedForFunding(airline, (error, result) => {
        //         display('Airlines', 'Funding', [ { label: 'Is cleared for funding?', error: error, value: result} ], true);
        //     });
        // });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ], true);
            });
        })
    
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







