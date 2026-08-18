// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct KeyValue {
    string key;
    string value;
}

interface IDecentralizedApp {
    function request(string[] memory resource, KeyValue[] memory params)
        external
        view
        returns (uint16 statusCode, string memory body, KeyValue[] memory headers);
}

/// @title Site
/// @notice Serves a multi-file static site (HTML/CSS/JS, plus binary
///         assets like PNG/SVG/ICO) directly from contract storage via
///         ERC-4804 / EIP-5219, with no per-file contract deployments.
///         Each file's content is stored as an ordered list of raw byte
///         chunks, written index-by-index across many transactions (see
///         onchain/upload.js), then concatenated at read time. Storing
///         `bytes` rather than `string` keeps binary content (PNG/ICO)
///         byte-for-byte intact - the `string memory body` required by
///         IDecentralizedApp is produced with a raw `string(bytes)` cast
///         at the very end, which reinterprets the bytes rather than
///         re-encoding them, so it never corrupts non-UTF-8 image data.
contract B0xWebsiteFrontend is IDecentralizedApp {
    address public owner;

    mapping(string => bytes[]) private chunks;
    mapping(string => bool) private registered;

    error NotOwner();
    error ChunkOutOfOrder();

    event OwnershipChanged(address indexed oldOwner, address indexed newOwner);
    
    constructor() {
        owner = address(0x23400DC0cC44fb8F295fD4C73bB19528066b59f3);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }


    function setOwner(address newOwner) public onlyOwner{
        owner = newOwner;
        emit OwnershipChanged(owner, newOwner);
    }

    /// @notice Write chunk `index` of a file's content. `data` is raw
    ///         bytes, so any file type - text or binary (PNG/SVG/ICO) -
    ///         is stored and served byte-for-byte, with no encoding
    ///         applied. Idempotent: if a transaction for this exact index
    ///         was already confirmed on-chain, replaying it (e.g. after an
    ///         interrupted upload resends what it isn't sure landed) just
    ///         overwrites it with the same bytes - harmless. Only appends
    ///         (grows the file) when index equals the current length; a
    ///         gap reverts rather than silently producing a file with a
    ///         hole in it.
    function setChunk(string calldata path, uint256 index, bytes calldata data) external onlyOwner {
        bytes[] storage c = chunks[path];
        if (index < c.length) {
            c[index] = data;
        } else if (index == c.length) {
            c.push(data);
            registered[path] = true;
        } else {
            revert ChunkOutOfOrder();
        }
    }

    /// @notice Wipe a file's stored content so it can be re-uploaded from
    ///         scratch (e.g. after fixing a mistake).
    function clearFile(string calldata path) external onlyOwner {
        delete chunks[path];
        registered[path] = false;
    }

    function fileChunkCount(string calldata path) external view returns (uint256) {
        return chunks[path].length;	
    }
    

    function _content(string memory path) private view returns (bytes memory out) {
        bytes[] storage c = chunks[path];
        uint256 len = c.length;
        uint256 totalLen;
        for (uint256 i; i < len; ++i) {
            totalLen += c[i].length;
        }
        out = new bytes(totalLen);
        uint256 offset = 32; // past the length word, into `out`'s data region
        for (uint256 i; i < len; ++i) {
            bytes memory chunk = c[i]; // storage->memory copy, linear cost, fine
            uint256 chunkLen = chunk.length;
            if (chunkLen == 0) continue;
            assembly {
                let srcPtr := add(chunk, 32)
                let dstPtr := add(out, offset)
                pop(staticcall(gas(), 0x04, srcPtr, chunkLen, dstPtr, chunkLen))
            }
            offset += chunkLen;
        }
    }
    

    function _join(string[] memory resource) private pure returns (string memory) {
        if (resource.length == 0) return "index.html";
        string memory out = resource[0];
        for (uint256 i = 1; i < resource.length; ++i) {
            out = string.concat(out, "/", resource[i]);
        }
        return out;
    }

    function _endsWith(bytes memory data, bytes memory suffix) private pure returns (bool) {
        if (data.length < suffix.length) return false;
        uint256 offset = data.length - suffix.length;
        for (uint256 i; i < suffix.length; ++i) {
            if (data[offset + i] != suffix[i]) return false;
        }
        return true;
    }

    function _contentType(string memory path) private pure returns (string memory) {
        bytes memory p = bytes(path);
        if (_endsWith(p, ".html")) return "text/html; charset=utf-8";
        if (_endsWith(p, ".css")) return "text/css; charset=utf-8";
        if (_endsWith(p, ".js")) return "text/javascript; charset=utf-8";
        if (_endsWith(p, ".svg")) return "image/svg+xml";
        if (_endsWith(p, ".png")) return "image/png";
        if (_endsWith(p, ".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    function resolveMode() external pure returns (bytes32) {
        return "5219";
    }

    function request(string[] memory resource, KeyValue[] memory)
        external
        view
        returns (uint16 statusCode, string memory body, KeyValue[] memory headers)
    {
        string memory path = _join(resource);
        headers = new KeyValue[](1);

        if (!registered[path]) {
            statusCode = 404;
            body = string.concat("Not found: ", path);
            headers[0] = KeyValue("Content-Type", "text/plain; charset=utf-8");
            return (statusCode, body, headers);
        }

        statusCode = 200;
        // Raw reinterpret cast, not a re-encode: preserves binary content
        // (PNG/ICO) byte-for-byte while satisfying IDecentralizedApp's
        // `string memory body` return type.
        body = string(_content(path));
        headers[0] = KeyValue("Content-Type", _contentType(path));
    }
}