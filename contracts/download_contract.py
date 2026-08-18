#!/usr/bin/env python3
"""
Download verified Solidity source code for a contract from Basescan (or any
Etherscan-family explorer, via the unified Etherscan V2 API) in a form that's
easy to re-verify on other block explorers (Sourcify, Blockscout, Etherscan
clones, etc).

Usage:
    python3 download_contract.py <address> [--chainid 8453] [--out DIR]

Requires ETHERSCAN_API_KEY in a .env file (or the environment). Etherscan's
V2 API accepts one API key across all supported chains (Base = chainid 8453).
"""
import argparse
import json
import os
import sys
from pathlib import Path

import requests

API_URL = "https://api.etherscan.io/v2/api"


def load_api_key():
    key = os.environ.get("ETHERSCAN_API_KEY")
    if key:
        return key
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("ETHERSCAN_API_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit("ERROR: ETHERSCAN_API_KEY not found in environment or .env")


def fetch_source(address, chainid, api_key):
    params = {
        "chainid": chainid,
        "module": "contract",
        "action": "getsourcecode",
        "address": address,
        "apikey": api_key,
    }
    r = requests.get(API_URL, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "1":
        sys.exit(f"ERROR: API returned: {data.get('message')} / {data.get('result')}")
    result = data["result"][0]
    if not result.get("SourceCode"):
        sys.exit("ERROR: contract is not verified (no source code available).")
    return result


def parse_source_code(raw_source):
    """
    Returns (kind, parsed) where kind is one of:
      'standard-json'  -> parsed is the full standard-json-input dict
      'multi-file'     -> parsed is {path: content}
      'single-file'    -> parsed is raw solidity text
    """
    text = raw_source.strip()
    # Etherscan wraps standard-json-input sources in double braces: {{ ... }}
    if text.startswith("{{") and text.endswith("}}"):
        inner = text[1:-1]
        parsed = json.loads(inner)
        return "standard-json", parsed
    if text.startswith("{"):
        # Could be a plain multi-file map {"File.sol": {"content": "..."}}
        # or (rarely) a standard-json-input without the double-brace wrapping.
        parsed = json.loads(text)
        if "sources" in parsed and "language" in parsed:
            return "standard-json", parsed
        return "multi-file", parsed
    return "single-file", text


def write_sources(kind, parsed, contract_name, sources_dir: Path):
    sources_dir.mkdir(parents=True, exist_ok=True)
    if kind == "standard-json":
        for path, entry in parsed.get("sources", {}).items():
            content = entry.get("content", "")
            dest = sources_dir / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content)
    elif kind == "multi-file":
        for path, entry in parsed.items():
            content = entry.get("content", "") if isinstance(entry, dict) else str(entry)
            dest = sources_dir / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content)
    else:  # single-file
        name = f"{contract_name or 'Contract'}.sol"
        (sources_dir / name).write_text(parsed)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("address", help="Contract address on Base")
    ap.add_argument("--chainid", default=8453, type=int, help="Chain ID (default: 8453 = Base mainnet)")
    ap.add_argument("--out", default=None, help="Output directory (default: ./<address>)")
    ap.add_argument("--label", default=None, help="Human-readable label for this contract (used in folder name / README)")
    ap.add_argument("--raw", action="store_true", help="Also save the raw getsourcecode API response (debugging only, not needed for verification)")
    args = ap.parse_args()

    address = args.address.lower()
    api_key = load_api_key()

    print(f"Fetching source for {address} on chainid {args.chainid} ...")
    result = fetch_source(address, args.chainid, api_key)

    if args.out:
        out_dir = Path(args.out)
    elif args.label:
        slug = "".join(c if c.isalnum() or c in "-_" else "_" for c in args.label).strip("_")
        out_dir = Path(f"{slug}_{address}")
    else:
        out_dir = Path(address)
    out_dir.mkdir(parents=True, exist_ok=True)

    contract_name = result.get("ContractName") or "Contract"
    kind, parsed = parse_source_code(result["SourceCode"])

    # 1. Reconstruct the original source tree (exact relative import paths
    #    matter for re-verification, especially for multi-file contracts).
    sources_dir = out_dir / "sources"
    write_sources(kind, parsed, contract_name, sources_dir)

    # 2. If it's standard-json-input, save the raw file too. This is the
    #    single most portable artifact for verifying elsewhere: Sourcify and
    #    Blockscout both accept a raw "Solidity (Standard JSON Input)" upload
    #    that reproduces the exact same bytecode.
    if kind == "standard-json":
        (out_dir / "standard-json-input.json").write_text(json.dumps(parsed, indent=2))

    # 3. (optional) Save full raw API response for reference / debugging.
    if args.raw:
        (out_dir / "raw_getsourcecode_response.json").write_text(json.dumps(result, indent=2))

    # 4. Save a compact metadata.json with everything needed to fill in a
    #    manual verification form on another explorer.
    # viaIR and other fine-grained compiler settings aren't returned as top
    # -level fields by the getsourcecode API — they only exist inside the
    # standard-json-input "settings" block, so pull them out from there.
    settings = parsed.get("settings", {}) if kind == "standard-json" else {}
    metadata = {
        "address": address,
        "chainid": args.chainid,
        "label": args.label or "",
        "contract_name": contract_name,
        "compiler_version": result.get("CompilerVersion"),
        "optimization_used": result.get("OptimizationUsed") == "1",
        "optimization_runs": result.get("Runs"),
        "evm_version": result.get("EVMVersion") or "default",
        "via_ir": settings.get("viaIR", False),
        "metadata_bytecode_hash": (settings.get("metadata") or {}).get("bytecodeHash", "default"),
        "license_type": result.get("LicenseType"),
        "constructor_arguments": result.get("ConstructorArguments") or "",
        "library_used": result.get("Library") or "",
        "proxy": result.get("Proxy") == "1",
        "implementation_address": result.get("Implementation") or "",
        "source_format": kind,
    }
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))

    # 5. Human-readable README with verification instructions.
    label_line = f"\n**Label:** {args.label}\n" if args.label else ""
    readme = f"""# {contract_name}
{label_line}
Downloaded from Basescan (Base, chainid {args.chainid}) for address `{address}`.

## Compiler settings (needed to reproduce identical bytecode)

| Field | Value |
|---|---|
| Contract name | `{contract_name}` |
| Compiler version | `{metadata['compiler_version']}` |
| Optimization | `{'enabled' if metadata['optimization_used'] else 'disabled'}` |
| Optimization runs | `{metadata['optimization_runs']}` |
| EVM version | `{metadata['evm_version']}` |
| viaIR | `{metadata['via_ir']}` |
| Metadata bytecode hash | `{metadata['metadata_bytecode_hash']}` |
| License | `{metadata['license_type']}` |
| Constructor arguments (ABI-encoded, hex) | `{metadata['constructor_arguments'] or '(none)'}` |
| Proxy contract | `{metadata['proxy']}` |
| Implementation address | `{metadata['implementation_address'] or '(n/a)'}` |

Source format detected: **{kind}**.

## How to verify on another explorer

Files are laid out under `sources/` using the exact relative paths reported
by Basescan, so imports resolve the same way they did originally.

**Preferred method (most reliable — reproduces exact bytecode):**
If `standard-json-input.json` exists in this folder, upload it directly.
- Sourcify: https://sourcify.dev/#/verifier -> "Standard JSON Input" tab
- Blockscout: contract page -> Verify -> "Solidity (Standard JSON Input)"
- Etherscan-family explorers: verify page -> "Solidity (Standard-Json-Input)",
  paste/upload `standard-json-input.json`, and set the compiler version above.

**Fallback (multi-file / flattened):**
If there's no `standard-json-input.json`, use the files under `sources/`
with the "Solidity (Multi-Part file)" or single-file verification option,
matching the compiler version, optimization, runs, and EVM version above.
If `constructor_arguments` is non-empty, supply it as the ABI-encoded
constructor arguments (hex, no `0x` prefix needed on most forms).

If this is a **proxy contract** ({metadata['proxy']}), verify the
implementation contract at `{metadata['implementation_address'] or '(see Basescan)'}`
separately — the proxy itself usually has trivial bytecode.
"""
    (out_dir / "README.md").write_text(readme)

    print(f"Done. Contract: {contract_name}")
    print(f"Compiler: {metadata['compiler_version']}  Optimization: {metadata['optimization_used']} ({metadata['optimization_runs']} runs)  EVM: {metadata['evm_version']}")
    print(f"Output written to: {out_dir.resolve()}")


if __name__ == "__main__":
    main()
