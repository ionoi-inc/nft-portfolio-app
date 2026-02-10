/**
 * Alchemy NFT Fetcher
 * Fetches NFTs from EVM chains using Alchemy API
 */

import type { NFT, AlchemyNFT, EVMChain, PaginatedResult } from '../../../types';
import { NFTNormalizer } from '../normalizer';

interface AlchemyConfig {
  apiKey: string;
  baseUrl?: string;
}

interface AlchemyResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

export class AlchemyFetcher {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AlchemyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.g.alchemy.com/nft/v3';
  }

  /**
   * Fetch all NFTs for a wallet address
   */
  async fetchForWallet(
    address: string,
    chain: EVMChain,
    walletId: string
  ): Promise<NFT[]> {
    const allNFTs: NFT[] = [];
    let pageKey: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.fetchPage(address, chain, walletId, pageKey);
      allNFTs.push(...result.items);
      pageKey = result.pageKey;
      hasMore = result.hasMore && !!pageKey;
    }

    return allNFTs;
  }

  /**
   * Fetch a single page of NFTs
   */
  async fetchPage(
    address: string,
    chain: EVMChain,
    walletId: string,
    pageKey?: string
  ): Promise<PaginatedResult<NFT>> {
    const network = this.mapChainToNetwork(chain);
    const url = `${this.baseUrl}/${this.apiKey}/getNFTsForOwner`;

    const params = new URLSearchParams({
      owner: address,
      withMetadata: 'true',
      pageSize: '100',
    });

    if (pageKey) {
      params.append('pageKey', pageKey);
    }

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data: AlchemyResponse = await response.json();

    const nfts = data.ownedNfts.map(alchemyNFT =>
      NFTNormalizer.fromAlchemy(alchemyNFT, walletId, chain)
    );

    return {
      items: nfts,
      pageKey: data.pageKey,
      totalCount: data.totalCount,
      hasMore: !!data.pageKey,
    };
  }

  /**
   * Fetch metadata for a specific NFT
   */
  async fetchMetadata(
    contractAddress: string,
    tokenId: string,
    chain: EVMChain
  ): Promise<AlchemyNFT> {
    const network = this.mapChainToNetwork(chain);
    const url = `${this.baseUrl}/${this.apiKey}/getNFTMetadata`;

    const params = new URLSearchParams({
      contractAddress,
      tokenId,
      refreshCache: 'false',
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch floor price for a collection
   */
  async fetchFloorPrice(
    contractAddress: string,
    chain: EVMChain
  ): Promise<number | undefined> {
    try {
      const network = this.mapChainToNetwork(chain);
      const url = `${this.baseUrl}/${this.apiKey}/getFloorPrice`;

      const params = new URLSearchParams({
        contractAddress,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();
      return data.openSea?.floorPrice;
    } catch (error) {
      console.warn('Failed to fetch floor price:', error);
      return undefined;
    }
  }

  /**
   * Map app chain names to Alchemy network names
   */
  private mapChainToNetwork(chain: EVMChain): string {
    const mapping: Record<EVMChain, string> = {
      ethereum: 'eth-mainnet',
      polygon: 'polygon-mainnet',
      arbitrum: 'arb-mainnet',
      optimism: 'opt-mainnet',
      base: 'base-mainnet',
      zora: 'zora-mainnet',
    };

    return mapping[chain] || 'eth-mainnet';
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      // Test with a simple request
      const url = `${this.baseUrl}/${this.apiKey}/getNFTsForOwner`;
      const params = new URLSearchParams({
        owner: '0x0000000000000000000000000000000000000000',
        pageSize: '1',
      });

      const response = await fetch(`${url}?${params.toString()}`);
      return response.ok || response.status === 400; // 400 is ok, means API key works but invalid address
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create Alchemy fetcher instance
 */
export function createAlchemyFetcher(apiKey: string): AlchemyFetcher {
  return new AlchemyFetcher({ apiKey });
}
