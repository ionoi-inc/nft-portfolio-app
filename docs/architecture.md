# NFT Portfolio App - Architecture & Technical Design

## Overview
React Native app for viewing and organizing NFTs across multiple wallets (EVM + Solana) with intelligent organization features for Farcaster mints and custom sorting.

## Tech Stack

### Core Framework
- **React Native** (latest) with TypeScript
- **Expo** (managed workflow for faster development)
- **React Navigation** (v6) for navigation

### State Management
- **Zustand** - lightweight, simple state management
- **React Query** - data fetching, caching, and synchronization

### Data & Storage
- **AsyncStorage** - wallet addresses, preferences, cached data
- **MMKV** - high-performance key-value storage for image caching metadata
- **SQLite** (expo-sqlite) - local NFT database for offline access

### Multi-Chain NFT APIs

#### EVM Networks
- **Alchemy NFT API** (Primary)
  - Supports Ethereum, Polygon, Arbitrum, Optimism, Base
  - Endpoints: `getNFTsForOwner`, `getNFTMetadata`
  - Free tier: 300M compute units/month
  
- **Moralis NFT API** (Backup/Alternative)
  - Multi-chain support
  - Good for batch operations

#### Solana
- **Helius** (Primary)
  - DAS API for compressed NFTs
  - `getAssetsByOwner` endpoint
  - Excellent metadata resolution
  
- **Metaplex** (Fallback)
  - Direct on-chain NFT reading
  - Token metadata standard

### UI Components
- **React Native Paper** or **Tamagui** - component library
- **React Native Reanimated** - smooth animations
- **React Native Fast Image** - optimized image loading with caching
- **FlashList** (@shopify/flash-list) - high-performance lists

### Image Optimization
- **CloudFlare Image Resizing** (proxy for IPFS/Arweave)
- **NFT.Storage IPFS Gateway** with fallbacks

## Data Architecture

### Data Models

```typescript
// Core Types
interface Wallet {
  id: string;
  address: string;
  chain: 'evm' | 'solana';
  label?: string;
  color?: string;
  addedAt: number;
}

interface NFT {
  id: string; // composite: chain:contract:tokenId
  walletId: string;
  chain: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image: string;
  imageOptimized?: string; // cached thumbnail URL
  collection: {
    name: string;
    address: string;
    floorPrice?: number;
  };
  metadata: {
    attributes?: Array<{ trait_type: string; value: any }>;
    isFarcasterMint: boolean;
    farcasterChannel?: string;
    mintedAt?: number;
  };
  lastFetched: number;
}

interface Collection {
  id: string;
  name: string;
  contractAddress: string;
  chain: string;
  nftCount: number;
  floorPrice?: number;
  imageUrl?: string;
}

interface CustomGroup {
  id: string;
  name: string;
  nftIds: string[];
  color: string;
  createdAt: number;
}
```

### Zustand Store Structure

```typescript
interface AppStore {
  // Wallet Management
  wallets: Wallet[];
  addWallet: (wallet: Wallet) => void;
  removeWallet: (id: string) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  
  // NFT Data
  nfts: Map<string, NFT>; // keyed by NFT.id
  collections: Map<string, Collection>;
  
  // UI State
  activeWalletId?: string;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'collection' | 'farcaster' | 'custom';
  filterBy: {
    collections?: string[];
    farcaster?: boolean;
    customGroups?: string[];
  };
  
  // Custom Organization
  customGroups: CustomGroup[];
  createGroup: (name: string, nftIds: string[]) => void;
  addToGroup: (groupId: string, nftIds: string[]) => void;
  
  // Settings
  settings: {
    refreshInterval: number;
    showFloorPrice: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}
```

## Feature Implementation

### 1. Multi-Wallet Support
- Add unlimited wallets (EVM + Solana)
- Visual color coding per wallet
- Switch between wallet views
- Aggregate view (all wallets)

### 2. Smart Farcaster Detection
```typescript
// Detection logic
function isFarcasterMint(nft: NFT): boolean {
  // Check contract addresses (known Farcaster mint contracts)
  const farcasterContracts = [
    '0x...', // Base mainnet Farcaster mints
    '0x...', // Zora protocol
  ];
  
  // Check metadata for Farcaster channels
  const description = nft.description?.toLowerCase() || '';
  const farcasterChannelRegex = /\/([a-z0-9-]+)/;
  
  if (farcasterContracts.includes(nft.contractAddress.toLowerCase())) {
    return true;
  }
  
  // Check for common Farcaster mint attributes
  if (nft.metadata.attributes?.some(attr => 
    attr.trait_type.toLowerCase().includes('farcaster') ||
    attr.trait_type.toLowerCase().includes('channel')
  )) {
    return true;
  }
  
  return false;
}

function extractFarcasterChannel(nft: NFT): string | undefined {
  // Parse from metadata, description, or attributes
  const channelRegex = /farcaster\.xyz\/([a-z0-9-]+)/i;
  const match = nft.description?.match(channelRegex);
  return match?.[1];
}
```

### 3. Smart Organization Features

#### Auto-Collections
- Group by contract address automatically
- Show collection name, floor price, item count
- Sort collections by value, size, or name

#### Farcaster Organization
- Auto-detect Farcaster mints
- Group by channel (if detectable)
- Special "Farcaster Mints" section
- Visual badge on thumbnails

#### Custom Groups
- User-created folders/tags
- Drag-and-drop to organize
- Multi-select for batch operations
- Persistent across sessions

### 4. Sorting Options
- **By Collection** - grouped, alphabetical
- **By Acquisition Date** - newest first
- **By Farcaster** - FC mints at top
- **By Custom Groups** - user-defined order
- **By Value** - floor price descending (if available)

### 5. Performance Optimizations

