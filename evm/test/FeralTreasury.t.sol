// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {FeralTreasury} from "../src/FeralTreasury.sol";
import {TestMunchToolToken} from "../src/TestMunchToolToken.sol";
interface Vm {
    function addr(uint256 key) external returns(address);
    function sign(uint256 key, bytes32 digest) external returns(uint8,bytes32,bytes32);
    function expectRevert(bytes4) external;
    function expectRevert() external;
    function chainId(uint256) external;
    function warp(uint256) external;
}
contract FeralTreasuryTest {
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    // Public non-production fixture ONLY. Never used on an external chain.
    uint256 constant FIXTURE_KEY = 0xF3A1;
    address constant RECIPIENT = address(0xBEEF);
    FeralTreasury treasury; TestMunchToolToken token;
    function setUp() public {
        vm.chainId(11155111); vm.warp(1000);
        token = new TestMunchToolToken(address(this), 1000);
        treasury = new FeralTreasury(vm.addr(FIXTURE_KEY),address(token),10,20,30);
        token.transfer(address(treasury),100);
    }
    function voucher(uint256 nonce) internal view returns(FeralTreasury.Voucher memory) {
        return FeralTreasury.Voucher(bytes32(uint256(1)),bytes32(nonce+1),bytes32(uint256(3)),RECIPIENT,address(token),7,bytes32(uint256(4)),nonce,2000);
    }
    function sign(FeralTreasury.Voucher memory v) internal returns(bytes memory) {
        (uint8 vv,bytes32 r,bytes32 s) = vm.sign(FIXTURE_KEY,treasury.digest(v)); return abi.encodePacked(r,s,vv);
    }
    function testValidVoucherPays() public { FeralTreasury.Voucher memory v=voucher(0); treasury.redeem(v,sign(v)); require(token.balanceOf(RECIPIENT)==7 && treasury.spent()==7); }
    function testReplayRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); treasury.redeem(v,sig); vm.expectRevert(FeralTreasury.Replay.selector); treasury.redeem(v,sig); }
    function testJobReplayWithFreshNonceRefused() public { FeralTreasury.Voucher memory v=voucher(0); treasury.redeem(v,sign(v)); v.nonce=99; bytes memory sig=sign(v); vm.expectRevert(FeralTreasury.Replay.selector); treasury.redeem(v,sig); }
    function testWrongChainRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); vm.chainId(1); vm.expectRevert(FeralTreasury.Unauthorized.selector); treasury.redeem(v,sig); }
    function testWrongTreasuryRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); FeralTreasury other = new FeralTreasury(vm.addr(FIXTURE_KEY),address(token),10,20,30); vm.expectRevert(FeralTreasury.Unauthorized.selector); other.redeem(v,sig); }
    function testPerVoucherCap() public { FeralTreasury.Voucher memory v=voucher(0); v.amount=11; bytes memory sig=sign(v); vm.expectRevert(FeralTreasury.CapExceeded.selector); treasury.redeem(v,sig); }
    function testCampaignCap() public { for(uint256 i;i<2;i++){ FeralTreasury.Voucher memory v=voucher(i); v.amount=10; treasury.redeem(v,sign(v)); } FeralTreasury.Voucher memory v=voucher(2); bytes memory sig=sign(v); vm.expectRevert(FeralTreasury.CapExceeded.selector); treasury.redeem(v,sig); }
    function testTotalCap() public { for(uint256 i;i<3;i++){ FeralTreasury.Voucher memory v=voucher(i); v.amount=10; v.campaign=bytes32(i+1); treasury.redeem(v,sign(v)); } FeralTreasury.Voucher memory v=voucher(4); v.campaign=bytes32(uint256(5)); bytes memory sig=sign(v); vm.expectRevert(FeralTreasury.CapExceeded.selector); treasury.redeem(v,sig); }
    function testExpiredRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); vm.warp(v.expiry); vm.expectRevert(FeralTreasury.Expired.selector); treasury.redeem(v,sig); }
    function testChangedRecipientRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); v.recipient=address(99); vm.expectRevert(FeralTreasury.Unauthorized.selector); treasury.redeem(v,sig); }
    function testChangedAmountRefused() public { FeralTreasury.Voucher memory v=voucher(0); bytes memory sig=sign(v); v.amount=8; vm.expectRevert(FeralTreasury.Unauthorized.selector); treasury.redeem(v,sig); }
    function testWrongTokenRefused() public { FeralTreasury.Voucher memory v=voucher(0); v.token=address(1); bytes memory sig=sign(v); vm.expectRevert(FeralTreasury.InvalidVoucher.selector); treasury.redeem(v,sig); }
    function testBadSignatureRefused() public { FeralTreasury.Voucher memory v=voucher(0); (uint8 vv,bytes32 r,bytes32 s)=vm.sign(99,treasury.digest(v)); bytes memory sig=abi.encodePacked(r,s,vv); vm.expectRevert(FeralTreasury.Unauthorized.selector); treasury.redeem(v,sig); }
    function testTransferFailureRollsBackNonce() public { FeralTreasury empty = new FeralTreasury(vm.addr(FIXTURE_KEY),address(token),10,20,30); FeralTreasury.Voucher memory v=voucher(0); (uint8 vv,bytes32 r,bytes32 s)=vm.sign(FIXTURE_KEY,empty.digest(v)); bytes memory sig=abi.encodePacked(r,s,vv); vm.expectRevert(); empty.redeem(v,sig); require(!empty.usedNonces(0) && empty.spent()==0); }
}
