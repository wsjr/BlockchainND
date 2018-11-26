pragma solidity ^0.4.23;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        string starStory;
        string ra;
        string dec;
        string mag;
    }

    mapping(uint256 => Star) public starIdToStarInfo; 
    mapping(uint256 => uint256) public starsForSale;
    mapping(uint256 => uint256) public hashedCoordsToStarId;

    function createStar(string _name, string _starStory, string _ra, string _dec, string _mag, uint256 _starId) public { 
        // Make sure the ID is not taken
        require(checkIfStarExist(_starId) == false);

        // Hash for uniqueness using coordinates
        uint256 hashedCoords = _getHashedCoords(_ra, _dec, _mag);
        // Make sure star doesn't exist yet
        require(hashedCoordsToStarId[hashedCoords] == 0);
        hashedCoordsToStarId[hashedCoords] = _starId;

        Star memory newStar = Star(_name, _starStory, _ra, _dec, _mag);

        starIdToStarInfo[_starId] = newStar;

        _mint(msg.sender, _starId);
    }

    function putStarUpForSale(uint256 _starId, uint256 _price) public { 
        require(this.ownerOf(_starId) == msg.sender);

        starsForSale[_starId] = _price;
    }

    function buyStar(uint256 _starId) public payable { 
        require(starsForSale[_starId] > 0);
        
        uint256 starCost = starsForSale[_starId];
        address starOwner = this.ownerOf(_starId);
        require(msg.value >= starCost);

        _removeTokenFrom(starOwner, _starId);
        _addTokenTo(msg.sender, _starId);
        
        starOwner.transfer(starCost);

        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function tokenIdToStarInfoken(uint256 _starId) public view returns (string _name, string _starStory, string _ra, string _dec, string _mag) {
        require(bytes(starIdToStarInfo[_starId].name).length > 0);

        Star memory currentStar = starIdToStarInfo[_starId];
        _name = currentStar.name;
        _starStory = currentStar.starStory;
        _ra = currentStar.ra;
        _dec= currentStar.dec;
        _mag = currentStar.mag;
    }

    function checkIfStarExist(uint256 _starId) public view returns (bool) {
        bool exists = bytes(starIdToStarInfo[_starId].name).length > 0 && _exists(_starId);
        return exists;
    }

    /**
     * Private methods
     */
    function _concatCoords(string _ra, string _dec, string _mag) internal pure returns (string) {
        return string(abi.encodePacked(_ra, _dec, _mag));
    }

    function _getHashedCoords(string _ra, string _dec, string _mag) internal pure returns (uint256) {
        return uint256(keccak256(bytes(_concatCoords(_ra, _dec, _mag))));
    }

    // Found this function here: https://ethereum.stackexchange.com/questions/10932/how-to-convert-string-to-int
    function _stringToUint(string s) internal pure returns (uint) {
        bytes memory b = bytes(s);
        uint result = 0;
        for (uint i = 0; i < b.length; i++) { // c = b[i] was not needed
            if (b[i] >= 48 && b[i] <= 57) {
                result = result * 10 + (uint(b[i]) - 48); 
                // bytes and int are not compatible with the operator -.
            }
        }
        return result;
    }
}