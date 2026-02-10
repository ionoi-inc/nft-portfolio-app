/**
 * NFT Data Normalizer
 * Converts API-specific responses to unified NFT format
 */

import type {
  NFT,
  AlchemyNFT,
  HeliusAsset,
  ChainType,
  EVMChain,
} from '../../types';

export class NFTNormalizer {
  /**
   * Normalize Alchemy NFT response to unified format
   */
  static fromAlchemy(
    alchemyNFT: AlchemyNFT,
    walletId: string,
    chain: EVMChain
  ): NFT {
    const contractAddress = alchemyNFT.contract.address.toLowerCase();
    const tokenId = alchemyNFT.tokenId;
    const id = `evm:${chain}:${contractAddress}:${tokenId}`;

    // Get best available image
    const image = 
      alchemyNFT.media?.[0]?.gateway ||
      alchemyNFT.media?.[0]?.raw ||
      alchemyNFT.metadata?.image ||
      '';

    const thumbnail = alchemyNFT.media?.[0]?.thumbnail;

    return {
      id,
      walletId,
      chain: 'evm',
      evmChain: chain,
      contractAddress,
      tokenId,
      name: alchemyNFT.title || alchemyNFT.metadata?.name || `#${tokenId}`,
      description: alchemyNFT.description || alchemyNFT.metadata?.description,
      image: this.normalizeImageUrl(image),
      imageOptimized: thumbnail ? this.normalizeImageUrl(thumbnail) : undefined,
      externalUrl: alchemyNFT.metadata?.external_url,
      collection: {
        name: alchemyNFT.contractMetadata?.name || 
              alchemyNFT.contract.name || 
              'Unknown Collection',
        address: contractAddress,
        imageUrl: alchemyNFT.contractMetadata?.openSea?.imageUrl,
        floorPrice: alchemyNFT.contractMetadata?.openSea?.floorPrice
          ? {
              amount: alchemyNFT.contractMetadata.openSea.floorPrice,
              currency: 'ETH',
            }
          : undefined,
      },
      metadata: {
        attributes: alchemyNFT.metadata?.attributes || [],
        isFarcasterMint: false, // Will be detected separately
        mintedAt: alchemyNFT.timeLastUpdated
          ? new Date(alchemyNFT.timeLastUpdated).getTime()
          : undefined,
      },
      lastFetched: Date.now(),
    };
  }

  /**
   * Normalize Helius asset response to unified format
   */
  static fromHelius(
    heliusAsset: HeliusAsset,
    walletId: string
  ): NFT {
    const id = `solana:${heliusAsset.id}`;
    
    // Extract collection info from grouping
    const collectionGroup = heliusAsset.grouping.find(
      g => g.group_key === 'collection'
    );
    const collectionAddress = collectionGroup?.group_value || heliusAsset.id;

    const image = heliusAsset.content.links?.image || '';
    const metadata = heliusAsset.content.metadata;

    return {
      id,
      walletId,
      chain: 'solana',
      contractAddress: collectionAddress,
      tokenId: heliusAsset.id,
      name: metadata.name || 'Unknown',
      description: metadata.description,
      image: this.normalizeImageUrl(image),
      externalUrl: heliusAsset.content.links?.external_url,
      collection: {
        name: metadata.symbol || 'Unknown Collection',
        address: collectionAddress,
      },
      metadata: {
        attributes: metadata.attributes || [],
        isFarcasterMint: false, // Will be detected separately
        creator: heliusAsset.creators?.[0]?.address,
        royalties: heliusAsset.royalty?.percent,
      },
      lastFetched: Date.now(),
    };
  }

  /**
   * Normalize IPFS/Arweave URLs to use gateways
   */
  static normalizeImageUrl(url: string): string {
    if (!url) return '';

    // IPFS protocols
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }

    // Arweave
    if (url.startsWith('ar://')) {
      const hash = url.replace('ar://', '');
      return `https://arweave.net/${hash}`;
    }

    // Already a valid URL
    return url;
  }

  /**
   * Create optimized image URL using CloudFlare Image Resizing
   */
  static createOptimizedUrl(originalUrl: string, width: number = 400): string {
    if (!originalUrl) return '';
    
    const normalizedUrl = this.normalizeImageUrl(originalUrl);
    
    // Use CloudFlare image resizing proxy
    return `https://images.nebula.gg/cdn-cgi/image/width=${width},quality=85,format=auto/${encodeURIComponent(normalizedUrl)}`;
  }

  /**
   * Generate composite NFT ID
   */
  static generateId(
    chain: ChainType,
    contractAddress: string,
    tokenId: string,
    evmChain?: EVMChain
  ): string {
    if (chain === 'evm' && evmChain) {
      return `evm:${evmChain}:${contractAddress.toLowerCase()}:${tokenId}`;
    }
    return `${chain}:${contractAddress.toLowerCase()}:${tokenId}`;
  }

  /**
   * Parse composite NFT ID
   */
  static parseId(id: string): {
    chain: ChainType;
    evmChain?: EVMChain;
    contractAddress: string;
    tokenId: string;
  } | null {
    const parts = id.split(':');
    
    if (parts[0] === 'evm' && parts.length === 4) {
      return {
        chain: 'evm',
        evmChain: parts[1] as EVMChain,
        contractAddress: parts[2],
        tokenId: parts[3],
      };
    }
    
    if (parts[0] === 'solana' && parts.length === 2) {
      return {
        chain: 'solana',
        contractAddress: parts[1],
        tokenId: parts[1],
      };
    }
    
    return null;
  }
}
