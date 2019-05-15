pragma solidity >=0.4.21 <0.6.0;

import 'openzeppelin-solidity/contracts/utils/Address.sol';
import './ERC721Mintable.sol';
import './verifier.sol';


// define a contract call to the zokrates generated solidity contract <Verifier> or <renamedVerifier>
contract SquareVerifier is Verifier {    
}


// define another contract named SolnSquareVerifier that inherits from your ERC721Mintable class
contract SolnSquareVerifier is RETERC721Token {

    // define a solutions struct that can hold an index & an address
    struct Solution {
        address to;
        uint256 tokenId;
    }

    // define an array of the above struct
    Solution[] solutions_list;

    // define a mapping to store unique solutions submitted
    mapping(bytes32 => Solution) private solutions_map;

    // Create an event to emit when a solution is added
    event SolutionAdded(address to, uint256 tokenId);

    // TODO Create a function to add the solutions to the array and emit the event
    function addSolution (bytes32 key, address to, uint256 tokenId) public {
        // Verify if key exists or not
        require(!_keyExists(key), "Key should not exist yet");

        Solution memory solution = Solution({
            to: to,
            tokenId: tokenId
        });

        solutions_map[key] = solution;
        solutions_list.push(solution);

        emit SolutionAdded(to, tokenId);
    }

    function _keyExists(bytes32 key) internal view returns (bool) {
        return (solutions_map[key].to != address(0));
    }

    event VerifierChange(address newVerifier);

    SquareVerifier private _verifier;

    constructor (address verifier_address) public {
        _verifier = SquareVerifier(verifier_address);
    }

    // TODO Create a function to mint new NFT only after the solution has been verified
    //  - make sure the solution is unique (has not been used before)
    //  - make sure you handle metadata as well as tokenSuplly
    function mintNewNFT(
            address to, 
            uint256 tokenId,
            uint[2] memory a,
            uint[2] memory a_p,
            uint[2][2] memory b,
            uint[2] memory b_p,
            uint[2] memory c,
            uint[2] memory c_p,
            uint[2] memory h,
            uint[2] memory k,
            uint[2] memory input) public {
        // Verify solution
        require(_verifier.verifyTx(a, a_p, b, b_p, c, c_p, h, k, input), "Verifier.verifyTx should return true");

        // Hash key
        bytes32 key = keccak256(abi.encodePacked(a, a_p, b, b_p, c, c_p, h, k, input));

        // Add solution
        addSolution(key, to, tokenId);

        // Mint
        super.mint(to, tokenId);
    }
}
  


























