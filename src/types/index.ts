/**
 * Core Type Definitions for NFT Portfolio App
 */

export type ChainType = 'evm' | 'solana';

export type EVMChain = 
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'zora';

export type SortMode = 
  | 'recent'
  | 'collection'
  | 'farcaster'
  | 'custom'
  | 'value';

export type ViewMode = 'grid' | 'list';

export interface Wallet {
  id: string;
  address: string;
  chain: ChainType;
  evmChain?: EVMChain;
  label?: string;
  color?: string;
  addedAt: number;
  isActive?: boolean;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface NFTCollection {
  name: string;
  address: string;
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  floorPrice?: {
    amount: number;
    currency: string;
  };
}

export interface NFTMetadata {
  attributes?: NFTAttribute[];
  isFarcasterMint: boolean;
  farcasterChannel?: string;
  mintedAt?: number;
  creator?: string;
  royalties?: number;
}

export interface NFT {
  id: string; // composite: {chain}:{contract}:{tokenId}
  walletId: string;
  chain: ChainType;
  evmChain?: EVMChain;
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image: string;
  imageOptimized?: string;
  animationUrl?: string;
  externalUrl?: string;
  collection: NFTCollection;
  metadata: NFTMetadata;
  lastFetched: number;
}

export interface Collection {
  id: string; // {chain}:{contractAddress}
  name: string;
  contractAddress: string;
  chain: ChainType;
  evmChain?: EVMChain;
  nftCount: number;
  floorPrice?: {
    amount: number;
    currency: string;
  };
  imageUrl?: string;
  description?: string;
  externalUrl?: string;
}

export interface CustomGroup {
  id: string;
  name: string;
  description?: string;
  nftIds: string[];
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FilterOptions {
  collections?: string[];
  farcaster?: boolean;
  customGroups?: string[];
  chains?: ChainType[];
  wallets?: string[];
}

export interface AppSettings {
  refreshInterval: number; // minutes
  showFloorPrice: boolean;
  theme: 'light' | 'dark' | 'auto';
  defaultView: ViewMode;
  defaultSort: SortMode;
  imageQuality: 'low' | 'medium' | 'high';
  enableNotifications: boolean;
}

// API Response Types

export interface AlchemyNFT {
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType: string;
  };
  tokenId: string;
  tokenType: string;
  title: string;
  description?: string;
  tokenUri?: string;
  media: Array<{
    raw: string;
    gateway: string;
    thumbnail?: string;
    format?: string;
  }>;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  timeLastUpdated: string;
  contractMetadata?: {
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType: string;
    openSea?: {
      floorPrice?: number;
      collectionName?: string;
      imageUrl?: string;
    };
  };
}

export interface HeliusAsset {
  id: string;
  content: {
    json_uri: string;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
      attributes?: Array<{
        trait_type: string;
        value: string | number;
      }>;
    };
    links?: {
      image?: string;
      external_url?: string;
    };
  };
  authorities: Array<{
    address: string;
    scopes: string[];
  }>;
  compression: {
    eligible: boolean;
    compressed: boolean;
  };
  grouping: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty: {
    royalty_model: string;
    target?: string;
    percent: number;
  };
  creators: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  mint_extensions?: any;
}

export interface FetchResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isError: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pageKey?: string;
  totalCount?: number;
  hasMore: boolean;
}
