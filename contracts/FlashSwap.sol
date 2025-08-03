// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

contract FlashSwap {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public factory;
    address public router;

    constructor(address _factory, address _router) {
        factory = _factory;
        router = _router;
    }

    function startArbitrage(
        address tokenBorrow,
        uint amountTokenBorrow,
        address[] calldata swapPath
    ) external {
        require(swapPath.length >= 2, "Path must have at least 2 tokens");
        require(swapPath[0] == tokenBorrow, "First token must be borrow token");

        address tokenSwapTo = swapPath[swapPath.length - 1];
        address pairAddress = IUniswapV2Factory(factory).getPair(
            tokenBorrow,
            tokenSwapTo
        );
        require(pairAddress != address(0), "Requested pair not available.");

        IUniswapV2Pair(pairAddress).swap(
            tokenBorrow == IUniswapV2Pair(pairAddress).token0()
                ? amountTokenBorrow
                : 0,
            tokenBorrow == IUniswapV2Pair(pairAddress).token1()
                ? amountTokenBorrow
                : 0,
            address(this),
            abi.encode(swapPath) // Pass the full swap path
        );
    }

    function uniswapV2Call(
        address sender,
        uint amount0,
        uint amount1,
        bytes calldata data
    ) external {
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();

        require(
            msg.sender == IUniswapV2Factory(factory).getPair(token0, token1),
            "Unauthorized"
        );

        address tokenBorrow = amount0 > 0 ? token0 : token1;
        uint amountTokenBorrow = amount0 > 0 ? amount0 : amount1;

        // Decode the swap path from data
        address[] memory swapPath = abi.decode(data, (address[]));
        address tokenSwapTo = swapPath[swapPath.length - 1];

        // Approve router to spend tokenBorrow
        IERC20(tokenBorrow).safeApprove(router, amountTokenBorrow);

        // === Use the passed swap path directly ===
        // Perform the swap via router
        uint[] memory amounts = IUniswapV2Router02(router)
            .swapExactTokensForTokens(
                amountTokenBorrow,
                0, // Accept any output amount (set slippage if needed)
                swapPath,
                address(this),
                block.timestamp
            );

        // Get the amount received from the swap
        uint amountReceived = amounts[amounts.length - 1];

        // Calculate fee and repayment amount
        uint fee = amountTokenBorrow.mul(3).div(997).add(1);
        uint amountToRepay = amountTokenBorrow.add(fee);

        // Check if we have enough tokens to repay
        uint contractBalance = IERC20(tokenSwapTo).balanceOf(address(this));
        require(
            contractBalance >= amountToRepay,
            "Insufficient funds to repay loan"
        );

        // Only check for profit if we want to enforce profitability
        // Comment out the next line if you want to allow break-even trades
        require(amountReceived > amountToRepay, "Trade not profitable");

        // Repay the loan
        IERC20(tokenSwapTo).safeTransfer(msg.sender, amountToRepay);

        // Profit remains in contract
    }

    // Helper to get token balance
    function getBalanceOfToken(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
