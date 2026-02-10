/**
 * NFT Card Component
 * Individual NFT tile for grid/list view
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { NFT } from '../types';

interface NFTCardProps {
  nft: NFT;
  onPress: (nft: NFT) => void;
  showWallet?: boolean;
  showFloorPrice?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  onPress,
  showWallet = false,
  showFloorPrice = false,
  size = 'medium',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const cardSize = {
    small: 120,
    medium: 160,
    large: 200,
  }[size];

  const imageUrl = nft.imageOptimized || nft.image;

  return (
    <Pressable
      style={[styles.container, { width: cardSize, height: cardSize + 60 }]}
      onPress={() => onPress(nft)}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
    >
      <View style={[styles.imageContainer, { width: cardSize, height: cardSize }]}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
          </View>
        )}
        
        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>🖼️</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            resizeMode="cover"
          />
        )}

        {/* Farcaster Badge */}
        {nft.metadata.isFarcasterMint && (
          <View style={styles.farcasterBadge}>
            <Text style={styles.badgeText}>FC</Text>
          </View>
        )}

        {/* Chain Badge */}
        <View style={[styles.chainBadge, { backgroundColor: getChainColor(nft.chain) }]}>
          <Text style={styles.chainText}>{getChainLabel(nft.chain, nft.evmChain)}</Text>
        </View>
      </View>

      {/* NFT Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {nft.name}
        </Text>
        <Text style={styles.collection} numberOfLines={1}>
          {nft.collection.name}
        </Text>

        {showFloorPrice && nft.collection.floorPrice && (
          <Text style={styles.floorPrice}>
            ⌊ {nft.collection.floorPrice.amount.toFixed(3)} {nft.collection.floorPrice.currency}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

function getChainColor(chain: string): string {
  const colors: Record<string, string> = {
    ethereum: '#627EEA',
    polygon: '#8247E5',
    arbitrum: '#28A0F0',
    optimism: '#FF0420',
    base: '#0052FF',
    zora: '#000000',
    solana: '#14F195',
  };
  return colors[chain] || '#666';
}

function getChainLabel(chain: string, evmChain?: string): string {
  if (chain === 'evm' && evmChain) {
    return evmChain.charAt(0).toUpperCase();
  }
  return chain === 'solana' ? 'S' : 'E';
}

const styles = StyleSheet.create({
  container: {
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 32,
  },
  farcasterBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8A63D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  chainBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chainText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  infoContainer: {
    padding: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  collection: {
    fontSize: 12,
    color: '#666',
  },
  floorPrice: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
});
