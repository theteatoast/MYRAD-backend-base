// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DataCoin is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public datasetCid;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address creator_,
        string memory cid_
    ) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);  // factory is admin
        _grantRole(MINTER_ROLE, msg.sender);         // factory can mint
        _grantRole(DEFAULT_ADMIN_ROLE, creator_);    // creator is also admin
        _grantRole(MINTER_ROLE, creator_);           // creator can mint
        datasetCid = cid_;
        if (initialSupply_ > 0) {
            _mint(creator_, initialSupply_);
        }
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnForAccess() external {
        _burn(msg.sender, balanceOf(msg.sender));
    }
}
