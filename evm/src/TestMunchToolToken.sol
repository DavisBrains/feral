// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
/// Valueless local/Sepolia fixture, separate from NEAR MUNCH. No post-init mint.
contract TestMunchToolToken is ERC20 {
    constructor(address recipient, uint256 supply) ERC20("Feral Test Tool Credits", "TOOL") { _mint(recipient, supply); }
    function decimals() public pure override returns (uint8) { return 0; }
}
