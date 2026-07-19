// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {NixieGenesis} from "../contracts/NixieGenesis.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function prank(address sender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
}

contract MockNix is ERC20 {
    constructor() ERC20("Mock NIX", "NIX") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract NixieGenesisTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant OWNER_KEY = 1;
    uint256 private constant SIGNER_KEY = 2;
    uint256 private constant BUYER_KEY = 3;

    function testMintRespectsSupplyPaymentAndWalletCap() external {
        address owner = vm.addr(OWNER_KEY);
        address signer = vm.addr(SIGNER_KEY);
        address buyer = vm.addr(BUYER_KEY);
        address treasury = address(0xBEEF);
        MockNix nix = new MockNix();
        NixieGenesis collection = new NixieGenesis(owner, address(nix), treasury, signer, "ipfs://collection");
        uint256 payment = 15 ether;

        nix.mint(buyer, payment);
        vm.prank(owner);
        collection.setSaleActive(true);
        vm.prank(buyer);
        nix.approve(address(collection), payment);

        NixieGenesis.MintQuote memory quote = NixieGenesis.MintQuote({
            buyer: buyer, quantity: 3, nixAmount: payment, nonce: 7, deadline: block.timestamp + 60
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, collection.quoteDigest(quote));
        vm.prank(buyer);
        collection.mint(quote, abi.encodePacked(r, s, v));

        require(collection.mintedByWallet(buyer) == 3, "wallet cap was not recorded");
        require(collection.remainingSupply() == 997, "supply pool was not reduced");
        require(nix.balanceOf(treasury) == payment, "treasury was not paid directly");
        require(collection.totalSupply() == 3, "incorrect total ERC-1155 supply");

        NixieGenesis.MintQuote memory extraQuote = NixieGenesis.MintQuote({
            buyer: buyer, quantity: 1, nixAmount: 1 ether, nonce: 8, deadline: block.timestamp + 60
        });
        (v, r, s) = vm.sign(SIGNER_KEY, collection.quoteDigest(extraQuote));
        vm.expectRevert(NixieGenesis.WalletMintLimit.selector);
        vm.prank(buyer);
        collection.mint(extraQuote, abi.encodePacked(r, s, v));

        uint256 ownedTokenId;
        for (uint256 tokenId = 1; tokenId <= 20; ++tokenId) {
            if (collection.balanceOf(buyer, tokenId) > 0) {
                ownedTokenId = tokenId;
                break;
            }
        }
        vm.prank(owner);
        collection.pause();
        vm.prank(buyer);
        collection.safeTransferFrom(buyer, address(0xCAFE), ownedTokenId, 1, "");
        require(collection.balanceOf(address(0xCAFE), ownedTokenId) == 1, "pause blocked holder transfers");
    }

    function testMetadataMustBeCompleteBeforePermanentFreeze() external {
        address owner = vm.addr(OWNER_KEY);
        MockNix nix = new MockNix();
        NixieGenesis collection =
            new NixieGenesis(owner, address(nix), address(0xBEEF), vm.addr(SIGNER_KEY), "ipfs://collection");

        vm.expectRevert(NixieGenesis.MetadataIncomplete.selector);
        vm.prank(owner);
        collection.freezeTokenMetadata();

        for (uint256 tokenId = 1; tokenId <= 20; ++tokenId) {
            vm.prank(owner);
            collection.setTokenURI(tokenId, string.concat("ipfs://metadata/", _toString(tokenId)));
        }
        vm.prank(owner);
        collection.freezeTokenMetadata();
        require(collection.tokenMetadataFrozen(), "metadata was not frozen");

        vm.expectRevert(NixieGenesis.MetadataIsFrozen.selector);
        vm.prank(owner);
        collection.setTokenURI(1, "ipfs://changed");
    }

    function testFullCollectionEndsWithExactlyFiftyOfEachCharacter() external {
        address owner = vm.addr(OWNER_KEY);
        address signer = vm.addr(SIGNER_KEY);
        MockNix nix = new MockNix();
        NixieGenesis collection = new NixieGenesis(owner, address(nix), address(0xBEEF), signer, "ipfs://collection");
        vm.prank(owner);
        collection.setSaleActive(true);

        uint256 issued;
        uint256 buyerKey = 1_000;
        while (issued < 1_000) {
            address buyer = vm.addr(buyerKey);
            uint256 quantity = 1_000 - issued >= 3 ? 3 : 1_000 - issued;
            nix.mint(buyer, quantity);
            vm.prank(buyer);
            nix.approve(address(collection), quantity);
            NixieGenesis.MintQuote memory quote = NixieGenesis.MintQuote({
                buyer: buyer, quantity: quantity, nixAmount: quantity, nonce: buyerKey, deadline: block.timestamp + 60
            });
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, collection.quoteDigest(quote));
            vm.prank(buyer);
            collection.mint(quote, abi.encodePacked(r, s, v));
            issued += quantity;
            ++buyerKey;
        }

        require(collection.remainingSupply() == 0, "random pool did not sell out");
        require(collection.totalSupply() == 1_000, "global supply is not 1,000");
        for (uint256 tokenId = 1; tokenId <= 20; ++tokenId) {
            require(collection.totalSupply(tokenId) == 50, "character supply is not exactly 50");
        }
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 copy = value;
        while (copy != 0) {
            ++digits;
            copy /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            buffer[--digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