#### Data Fetching Strategy
```typescript
// React Query hooks
const useWalletNFTs = (walletId: string) => {
  return useQuery({
    queryKey: ['nfts', walletId],
    queryFn: () => fetchNFTsForWallet(walletId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

// Parallel fetching for multiple wallets
const useAllNFTs = (walletIds: string[]) => {
  return useQueries({
    queries: walletIds.map(id => ({
      queryKey: ['nfts', id],
      queryFn: () => fetchNFTsForWallet(id),
    })),
    combine: (results) => ({
      data: results.flatMap(r => r.data || []),
      isLoading: results.some(r => r.isLoading),
    }),
  });
};
```

#### Image Loading
- Use FlashList with optimized image cells
- Progressive loading (thumbnail → full)
- Aggressive caching with react-native-fast-image
- Lazy load off-screen images

#### Local Database
```sql
-- SQLite schema for offline access
CREATE TABLE nfts (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  token_id TEXT NOT NULL,
  name TEXT,
  image_url TEXT,
  metadata TEXT, -- JSON blob
  is_farcaster_mint BOOLEAN DEFAULT 0,
  last_fetched INTEGER,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE INDEX idx_wallet ON nfts(wallet_id);
CREATE INDEX idx_farcaster ON nfts(is_farcaster_mint);
CREATE INDEX idx_contract ON nfts(contract_address);
```

## API Integration Layer

### Unified NFT Fetcher
```typescript
interface NFTFetcher {
  fetchForWallet(address: string, chain: string): Promise<NFT[]>;
  fetchMetadata(nft: NFT): Promise<NFT>;
  refreshCollection(contractAddress: string): Promise<Collection>;
}

class AlchemyFetcher implements NFTFetcher {
  async fetchForWallet(address: string, chain: string): Promise<NFT[]> {
    const network = this.mapChainToAlchemyNetwork(chain);
    const response = await alchemy.nft.getNFTsForOwner(address, {
      network,
      omitMetadata: false,
    });
    return response.ownedNfts.map(this.normalizeNFT);
  }
}

class HeliusFetcher implements NFTFetcher {
  async fetchForWallet(address: string): Promise<NFT[]> {
    const response = await helius.rpc.getAssetsByOwner({
      ownerAddress: address,
      page: 1,
      limit: 1000,
    });
    return response.items.map(this.normalizeNFT);
  }
}

// Factory pattern
function getFetcher(chain: string): NFTFetcher {
  return chain === 'solana' 
    ? new HeliusFetcher(HELIUS_API_KEY)
    : new AlchemyFetcher(ALCHEMY_API_KEY);
}
```

## App Structure

```
src/
├── components/
│   ├── NFTCard.tsx              # Individual NFT tile
│   ├── NFTGrid.tsx              # FlashList-based grid
│   ├── NFTDetail.tsx            # Full-screen detail modal
│   ├── WalletCard.tsx           # Wallet selector tile
│   ├── CollectionHeader.tsx    # Collection group header
│   └── FarcasterBadge.tsx      # FC mint indicator
├── screens/
│   ├── HomeScreen.tsx           # Main gallery view
│   ├── WalletsScreen.tsx        # Wallet management
│   ├── CollectionsScreen.tsx   # Collection browser
│   ├── GroupsScreen.tsx         # Custom groups
│   └── SettingsScreen.tsx      # App settings
├── services/
│   ├── nft/
│   │   ├── fetchers/
│   │   │   ├── alchemy.ts
│   │   │   ├── helius.ts
│   │   │   └── moralis.ts
│   │   ├── detector.ts          # Farcaster detection
│   │   └── normalizer.ts        # Unify data formats
│   ├── storage/
│   │   ├── database.ts          # SQLite operations
│   │   └── cache.ts             # AsyncStorage wrapper
│   └── images/
│       └── optimizer.ts         # Image proxy/cache
├── store/
│   ├── walletStore.ts
│   ├── nftStore.ts
│   └── uiStore.ts
├── hooks/
│   ├── useWalletNFTs.ts
│   ├── useFarcasterMints.ts
│   └── useCollections.ts
├── utils/
│   ├── formatting.ts
│   └── validation.ts
└── types/
    └── index.ts
```

## Key Screens & Navigation

### Navigation Flow
```
Stack Navigator
├── Tabs (Bottom)
│   ├── Gallery (HomeScreen)
│   ├── Collections
│   ├── Groups
│   └── Wallets
└── Modals
    ├── NFTDetail
    ├── AddWallet
    └── CreateGroup
```

### Home Screen Features
- Top: Wallet selector + filter/sort buttons
- Main: FlashList grid of NFTs
- Floating Action Button: Add wallet / Create group
- Pull-to-refresh
- Smart sections based on sort mode

## Development Phases

### Phase 1: Core Foundation (Week 1)
- Setup React Native + Expo project
- Implement wallet management (add/remove/list)
- Basic Alchemy integration for EVM
- Simple NFT grid with FlashList

### Phase 2: Multi-Chain Support (Week 2)
- Add Helius integration for Solana
- Unified NFT data model
- React Query caching layer
- Basic detail view

### Phase 3: Smart Features (Week 3)
- Farcaster mint detection
- Collection grouping
- Custom groups (create/edit)
- Advanced sorting

### Phase 4: Polish & Optimization (Week 4)
- Image optimization and caching
- SQLite offline storage
- Animations and transitions
- Error handling and retry logic

## API Keys Required
- Alchemy API Key (free tier sufficient to start)
- Helius API Key (free tier: 100 req/sec)
- Optional: Moralis, NFTPort for redundancy

## Next Steps
1. Set up React Native project with TypeScript
2. Install dependencies (see package.json)
3. Configure environment variables for API keys
4. Implement wallet store and basic UI
5. Connect first NFT fetcher (Alchemy)
