/**
 * NFT Grid Component
 * High-performance grid view using FlashList
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NFT, SortMode } from '../types';
import { NFTCard } from './NFTCard';

interface NFTGridProps {
  nfts: NFT[];
  onNFTPress: (nft: NFT) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showFloorPrice?: boolean;
  sortMode?: SortMode;
  numColumns?: number;
  emptyMessage?: string;
}

export const NFTGrid: React.FC<NFTGridProps> = ({
  nfts,
  onNFTPress,
  onRefresh,
  isRefreshing = false,
  showFloorPrice = false,
  sortMode = 'recent',
  numColumns = 2,
  emptyMessage = 'No NFTs found',
}) => {
  // Sort and group NFTs based on sort mode
  const sections = useMemo(() => {
    return groupAndSortNFTs(nfts, sortMode);
  }, [nfts, sortMode]);

  const renderItem = ({ item }: { item: NFT | SectionHeader }) => {
    if ('isHeader' in item) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          {item.count !== undefined && (
            <Text style={styles.sectionCount}>{item.count}</Text>
          )}
        </View>
      );
    }

    return (
      <NFTCard
        nft={item}
        onPress={onNFTPress}
        showFloorPrice={showFloorPrice}
        size="medium"
      />
    );
  };

  const getItemType = (item: NFT | SectionHeader) => {
    return 'isHeader' in item ? 'sectionHeader' : 'nft';
  };

  if (nfts.length === 0 && !isRefreshing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={sections}
      renderItem={renderItem}
      estimatedItemSize={220}
      numColumns={numColumns}
      getItemType={getItemType}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerStyle={styles.contentContainer}
    />
  );
};

interface SectionHeader {
  isHeader: true;
  title: string;
  count?: number;
}

/**
 * Group and sort NFTs based on sort mode
 */
function groupAndSortNFTs(nfts: NFT[], sortMode: SortMode): Array<NFT | SectionHeader> {
  const result: Array<NFT | SectionHeader> = [];

  switch (sortMode) {
    case 'collection': {
      // Group by collection
      const collections = new Map<string, NFT[]>();
      nfts.forEach((nft) => {
        const key = nft.collection.address;
        if (!collections.has(key)) {
          collections.set(key, []);
        }
        collections.get(key)!.push(nft);
      });

      // Sort collections by name
      const sortedCollections = Array.from(collections.entries()).sort(
        ([, a], [, b]) => a[0].collection.name.localeCompare(b[0].collection.name)
      );

      sortedCollections.forEach(([, collectionNfts]) => {
        result.push({
          isHeader: true,
          title: collectionNfts[0].collection.name,
          count: collectionNfts.length,
        });
        result.push(...collectionNfts);
      });
      break;
    }

    case 'farcaster': {
      // Separate Farcaster mints from others
      const farcasterNfts = nfts.filter((nft) => nft.metadata.isFarcasterMint);
      const otherNfts = nfts.filter((nft) => !nft.metadata.isFarcasterMint);

      if (farcasterNfts.length > 0) {
        result.push({
          isHeader: true,
          title: 'Farcaster Mints',
          count: farcasterNfts.length,
        });
        result.push(...farcasterNfts);
      }

      if (otherNfts.length > 0) {
        result.push({
          isHeader: true,
          title: 'Other NFTs',
          count: otherNfts.length,
        });
        result.push(...otherNfts);
      }
      break;
    }

    case 'value': {
      // Sort by floor price (descending)
      const sorted = [...nfts].sort((a, b) => {
        const aPrice = a.collection.floorPrice?.amount || 0;
        const bPrice = b.collection.floorPrice?.amount || 0;
        return bPrice - aPrice;
      });
      result.push(...sorted);
      break;
    }

    case 'recent':
    default: {
      // Sort by last fetched (most recent first)
      const sorted = [...nfts].sort((a, b) => b.lastFetched - a.lastFetched);
      result.push(...sorted);
      break;
    }
  }

  return result;
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 8,
  },
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
