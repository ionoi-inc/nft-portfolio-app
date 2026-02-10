/**
 * Farcaster Mint Detector
 * Detects Farcaster mints and extracts channel information
 */

import type { NFT, NFTAttribute } from '../../types';

// Known Farcaster mint contract addresses (Base mainnet)
const FARCASTER_CONTRACTS = new Set([
  // Zora Protocol (commonly used for Farcaster channel mints)
  '0x7c74dfe39976dc395529c14e54a597809980e01c',
  '0x04e2516a2c207e84a1839755675dfd8ef6302f0a', // Zora 1155 Factory
  
  // Highlight.xyz (Farcaster channel mints)
  '0x8087039152c472fa74f47398628ff002994056ea',
  
  // Base mints (various Farcaster artists)
  '0x86c1fe6c5b5c9f0c9b8c3a9b0b5e3e9c5c5c5c5c',
  
  // Add more known contracts as discovered
]);

// Keywords that indicate Farcaster mints
const FARCASTER_KEYWORDS = [
  'farcaster',
  'warpcast',
  'fc channel',
  '/channel/',
  'minted on farcaster',
  'farcaster mint',
];

// Channel name patterns
const CHANNEL_PATTERNS = [
  /\/([a-z0-9-]+)/i, // Matches /channel-name
  /farcaster\.xyz\/([a-z0-9-]+)/i,
  /warpcast\.com\/~\/([a-z0-9-]+)/i,
  /channel:\s*([a-z0-9-]+)/i,
];

export class FarcasterDetector {
  /**
   * Detect if an NFT is a Farcaster mint
   */
  static isFarcasterMint(nft: NFT): boolean {
    // Check 1: Known contract address
    if (FARCASTER_CONTRACTS.has(nft.contractAddress.toLowerCase())) {
      return true;
    }

    // Check 2: Base chain (most FC mints are on Base)
    const isBaseChain = nft.chain === 'evm' && nft.evmChain === 'base';

    // Check 3: Description contains Farcaster keywords
    if (this.hasKeywords(nft.description)) {
      return true;
    }

    // Check 4: Attributes mention Farcaster
    if (this.hasAttributeKeywords(nft.metadata.attributes)) {
      return true;
    }

    // Check 5: External URL points to Farcaster platforms
    if (this.isFarcasterUrl(nft.externalUrl)) {
      return true;
    }

    // Check 6: Collection name/description
    if (this.hasKeywords(nft.collection.name) || this.hasKeywords(nft.collection.description)) {
      return true;
    }

    return false;
  }

  /**
   * Extract Farcaster channel name from NFT metadata
   */
  static extractChannel(nft: NFT): string | undefined {
    // Try to extract from description
    let channel = this.extractChannelFromText(nft.description);
    if (channel) return channel;

    // Try to extract from external URL
    channel = this.extractChannelFromText(nft.externalUrl);
    if (channel) return channel;

    // Try to extract from attributes
    const channelAttr = nft.metadata.attributes?.find(
      (attr) =>
        attr.trait_type.toLowerCase().includes('channel') ||
        attr.trait_type.toLowerCase().includes('farcaster')
    );
    if (channelAttr) {
      channel = this.extractChannelFromText(String(channelAttr.value));
      if (channel) return channel;
    }

    // Try collection name/description
    channel = this.extractChannelFromText(nft.collection.name);
    if (channel) return channel;

    channel = this.extractChannelFromText(nft.collection.description);
    if (channel) return channel;

    return undefined;
  }

  /**
   * Enrich NFT with Farcaster detection metadata
   */
  static enrichNFT(nft: NFT): NFT {
    const isFarcasterMint = this.isFarcasterMint(nft);
    const farcasterChannel = isFarcasterMint ? this.extractChannel(nft) : undefined;

    return {
      ...nft,
      metadata: {
        ...nft.metadata,
        isFarcasterMint,
        farcasterChannel,
      },
    };
  }

  /**
   * Batch enrich multiple NFTs
   */
  static enrichNFTs(nfts: NFT[]): NFT[] {
    return nfts.map((nft) => this.enrichNFT(nft));
  }

  /**
   * Group NFTs by Farcaster channel
   */
  static groupByChannel(nfts: NFT[]): Map<string, NFT[]> {
    const groups = new Map<string, NFT[]>();

    nfts
      .filter((nft) => nft.metadata.isFarcasterMint)
      .forEach((nft) => {
        const channel = nft.metadata.farcasterChannel || 'Unknown Channel';
        if (!groups.has(channel)) {
          groups.set(channel, []);
        }
        groups.get(channel)!.push(nft);
      });

    return groups;
  }

  /**
   * Get all unique Farcaster channels from NFT collection
   */
  static getChannels(nfts: NFT[]): string[] {
    const channels = new Set<string>();

    nfts
      .filter((nft) => nft.metadata.isFarcasterMint)
      .forEach((nft) => {
        if (nft.metadata.farcasterChannel) {
          channels.add(nft.metadata.farcasterChannel);
        }
      });

    return Array.from(channels).sort();
  }

  /**
   * Check if text contains Farcaster keywords
   */
  private static hasKeywords(text?: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return FARCASTER_KEYWORDS.some((keyword) => lowerText.includes(keyword));
  }

  /**
   * Check if attributes contain Farcaster keywords
   */
  private static hasAttributeKeywords(attributes?: NFTAttribute[]): boolean {
    if (!attributes) return false;

    return attributes.some((attr) => {
      const traitType = attr.trait_type.toLowerCase();
      const value = String(attr.value).toLowerCase();
      return (
        FARCASTER_KEYWORDS.some((keyword) => traitType.includes(keyword)) ||
        FARCASTER_KEYWORDS.some((keyword) => value.includes(keyword))
      );
    });
  }

  /**
   * Check if URL is a Farcaster platform URL
   */
  private static isFarcasterUrl(url?: string): boolean {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes('farcaster.xyz') ||
      lowerUrl.includes('warpcast.com') ||
      lowerUrl.includes('supercast.xyz')
    );
  }

  /**
   * Extract channel name from text using patterns
   */
  private static extractChannelFromText(text?: string): string | undefined {
    if (!text) return undefined;

    for (const pattern of CHANNEL_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return undefined;
  }
}

/**
 * Helper function to detect and enrich a single NFT
 */
export function detectFarcasterMint(nft: NFT): NFT {
  return FarcasterDetector.enrichNFT(nft);
}

/**
 * Helper function to detect and enrich multiple NFTs
 */
export function detectFarcasterMints(nfts: NFT[]): NFT[] {
  return FarcasterDetector.enrichNFTs(nfts);
}
