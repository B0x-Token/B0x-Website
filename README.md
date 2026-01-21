<div align="center">

# B0x Token DeFi dApp

![B0x Logo](images/b0x_logo.png)

**A fully decentralized DeFi front-end for B Zero X (B0x) Token**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Ethereum](https://img.shields.io/badge/Ethereum-Mainnet-3C3C3D?logo=ethereum)](https://ethereum.org)
[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?logo=coinbase)](https://base.org)

[Live Site using this Github](https://b0x-token.github.io/B0x-Website/) | [IPFS Version](https://ipfs.io/ipfs/bafybeiabg54lmpcax7jw3mzuqzky5zotsiliz3vt2landnk4qz7lrpe3uq)

</div>

---

## Features

- **Token Swaps** - Seamlessly swap tokens on Ethereum and Base networks
- **Uniswap V4 Positions** - Create and manage B0x liquidity positions
- **Staking** - Stake your Uniswap V4 positions to earn rewards alongside B0x miners
- **Multi-Chain Support** - Works on both Ethereum Mainnet and Base
- **IPFS Compatible** - Fully decentralized hosting support with content verification
- **100% Decentralized** - No backend servers, runs entirely in your browser

---

## Quick Start

### Prerequisites

- A modern web browser
- A Web3 wallet (MetaMask, etc.)

### Run Locally

#### Windows

```bash
# 1. Install Python if not already installed
# 2. Open Command Prompt and navigate to the project folder
cd path/to/B0x-Website

# 3. Start a local server
python -m http.server 8000

# 4. Open http://localhost:8000 in your browser
```

#### Linux / macOS

```bash
# Option 1: Using Python
python3 -m http.server 8000

# Option 2: Using Node.js http-server
npx http-server

# Option 3: Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

---

## Architecture

```
B0x-Website/
├── index.html          # Main application entry
├── style.css           # Styling
├── js/                 # JavaScript modules
├── images/             # Assets and logos
├── fonts/              # Custom fonts
├── ethers.umd.min.js   # Ethers.js library
└── chart.min.js        # Chart.js library
```

---

## Data Sources

| Source | URL |
|--------|-----|
| Mainnet Data | https://data.bzerox.org/mainnet/ |
| GitHub Data | https://data.github.bzerox.org/ |

## RPC Endpoints

| Network | RPC URL |
|---------|---------|
| Ethereum | https://eth.llamarpc.com |
| Base (Primary) | https://mainnet.base.org |
| Base (Fallback) | https://gateway.tenderly.co/public/base |

---

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Security

This dApp runs entirely client-side. Your private keys never leave your browser. Always verify you're on the correct URL before connecting your wallet.

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built for the B0x Community**

</div>

