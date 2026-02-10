# NFT Portfolio App

> React Native app for viewing and organizing NFTs across multiple wallets (EVM + Solana) with intelligent organization features for Farcaster mints and custom sorting.

## Features

### Multi-Chain Support
- **EVM Networks**: Ethereum, Polygon, Arbitrum, Optimism, Base, and more via Alchemy API
- **Solana**: Full support including compressed NFTs via Helius DAS API
- **Multi-Wallet**: Add unlimited wallets across both EVM and Solana chains
- **Unified View**: See all your NFTs in one place with consistent formatting

### Smart Organization
- **Auto-Collections**: Automatically group NFTs by collection with metadata and floor prices
- **Farcaster Detection**: Intelligent detection of Farcaster channel mints with auto-grouping
- **Custom Groups**: Create your own folders and tags to organize NFTs your way
- **Multiple Sort Modes**: 
  - By Collection (grouped alphabetically)
  - By Farcaster (FC mints at top)
  - By Recent (newest first)
  - By Value (floor price descending)

### Performance & UX
- **High-Performance Lists**: FlashList for smooth scrolling with thousands of NFTs
- **Smart Caching**: React Query for intelligent data fetching and caching
- **Offline Access**: SQLite database for viewing NFTs without internet
- **Image Optimization**: CloudFlare proxy for fast IPFS/Arweave image loading
- **Responsive Design**: Optimized for both iOS and Android

## Tech Stack

### Core
- **React Native** with **TypeScript** - type-safe mobile development
- **Expo** (managed workflow) - faster development and deployment
- **React Navigation** v6 - navigation and routing

### State & Data
- **Zustand** - lightweight state management
- **React Query** - data fetching, caching, and synchronization
- **AsyncStorage** - persistent wallet and preference storage
- **MMKV** - high-performance key-value storage
- **SQLite** (expo-sqlite) - local NFT database

### UI & Performance
- **FlashList** (@shopify/flash-list) - high-performance lists
- **React Native Reanimated** - smooth animations
- **React Native Fast Image** - optimized image loading with caching

### APIs
- **Alchemy NFT API** - EVM networks (Ethereum, Polygon, Base, etc.)
- **Helius DAS API** - Solana NFTs including compressed NFTs
- **CloudFlare Image Resizing** - IPFS/Arweave image optimization

## Project Structure

