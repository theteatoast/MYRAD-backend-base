// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./DataCoin.sol";

contract DataCoinFactory {
    event DataCoinCreated(address indexed creator, address indexed dataCoinAddress, string symbol, string cid);

    function createDataCoin(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256,
        string memory metadataCid_
    ) external returns (address) {
        DataCoin token = new DataCoin(name_, symbol_, 0, msg.sender, metadataCid_);

        // Grant factory + creator both admin + minter roles
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), msg.sender);
        token.grantRole(token.MINTER_ROLE(), msg.sender);

        emit DataCoinCreated(msg.sender, address(token), symbol_, metadataCid_);
        return address(token);
    }
}
