// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// Prefunded test-token treasury. MPC-derived controller-scoped signer authorizes
/// vouchers; a separate relayer pays ETH. This contract is not a bridge.
contract FeralTreasury is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Voucher {
        bytes32 campaign; bytes32 job; bytes32 creature; address recipient;
        address token; uint256 amount; bytes32 outputHash; uint256 nonce; uint256 expiry;
    }
    bytes32 public constant VOUCHER_TYPEHASH = keccak256("Voucher(bytes32 campaign,bytes32 job,bytes32 creature,address recipient,address token,uint256 amount,bytes32 outputHash,uint256 nonce,uint256 expiry)");
    address public immutable signer;
    address public immutable supportedToken;
    uint256 public immutable perVoucherCap;
    uint256 public immutable totalCap;
    uint256 public immutable campaignCap;
    uint256 public spent;
    mapping(bytes32 => uint256) public campaignSpent;
    mapping(uint256 => bool) public usedNonces;
    mapping(bytes32 => bool) public paidJobs;
    event ToolPaid(bytes32 indexed campaign, bytes32 indexed job, bytes32 indexed creature, address recipient, address token, uint256 amount, bytes32 outputHash, uint256 nonce);
    error InvalidVoucher(); error Expired(); error Replay(); error CapExceeded(); error Unauthorized();
    constructor(address signer_, address token_, uint256 perVoucherCap_, uint256 campaignCap_, uint256 totalCap_)
        EIP712("FeralTreasury", "1") {
        require(signer_ != address(0) && token_.code.length > 0 && perVoucherCap_ > 0 && campaignCap_ >= perVoucherCap_ && totalCap_ >= campaignCap_, "configuration");
        signer = signer_; supportedToken = token_; perVoucherCap = perVoucherCap_; campaignCap = campaignCap_; totalCap = totalCap_;
    }
    function digest(Voucher memory v) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, v.campaign, v.job, v.creature, v.recipient, v.token, v.amount, v.outputHash, v.nonce, v.expiry)));
    }
    function redeem(Voucher calldata v, bytes calldata signature) external nonReentrant {
        if (block.timestamp >= v.expiry) revert Expired();
        if (v.recipient == address(0) || v.token != supportedToken || v.amount == 0 || v.outputHash == bytes32(0) || v.campaign == bytes32(0) || v.job == bytes32(0) || v.creature == bytes32(0)) revert InvalidVoucher();
        bytes32 jobKey = keccak256(abi.encode(v.campaign, v.job));
        if (usedNonces[v.nonce] || paidJobs[jobKey]) revert Replay();
        if (v.amount > perVoucherCap || spent + v.amount > totalCap || campaignSpent[v.campaign] + v.amount > campaignCap) revert CapExceeded();
        if (ECDSA.recover(digest(v), signature) != signer) revert Unauthorized();
        usedNonces[v.nonce] = true; paidJobs[jobKey] = true;
        spent += v.amount; campaignSpent[v.campaign] += v.amount;
        IERC20(v.token).safeTransfer(v.recipient, v.amount);
        emit ToolPaid(v.campaign, v.job, v.creature, v.recipient, v.token, v.amount, v.outputHash, v.nonce);
    }
}
