// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BondingCurve is ReentrancyGuard {
    IERC20 public token;
    address public creator;
    address public platform;

    uint256 public ethBalance;
    uint256 public tokenSupply;

    event Buy(address indexed buyer, uint256 ethSent, uint256 tokensReceived);
    event Sell(address indexed seller, uint256 tokensSold, uint256 ethReceived);

    constructor(address _token, address _creator, address _platform) {
        token = IERC20(_token);
        creator = _creator;
        platform = _platform;
        ethBalance = 0;
        tokenSupply = 0;
    }

    function getPrice() public view returns (uint256) {
        if (tokenSupply == 0) return 0;
        return (ethBalance * 1e18) / tokenSupply;
    }

    function getBuyAmount(uint256 ethSpent) public view returns (uint256) {
        if (ethSpent == 0) return 0;

        uint256 currentPrice = getPrice();
        uint256 newPrice = ((ethBalance + ethSpent) * 1e18) / (tokenSupply + ethSpent / currentPrice);

        uint256 priceIncrease = newPrice - currentPrice;
        uint256 avgPrice = (currentPrice + newPrice) / 2;

        uint256 tokensToAdd = ethSpent / avgPrice;
        return tokensToAdd;
    }

    function getSellAmount(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;
        if (tokenAmount > tokenSupply) return 0;

        uint256 newSupply = tokenSupply - tokenAmount;
        uint256 newEthBalance = (newSupply > 0) ? (newSupply * ethBalance) / tokenSupply : 0;
        uint256 ethToReturn = ethBalance - newEthBalance;

        return ethToReturn;
    }

    function buy() external payable nonReentrant {
        require(msg.value > 0, "ETH required");

        uint256 tokensToReceive = getBuyAmount(msg.value);
        require(tokensToReceive > 0, "Insufficient liquidity");

        ethBalance += msg.value;
        tokenSupply += tokensToReceive;

        require(token.transfer(msg.sender, tokensToReceive), "Token transfer failed");

        emit Buy(msg.sender, msg.value, tokensToReceive);
    }

    function sell(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Token amount required");
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        uint256 ethToReceive = getSellAmount(tokenAmount);
        require(ethToReceive > 0, "Insufficient liquidity");

        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        ethBalance -= ethToReceive;
        tokenSupply -= tokenAmount;

        (bool success, ) = payable(msg.sender).call{value: ethToReceive}("");
        require(success, "ETH transfer failed");

        emit Sell(msg.sender, tokenAmount, ethToReceive);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
