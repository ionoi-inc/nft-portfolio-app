/**
 * Helius NFT Fetcher
 * Fetches NFTs from Solana using Helius DAS API
 */

import type { NFT, HeliusAsset, PaginatedResult } from '../../../types';
import { NFTNormalizer } from '../normalizer';

interface HeliusConfig {
  apiKey: string;
  rpcUrl?: string;
}

interface HeliusResponse {
  total: number;
  limit: number;
  page: number;
  items: HeliusAsset[];
}

interface GetAssetsByOwnerParams {
  ownerAddress: string;
  page?: number;
  limit?: number;
  displayOptions?: {
    showCollectionMetadata?: boolean;
    showFungible?: boolean;
  };
}

export class HeliusFetcher {
  private apiKey: string;
  private rpcUrl: string;

  constructor(config: HeliusConfig) {
    this.apiKey = config.apiKey;
    this.rpcUrl = config.rpcUrl || `https://mainnet.helius-rpc.com/?api-key=${config.apiKey}`;
  }

  /**
   * Fetch all NFTs for a Solana wallet address
   */
  async fetchForWallet(address: string, walletId: string): Promise<NFT[]> {
    const allNFTs: NFT[] = [];
    let page = 1;
    let hasMore = true;
    const limit = 1000; // Helius max per page

    while (hasMore) {
      const result = await this.fetchPage(address, walletId, page, limit);
      allNFTs.push(...result.items);
      
      // Check if there are more pages
      hasMore = result.items.length === limit;
      page++;
    }

    return allNFTs;
  }

  /**
   * Fetch a single page of NFTs
   */
  async fetchPage(
    address: string,
    walletId: string,
    page: number = 1,
    limit: number = 1000
  ): Promise<PaginatedResult<NFT>> {
    const params: GetAssetsByOwnerParams = {
      ownerAddress: address,
      page,
      limit,
      displayOptions: {
        showCollectionMetadata: true,
        showFungible: false, // Only NFTs, not tokens
      },
    };

    const response = await this.makeRpcCall('getAssetsByOwner', params);

    const nfts = response.items.map((asset: HeliusAsset) =>
      NFTNormalizer.fromHelius(asset, walletId)
    );

    return {
      items: nfts,
      totalCount: response.total,
      hasMore: response.items.length === limit,
    };
  }

  /**
   * Fetch metadata for a specific NFT by mint address
   */
  async fetchAsset(mintAddress: string, walletId: string): Promise<NFT> {
    const response = await this.makeRpcCall('getAsset', {
      id: mintAddress,
    });

    return NFTNormalizer.fromHelius(response, walletId);
  }

  /**
   * Fetch multiple assets by mint addresses
   */
  async fetchAssetBatch(
    mintAddresses: string[],
    walletId: string
  ): Promise<NFT[]> {
    const response = await this.makeRpcCall('getAssetBatch', {
      ids: mintAddresses,
    });

    return response.map((asset: HeliusAsset) =>
      NFTNormalizer.fromHelius(asset, walletId)
    );
  }

  /**
   * Search assets by creator, collection, or other criteria
   */
  async searchAssets(
    ownerAddress: string,
    walletId: string,
    options?: {
      collectionAddress?: string;
      creatorAddress?: string;
      compressed?: boolean;
    }
  ): Promise<NFT[]> {
    const params: any = {
      ownerAddress,
      page: 1,
      limit: 1000,
    };

    if (options?.collectionAddress) {
      params.grouping = ['collection', options.collectionAddress];
    }

    if (options?.creatorAddress) {
      params.creatorAddress = options.creatorAddress;
    }

    if (options?.compressed !== undefined) {
      params.compressed = options.compressed;
    }

    const response = await this.makeRpcCall('getAssetsByOwner', params);

    return response.items.map((asset: HeliusAsset) =>
      NFTNormalizer.fromHelius(asset, walletId)
    );
  }

  /**
   * Get assets by group (collection)
   */
  async getAssetsByGroup(
    groupKey: string,
    groupValue: string,
    page: number = 1,
    limit: number = 1000
  ): Promise<HeliusAsset[]> {
    const response = await this.makeRpcCall('getAssetsByGroup', {
      groupKey,
      groupValue,
      page,
      limit,
    });

    return response.items;
  }

  /**
   * Make RPC call to Helius DAS API
   */
  private async makeRpcCall(method: string, params: any): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params,
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Helius RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      // Test with a simple request
      await this.makeRpcCall('getAsset', {
        id: '11111111111111111111111111111111', // System program address
      });
      return true;
    } catch (error) {
      // If we get a proper error response, API key is valid
      return true;
    }
  }

  /**
   * Get webhook configuration (for future use)
   */
  async getWebhooks(): Promise<any> {
    const response = await fetch(
      `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch webhooks');
    }

    return response.json();
  }
}

/**
 * Create Helius fetcher instance
 */
export function createHeliusFetcher(apiKey: string): HeliusFetcher {
  return new HeliusFetcher({ apiKey });
}
