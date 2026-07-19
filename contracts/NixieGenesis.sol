// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Nixie Genesis
/// @notice A 20-character ERC-1155 collection with 50 editions of each character.
/// @dev Prices are signed off-chain quotes. NIX is transferred directly to the treasury.
contract NixieGenesis is ERC1155, ERC1155Supply, ERC2981, Ownable, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    uint256 public constant CHARACTER_COUNT = 20;
    uint256 public constant EDITION_SUPPLY = 50;
    uint256 public constant MAX_SUPPLY = CHARACTER_COUNT * EDITION_SUPPLY;
    uint256 public constant MAX_PER_WALLET = 3;

    bytes32 private constant MINT_QUOTE_TYPEHASH =
        keccak256("MintQuote(address buyer,uint256 quantity,uint256 nixAmount,uint256 nonce,uint256 deadline)");

    struct MintQuote {
        address buyer;
        uint256 quantity;
        uint256 nixAmount;
        uint256 nonce;
        uint256 deadline;
    }

    IERC20 public immutable nix;
    address public treasury;
    address public priceSigner;
    bool public saleActive;
    bool public tokenMetadataFrozen;
    uint256 public tokenMetadataCount;
    string private _contractMetadataURI;

    uint256 public remainingSupply = MAX_SUPPLY;
    uint256 private _drawNonce;
    uint16[1000] private _pool;
    mapping(address wallet => uint256 minted) public mintedByWallet;
    mapping(bytes32 quoteHash => bool used) public usedQuotes;
    mapping(uint256 tokenId => string metadataURI) private _tokenURIs;

    event MintRevealed(address indexed buyer, uint256 indexed tokenId, uint256 indexed drawIndex);
    event SaleStatusChanged(bool active);
    event TreasuryUpdated(address indexed treasury);
    event PriceSignerUpdated(address indexed signer);
    event ContractURIUpdated();
    event TokenMetadataFrozen();

    error SaleNotActive();
    error InvalidQuantity();
    error WalletMintLimit();
    error InvalidQuote();
    error ExpiredQuote();
    error QuoteAlreadyUsed();
    error InvalidSignature();
    error InvalidAddress();
    error InvalidMetadata();
    error MetadataIncomplete();
    error MetadataIsFrozen();

    constructor(
        address initialOwner,
        address nixToken,
        address initialTreasury,
        address initialPriceSigner,
        string memory contractMetadataURI
    ) ERC1155("") Ownable(initialOwner) EIP712("Nixie Genesis", "1") {
        if (nixToken == address(0) || initialTreasury == address(0) || initialPriceSigner == address(0)) {
            revert InvalidAddress();
        }

        nix = IERC20(nixToken);
        treasury = initialTreasury;
        priceSigner = initialPriceSigner;
        _contractMetadataURI = contractMetadataURI;
        _setDefaultRoyalty(initialTreasury, 500); // 5%

        uint256 cursor;
        for (uint256 tokenId = 1; tokenId <= CHARACTER_COUNT; ++tokenId) {
            for (uint256 copy = 0; copy < EDITION_SUPPLY; ++copy) {
                _pool[cursor++] = uint16(tokenId);
            }
        }
    }

    /// @notice Mints 1–3 immediately revealed Nixies using a short-lived signed live-price quote.
    function mint(MintQuote calldata quote, bytes calldata signature) external nonReentrant whenNotPaused {
        if (!saleActive) revert SaleNotActive();
        if (quote.buyer != msg.sender || quote.quantity == 0 || quote.quantity > MAX_PER_WALLET) {
            revert InvalidQuantity();
        }
        if (mintedByWallet[msg.sender] + quote.quantity > MAX_PER_WALLET) revert WalletMintLimit();
        if (quote.deadline < block.timestamp) revert ExpiredQuote();

        bytes32 quoteHash = _quoteHash(quote);
        if (usedQuotes[quoteHash]) revert QuoteAlreadyUsed();
        if (ECDSA.recover(quoteHash, signature) != priceSigner) revert InvalidSignature();
        if (quote.quantity > remainingSupply || quote.nixAmount == 0) revert InvalidQuote();

        usedQuotes[quoteHash] = true;
        mintedByWallet[msg.sender] += quote.quantity;
        nix.safeTransferFrom(msg.sender, treasury, quote.nixAmount);

        for (uint256 i = 0; i < quote.quantity; ++i) {
            uint256 selectedIndex = _drawIndex(msg.sender);
            uint256 lastIndex = remainingSupply - 1;
            uint256 tokenId = _pool[selectedIndex];
            _pool[selectedIndex] = _pool[lastIndex];
            remainingSupply = lastIndex;

            _mint(msg.sender, tokenId, 1, "");
            emit MintRevealed(msg.sender, tokenId, selectedIndex);
        }
    }

    function remainingFor(uint256 tokenId) external view returns (uint256) {
        if (tokenId == 0 || tokenId > CHARACTER_COUNT) return 0;
        return EDITION_SUPPLY - totalSupply(tokenId);
    }

    /// @notice Returns the EIP-712 digest that the dedicated quote signer must sign.
    function quoteDigest(MintQuote calldata quote) external view returns (bytes32) {
        return _quoteHash(quote);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function contractURI() external view returns (string memory) {
        return _contractMetadataURI;
    }

    function setSaleActive(bool active) external onlyOwner {
        saleActive = active;
        emit SaleStatusChanged(active);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();
        treasury = newTreasury;
        _setDefaultRoyalty(newTreasury, 500);
        emit TreasuryUpdated(newTreasury);
    }

    function setPriceSigner(address newPriceSigner) external onlyOwner {
        if (newPriceSigner == address(0)) revert InvalidAddress();
        priceSigner = newPriceSigner;
        emit PriceSignerUpdated(newPriceSigner);
    }

    function setContractURI(string calldata newContractMetadataURI) external onlyOwner {
        _contractMetadataURI = newContractMetadataURI;
        emit ContractURIUpdated();
    }

    function setTokenURI(uint256 tokenId, string calldata metadataURI) external onlyOwner {
        if (tokenMetadataFrozen) revert MetadataIsFrozen();
        if (tokenId == 0 || tokenId > CHARACTER_COUNT) revert InvalidQuote();
        if (bytes(metadataURI).length == 0) revert InvalidMetadata();
        if (bytes(_tokenURIs[tokenId]).length == 0) ++tokenMetadataCount;
        _tokenURIs[tokenId] = metadataURI;
        emit URI(metadataURI, tokenId);
    }

    function freezeTokenMetadata() external onlyOwner {
        if (tokenMetadataCount != CHARACTER_COUNT) revert MetadataIncomplete();
        tokenMetadataFrozen = true;
        emit TokenMetadataFrozen();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _drawIndex(address buyer) private returns (uint256) {
        bytes32 entropy = keccak256(
            abi.encodePacked(block.prevrandao, blockhash(block.number - 1), buyer, _drawNonce++, remainingSupply)
        );
        return uint256(entropy) % remainingSupply;
    }

    function _quoteHash(MintQuote calldata quote) private view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    MINT_QUOTE_TYPEHASH, quote.buyer, quote.quantity, quote.nixAmount, quote.nonce, quote.deadline
                )
            )
        );
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
