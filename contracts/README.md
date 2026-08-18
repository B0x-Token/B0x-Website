# Verified contract sources

Verified Solidity source, as downloaded from Basescan/Etherscan, for every
contract this site references. Each contract has its own subfolder
(`<Label>_<address>/`) containing `metadata.json` and `standard-json-input.json`
(and, where available, a `sources/` tree with the exact reconstructed
`.sol` files). Fetched with `download_contract.py`; `extract_sources.py` can
rebuild a `sources/` tree from any `standard-json-input.json` without
hitting the explorer API again.

## Contracts

| Folder | Contract name | Address | Chain | Compiler | Optimization | EVM | viaIR |
|---|---|---|---|---|---|---|---|
| `0xBitcoin_Token_0xBTC_0xc4d4fd4f4459730d176844c170f2bb323c87eb3b` | `OptimismMintableERC20` | `0xc4d4fd4f4459730d176844c170f2bb323c87eb3b` | Base (8453) | `v0.8.15+commit.e14f2714` | enabled, 999999 runs | Default | False |
| `B0x_Guess_0x57da35b42b97908255d5b1655dac6ed936fc3668` | `B0xGuess` | `0x57da35b42b97908255d5b1655dac6ed936fc3668` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `B0x_LP_Staking_Contract_0x08f489c5017942d3b7c82c1c178877c80492c948` | `B0x_LP_Rewards` | `0x08f489c5017942d3b7c82c1c178877c80492c948` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `B0x_Mainnet_Eth_Contract_0x1f8f212540b31b37f40d8c57b5c7d8b55bf25919` | `B0x_Mainnet` | `0x1f8f212540b31b37f40d8c57b5c7d8b55bf25919` | Ethereum (1) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `B0x_Token_0x6b19e31c1813cd00b0d47d798601414b79a3e8ad` | `OptimismMintableERC20` | `0x6b19e31c1813cd00b0d47d798601414b79a3e8ad` | Base (8453) | `v0.8.15+commit.e14f2714` | enabled, 999999 runs | Default | False |
| `B0x_Uniswap_Router_0x6c6b14b49cb4e9771c555689c2d11af9a7500a6f` | `UniswapV4Swap` | `0x6c6b14b49cb4e9771c555689c2d11af9a7500a6f` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `Decentralized_FrontEnd_On_Optimsim_0x0000000000b28e06c885024db22265b2536b24cc` | `B0xWebsiteFrontend` | `0x0000000000b28e06c885024db22265b2536b24cc` | Optimism (10) | `v0.8.28+commit.7893614a` | enabled, 200 runs | Default | False |
| `Position_Finder_Helper_Contract_0xe75af8215042b1919b1b1d38db72c0de56a5aebe` | `positionFinderPro2` | `0xe75af8215042b1919b1b1d38db72c0de56a5aebe` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `PoW_Mining_Address_0xd44ee7dadbf50214ca7009a29d9f88bccd0e9ff4` | `B0x_Mining_Proof_of_Work` | `0xd44ee7dadbf50214ca7009a29d9f88bccd0e9ff4` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `Timelock_Factory_0xff054c399444d64bd772ca4efe71c6449e08c955` | `TimeLockFactory` | `0xff054c399444d64bd772ca4efe71c6449e08c955` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `Uniswap_Hook_Address_0x785319f8fce23cd733de94fd7f34b74a5caa1000` | `UniV4Hook` | `0x785319f8fce23cd733de94fd7f34b74a5caa1000` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |
| `Uniswapv4PoolCreator_0x80d68014e12c76b60dba69c4d33e0ced06f602ef` | `UniswapV4PoolCreator` | `0x80d68014e12c76b60dba69c4d33e0ced06f602ef` | Base (8453) | `v0.8.28+commit.7893614a` | enabled, 200 runs | paris | True |

Constructor arguments, proxy status, and other per-contract fields not shown
above are in each contract's own `metadata.json`.

## How to verify on another explorer

Files are laid out under each contract's `sources/` using the exact relative
paths reported by Basescan, so imports resolve the same way they did
originally.

**Preferred method (most reliable — reproduces exact bytecode):**
Use that contract's `standard-json-input.json` directly.
- Sourcify: https://sourcify.dev/#/verifier -> "Standard JSON Input" tab
- Blockscout: contract page -> Verify -> "Solidity (Standard JSON Input)"
- Etherscan-family explorers: verify page -> "Solidity (Standard-Json-Input)",
  paste/upload `standard-json-input.json`, and set the compiler version from
  the table above.

**Fallback (multi-file / flattened):**
If there's no `standard-json-input.json` for a contract, use the files under
its `sources/` with the "Solidity (Multi-Part file)" or single-file
verification option, matching the compiler version, optimization, runs, and
EVM version from the table above. If constructor arguments are non-empty
(see that contract's `metadata.json`), supply them as ABI-encoded constructor
arguments (hex, no `0x` prefix needed on most forms).

If a contract is a **proxy**, verify the implementation contract separately
(see `implementation_address` in its `metadata.json`) — the proxy itself
usually has trivial bytecode.
