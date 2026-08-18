#!/usr/bin/env python3
"""
Reconstruct a sources/ directory tree from a saved standard-json-input.json,
without hitting the Etherscan/Basescan API again.

Usage:
    python3 extract_sources.py <standard-json-input.json> [--out sources_dir]

If --out is omitted, writes to a "sources" folder next to the input file.
"""
import argparse
import json
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input_json", help="Path to standard-json-input.json")
    ap.add_argument("--out", default=None, help="Output directory (default: sources/ next to input file)")
    args = ap.parse_args()

    input_path = Path(args.input_json)
    parsed = json.loads(input_path.read_text())

    out_dir = Path(args.out) if args.out else input_path.parent / "sources"
    out_dir.mkdir(parents=True, exist_ok=True)

    sources = parsed.get("sources", {})
    if not sources:
        raise SystemExit("ERROR: no 'sources' key found — is this a standard-json-input file?")

    for path, entry in sources.items():
        content = entry.get("content", "")
        dest = out_dir / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content)

    print(f"Wrote {len(sources)} file(s) to {out_dir.resolve()}")


if __name__ == "__main__":
    main()
