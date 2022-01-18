// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import { Ownable } from "./Ownable.sol";
import { IERC20 } from "./interfaces/IERC20.sol";
import { IVault } from "./interfaces/IVault.sol";

library Errors {
    string internal constant _ZeroAddress = "Can't be the zero address";
    string internal constant _AlreadyAdded = "Vault already added";
    string internal constant _DoesNotExist = "Vault doesn't exist";
}

contract Registry is Ownable {
    struct Vault {
        uint256 id;
        IVault vault;
        IERC20 from;
        IERC20 to;
        bool isEntity;
    }

    uint256 public nextVaultId;
    mapping(uint256 => Vault) public vaults;
    mapping(IERC20 => mapping(IERC20 => IVault)) public tokensToVault;

    event AddVault(uint256 indexed id, IVault indexed vault, IERC20 from, IERC20 to);
    event RemoveVault(uint256 indexed id, IVault indexed vault, IERC20 from, IERC20 to);

    modifier vaultExists(uint256 id) {
        require(vaults[id].isEntity, Errors._DoesNotExist);
        _;
    }

    function addVault(IVault vault) external onlyOwner returns (uint256) {
        require(address(vault) != address(0), Errors._ZeroAddress);

        IERC20 from = vault.from();
        require(address(from) != address(0), Errors._ZeroAddress);

        IERC20 to = vault.to();
        require(address(to) != address(0), Errors._ZeroAddress);

        IVault existingVault = tokensToVault[from][to];
        require(address(existingVault) == address(0), Errors._AlreadyAdded);

        uint256 id = nextVaultId;
        nextVaultId++;

        vaults[id] = Vault({ id: id, vault: vault, from: from, to: to, isEntity: true });
        tokensToVault[from][to] = vault;

        emit AddVault(id, vault, from, to);

        return id;
    }

    function removeVault(uint256 id) external onlyOwner vaultExists(id) returns (bool) {
        IVault vault = vaults[id].vault;
        IERC20 from = vaults[id].from;
        IERC20 to = vaults[id].to;

        delete vaults[id];

        emit RemoveVault(id, vault, from, to);

        return true;
    }

    function getVault(uint256 id)
        external
        view
        vaultExists(id)
        returns (
            uint256,
            IVault,
            IERC20,
            IERC20,
            bool
        )
    {
        return (vaults[id].id, vaults[id].vault, vaults[id].from, vaults[id].to, vaults[id].isEntity);
    }
}