```
src/
├── components/
│   ├── NFTCard.tsx              # Individual NFT tile with image, metadata, badges
│   ├── NFTGrid.tsx              # FlashList-based grid with sections and sorting
│   ├── NFTDetail.tsx            # Full-screen detail modal (TODO)
│   ├── WalletCard.tsx           # Wallet selector tile (TODO)
│   ├── CollectionHeader.tsx    # Collection group header (TODO)
│   └── FarcasterBadge.tsx      # FC mint indicator (TODO)
│
├── screens/
│   ├── HomeScreen.tsx           # Main gallery view (TODO)
│   ├── WalletsScreen.tsx        # Wallet management (TODO)
│   ├── CollectionsScreen.tsx   # Collection browser (TODO)
│   ├── GroupsScreen.tsx         # Custom groups (TODO)
│   └── SettingsScreen.tsx      # App settings (TODO)
│
├── services/
│   ├── nft/
│   │   ├── fetchers/
│   │   │   ├── alchemy.ts       # EVM NFT fetching via Alchemy
│   │   │   └── helius.ts        # Solana NFT fetching via Helius
│   │   ├── detector.ts          # Farcaster mint detection logic
│   │   └── normalizer.ts        # Unified NFT data format
│   ├── storage/
│   │   ├── database.ts          # SQLite operations (TODO)
│   │   └── cache.ts             # AsyncStorage wrapper (TODO)
│   └── images/
│       └── optimizer.ts         # Image proxy/cache (TODO)
│
├── store/
│   └── index.ts                 # Zustand store (wallets, NFTs, settings)
│
├── hooks/
│   ├── useWalletNFTs.ts        # React Query hook for fetching NFTs (TODO)
│   ├── useFarcasterMints.ts    # Filtered FC mints (TODO)
│   └── useCollections.ts       # Collection aggregation (TODO)
│
├── utils/
│   ├── formatting.ts            # Formatting helpers (TODO)
│   └── validation.ts            # Validation utilities (TODO)
│
└── types/
    └── index.ts                 # TypeScript type definitions
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Studio (for Android development)
- Alchemy API key (free tier available)
- Helius API key (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/dutchiono/nft-portfolio-app.git
   cd nft-portfolio-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   ALCHEMY_API_KEY=your_alchemy_api_key_here
   HELIUS_API_KEY=your_helius_api_key_here
   ```

   **Getting API Keys:**
   - **Alchemy**: Sign up at [alchemy.com](https://www.alchemy.com/) - Free tier includes 300M compute units/month
   - **Helius**: Sign up at [helius.dev](https://www.helius.dev/) - Free tier includes 100 requests/second

4. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Architecture Overview

### Data Flow
```
User Input → Zustand Store → React Query → API Fetchers → Normalizer → Store Update → UI Render
     ↓                                                            ↓
AsyncStorage                                                SQLite Cache
(wallets, settings)                                        (NFT data)
```

### State Management (Zustand)
The app uses a single Zustand store that manages:
- **Wallets**: Add, remove, update wallet addresses
- **NFTs**: Map-based storage for O(1) lookups by composite ID
- **Collections**: Aggregated collection metadata
- **Custom Groups**: User-created organization folders
- **Settings**: App preferences and configuration
- **UI State**: Active wallet, view mode, sort/filter options

### NFT Data Normalization
All NFT data from different APIs (Alchemy, Helius) is normalized into a unified format:
- Composite IDs: `{chain}:{contractAddress}:{tokenId}`
- Consistent metadata structure
- IPFS/Arweave URL optimization
- Farcaster mint detection and channel extraction

### Farcaster Detection
Intelligent detection of Farcaster channel mints using:
- Known Farcaster contract addresses (Base, Zora)
- Metadata keyword analysis (channel, farcaster)
- Attribute parsing for channel names
- URL pattern matching in descriptions

## Key Features Implementation

### Multi-Wallet Support
```typescript
// Add any EVM or Solana wallet
store.addWallet({
  address: '0x...',
  chain: 'evm',
  label: 'Main Wallet',
  color: '#FF6B6B'
});

// Fetch NFTs for all wallets in parallel
const allNFTs = await Promise.all(
  wallets.map(w => fetchNFTsForWallet(w))
);
```

### Smart Farcaster Detection
```typescript
// Automatically detect Farcaster mints
if (isFarcasterMint(nft)) {
  nft.metadata.isFarcasterMint = true;
  nft.metadata.farcasterChannel = extractChannelName(nft);
}

// Group by Farcaster channel
const fcGroups = groupByFarcasterChannel(nfts);
```

### Custom Organization
```typescript
// Create custom groups
store.createGroup('Favorites', [nft1.id, nft2.id]);

// Add to existing group
store.addToGroup(groupId, [nft3.id]);
```

## Development Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Project architecture and type definitions
- [x] Zustand store with wallet and NFT management
- [x] Alchemy fetcher for EVM chains
- [x] Helius fetcher for Solana
- [x] NFT data normalization
- [x] Farcaster mint detection
- [x] Basic UI components (NFTCard, NFTGrid)

### 🚧 Phase 2: Core Screens (In Progress)
- [ ] HomeScreen with wallet selector and grid
- [ ] WalletsScreen for wallet management
- [ ] CollectionsScreen for browsing collections
- [ ] Navigation setup with React Navigation
- [ ] Settings screen

### 📋 Phase 3: Smart Features (Planned)
- [ ] Custom groups UI (create, edit, delete)
- [ ] Advanced sorting and filtering
- [ ] Collection floor price tracking
- [ ] NFT detail modal with full metadata
- [ ] Search functionality

### 🎨 Phase 4: Polish & Optimization (Planned)
- [ ] SQLite offline storage
- [ ] Image optimization and caching
- [ ] Animations and transitions
- [ ] Error handling and retry logic
- [ ] Loading states and skeletons
- [ ] Pull-to-refresh
- [ ] Dark mode support

## API Documentation

### Alchemy NFT API
- **Endpoint**: `getNFTsForOwner`
- **Networks**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **Rate Limits**: 300M compute units/month (free tier)
- **Docs**: [alchemy.com/docs](https://docs.alchemy.com/reference/nft-api)

### Helius DAS API
- **Endpoint**: `getAssetsByOwner`
- **Features**: Standard and compressed NFTs on Solana
- **Rate Limits**: 100 requests/second (free tier)
- **Docs**: [docs.helius.dev/compression-and-das-api](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See [LICENSE](LICENSE) file for details

## Support

For questions or issues, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ using React Native, TypeScript, and modern mobile development practices**