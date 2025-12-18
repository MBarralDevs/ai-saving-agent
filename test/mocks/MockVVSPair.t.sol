// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract MockVVSPair {
    address public token0;
    address public token1;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        // Mock reserves (1M each)
        return (1000000e6, 1000000e6, uint32(block.timestamp));
    }

    function totalSupply() external pure returns (uint256) {
        // Mock total supply
        return 2000000e6;
    }
}
