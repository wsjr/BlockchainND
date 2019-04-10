
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    // let testAddresses = [
    //     "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
    //     "0xF014343BDFFbED8660A9d8721deC985126f189F3",
    //     "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
    //     "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
    //     "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
    //     "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
    //     "0xcbd22ff1ded1423fbc24a7af2148745878800024",
    //     "0xc257274276a4e539741ca11b590b9447b26a8051",
    //     "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    // ];

    let testAddresses = [
        "0xE5DE8B35997108f7553771C335349873F3bACb51",
        "0x174d7d9a8d1bb0c61Fd35f2258D39941Ff4fA61e",
        "0x5342F770fC428Efeaa999aAbA012b3E719DE2D61",
        "0x25c3879cA46Bcc556CeD3DACad3A8d242432fED3",
        "0x25c3879cA46Bcc556CeD3DACad3A8d242432fED3",
        "0x7E5DD64718b45b7Ec0Ff1f92d34fdCa17669EaEF",
        "0x7e551DB09a04bB4893aA1B7c20Fa2C27Cf0602Ba",
        "0x3c2aEed0F4c4c75D2ea8cC7F89CBae4653A5f5B2",
        "0x95947275D40c76198fB4E067F53D9ec0d0ED5Dd4",
        "0xD7EEcaCaF8A28e111629d0C778f6CB15DCA426c4",
        "0xeb174c583b69Ff4e32fE90E615CDb0EBc9F0345F",
        "0x7f503423c1AB16002BD9695aCA7704241adCC0e6",
        "0xb24C8b0e48cA7a85a525EAD5d6999FE513138560",
        "0xeE2D9E9Bd8CA0311c6D01a5a316b0a9773f90bfe",
        "0xdC82818972054D1611562982D7a2Bea08274F707",
        "0xED8F7056F356E8190cCdFbDc5Eae4002Fc0e775C",
        "0x41B9C5e2960F2D8565267214C4573CbdF6aa0df9",
        "0xDFb910975Fc38564Cb2CB7ca9D502b24f3Ca477f",
        "0xBBfe78D2F4A95CA8a1F2BD0702D1cd1e0Ee10C1D",
        "0x23cfc5dD65F44Fd1D0bE437C22A967b9E22Df9be",
        "0x4b1E4b68F0E21D3BF2ce1081CB502aD86736781F",
        "0x6523151B35117250d9E333AA53AB2AFc136df04B",
        "0x8c1296CDbC4f0Bdf22c24434743DDeD84B75A403",
        "0x2684407077aeEAeEf14CeB8d0b754758bae1a7E1",
        "0x91f8f762fda7a9A3eB19Bb4291DC8021fe1B6B04",
        "0x7b947ddeA5FdA04f4C4cA16d69B9a344c797fA9D",
        "0xb94218787F73715831d0eBC2cE7bb7c7C20e4D18",
        "0xfebe9a39f9C274f46DA82CD10AcC992bB306f04d",
        "0x1d1F7944a470523FCE2261BF92e04612BD048B87",
        "0xE39782Df6dCC28A46ee8681A8a471531243Abd16",
        "0x64422CBF96239dd5190667eF7ae8C98ffE768d49",
        "0x7943b57a2d7c68060f74EdF58F40AaA2830B1B9F",
        "0xCe12C2826725f9Bc20728aDf154344FD5cedd32a",
        "0xbcaA792EBb59f2D4E0c9F57626b6Bc663530ff79",
        "0x871E733f2C8C3fea86340770830950446b544e6D",
        "0x8423E19FC701907F1C796DC6A15282126d2c7C83",
        "0xb36C8c7022AC348fCCD359C1131F9055fe0af133",
        "0x1Ce680F54d3C073eDb4A19c1BF5e9e09d40ff549",
        "0x3d36DE5F1e3ba976fBd71F32CD139A8020d76001",
        "0x45C9d1B34d4417E1b6e9EeAD7Ce64dD49Bfd163F",
        "0x8B3fFb9D7478A84c56Ee61e81Ab57B8F16aAd5e0",
        "0x0f803A7C6267fF58b5509F294F3EcedE74dD5912",
        "0x27Cb1058CEdF5b95ae67b023E43049B662a225Ba",
        "0xD707a06025A8B4A4056Ffd46f52613620c9320d4",
        "0xb7951281e6BCE5883A32D374CdDEDE94dAd26A1C",
        "0xdb6FEA3F0A55bE267EC6f9D81e0D15A06736310D",
        "0xC24824859017A4B042C47c05C6C68f6CE221baF8",
        "0x1dA6243e5974cE6A84712B1A4f9cbE832dAeFC10",
        "0x783D9d9F8943630B95bab198FaE18a971f36158e",
        "0x0bC26db8B80C139c78544dF76FBb4Ec7c87F6492"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};