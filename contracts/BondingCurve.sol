// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BondingCurve is ReentrancyGuard {
    IERC20 public token;
    address public creator;
    address public platform;

    event Buy(address indexed buyer, uint256 ethSent, uint256 tokensReceived);
    event Sell(address indexed seller, uint256 tokensSold, uint256 ethReceived);

    constructor(address _token, address _creator, address _platform) {
        token = IERC20(_token);
        creator = _creator;
        platform = _platform;
    }

    function getPrice() public view returns (uint256) {
        uint256 contractTokenBalance = token.balanceOf(address(this));
        uint256 contractEthBalance = address(this).balance;

        if (contractTokenBalance == 0) return 0;
        return (contractEthBalance * 1e18) / contractTokenBalance;
    }

    function getBuyAmount(uint256 ethSpent) public view returns (uint256) {
        if (ethSpent == 0) return 0;

        uint256 contractTokenBalance = token.balanceOf(address(this));
        uint256 contractEthBalance = address(this).balance;
        uint256 currentPrice = getPrice();

        // Handle initial buy when price is 0
        if (currentPrice == 0 || contractTokenBalance == 0) {
            // Initial buy: higher initial ratio for better UX
            return ethSpent * 1000;  // 1 ETH = 1000 tokens
        }

        // Standard bonding curve: linear pricing
        uint256 newEthBalance = contractEthBalance + ethSpent;
        uint256 avgPrice = (currentPrice + ((newEthBalance * 1e18) / (contractTokenBalance + ethSpent))) / 2;
        
        if (avgPrice == 0) return 0;
        uint256 tokensToAdd = ethSpent / avgPrice;
        return tokensToAdd;
    }

    function getSellAmount(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;

        uint256 contractTokenBalance = token.balanceOf(address(this));
        uint256 contractEthBalance = address(this).balance;

        if (tokenAmount > contractTokenBalance) return 0;
        if (contractTokenBalance == 0) return 0;

        // Linear bonding curve: price decreases as supply increases
        uint256 newSupply = contractTokenBalance - tokenAmount;
        uint256 ethToReturn = (contractEthBalance * tokenAmount) / contractTokenBalance;

        return ethToReturn;
    }

    function buy() external payable nonReentrant {
        require(msg.value > 0, "ETH required");

        uint256 tokensToReceive = getBuyAmount(msg.value);
        require(tokensToReceive > 0, "Insufficient liquidity");

        require(
            token.balanceOf(address(this)) >= tokensToReceive,
            "Not enough tokens in curve"
        );

        require(token.transfer(msg.sender, tokensToReceive), "Token transfer failed");

        emit Buy(msg.sender, msg.value, tokensToReceive);
    }

    function sell(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Token amount required");
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");

        uint256 ethToReceive = getSellAmount(tokenAmount);
        require(ethToReceive > 0, "Insufficient liquidity");
        require(address(this).balance >= ethToReceive, "Not enough ETH in curve");

        require(
            token.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        (bool success, ) = payable(msg.sender).call{value: ethToReceive}("");
        require(success, "ETH transfer failed");

        emit Sell(msg.sender, tokenAmount, ethToReceive);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
