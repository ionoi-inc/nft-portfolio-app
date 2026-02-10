/**
 * Zustand Store Configuration
 * Main state management with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  NFT,
  Wallet,
  Collection,
  CustomGroup,
  AppSettings,
  SortMode,
  ViewMode,
  FilterOptions,
} from '../types';

interface AppStore {
  // Wallet Management
  wallets: Wallet[];
  activeWalletId?: string;
  addWallet: (wallet: Omit<Wallet, 'id' | 'addedAt'>) => void;
  removeWallet: (id: string) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  setActiveWallet: (id?: string) => void;

  // NFT Data
  nfts: Map<string, NFT>;
  collections: Map<string, Collection>;
  setNFTs: (walletId: string, nfts: NFT[]) => void;
  updateNFT: (id: string, updates: Partial<NFT>) => void;
  removeNFTsByWallet: (walletId: string) => void;
  getNFTsByWallet: (walletId: string) => NFT[];
  getAllNFTs: () => NFT[];

  // Custom Groups
  customGroups: CustomGroup[];
  createGroup: (name: string, description?: string, color?: string) => string;
  updateGroup: (id: string, updates: Partial<CustomGroup>) => void;
  deleteGroup: (id: string) => void;
  addToGroup: (groupId: string, nftIds: string[]) => void;
  removeFromGroup: (groupId: string, nftIds: string[]) => void;

  // UI State (not persisted)
  viewMode: ViewMode;
  sortMode: SortMode;
  filterOptions: FilterOptions;
  setViewMode: (mode: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setFilterOptions: (options: FilterOptions) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Utility
  clearAllData: () => void;
}

const defaultSettings: AppSettings = {
  refreshInterval: 5,
  showFloorPrice: true,
  theme: 'auto',
  defaultView: 'grid',
  defaultSort: 'recent',
  imageQuality: 'medium',
  enableNotifications: false,
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial State
      wallets: [],
      activeWalletId: undefined,
      nfts: new Map(),
      collections: new Map(),
      customGroups: [],
      viewMode: 'grid',
      sortMode: 'recent',
      filterOptions: {},
      settings: defaultSettings,

      // Wallet Actions
      addWallet: (wallet) => {
        const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newWallet: Wallet = {
          ...wallet,
          id,
          addedAt: Date.now(),
          isActive: true,
        };

        set((state) => ({
          wallets: [...state.wallets, newWallet],
          activeWalletId: state.activeWalletId || id,
        }));
      },

      removeWallet: (id) => {
        set((state) => {
          const newWallets = state.wallets.filter((w) => w.id !== id);
          const newActiveId =
            state.activeWalletId === id
              ? newWallets[0]?.id
              : state.activeWalletId;

          return {
            wallets: newWallets,
            activeWalletId: newActiveId,
          };
        });

        // Remove associated NFTs
        get().removeNFTsByWallet(id);
      },

      updateWallet: (id, updates) => {
        set((state) => ({
          wallets: state.wallets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      setActiveWallet: (id) => {
        set({ activeWalletId: id });
      },

      // NFT Actions
      setNFTs: (walletId, nfts) => {
        set((state) => {
          const newNftsMap = new Map(state.nfts);
          const newCollectionsMap = new Map(state.collections);

          // Remove old NFTs for this wallet
          Array.from(newNftsMap.values())
            .filter((nft) => nft.walletId === walletId)
            .forEach((nft) => newNftsMap.delete(nft.id));

          // Add new NFTs
          nfts.forEach((nft) => {
            newNftsMap.set(nft.id, nft);

            // Update collections
            const collectionId = `${nft.chain}:${nft.contractAddress}`;
            const existing = newCollectionsMap.get(collectionId);

            if (!existing) {
              newCollectionsMap.set(collectionId, {
                id: collectionId,
                name: nft.collection.name,
                contractAddress: nft.contractAddress,
                chain: nft.chain,
                evmChain: nft.evmChain,
                nftCount: 1,
                floorPrice: nft.collection.floorPrice,
                imageUrl: nft.collection.imageUrl,
                description: nft.collection.description,
              });
            } else {
              newCollectionsMap.set(collectionId, {
                ...existing,
                nftCount: existing.nftCount + 1,
              });
            }
          });

          return {
            nfts: newNftsMap,
            collections: newCollectionsMap,
          };
        });
      },

      updateNFT: (id, updates) => {
        set((state) => {
          const newNftsMap = new Map(state.nfts);
          const existing = newNftsMap.get(id);
          if (existing) {
            newNftsMap.set(id, { ...existing, ...updates });
          }
          return { nfts: newNftsMap };
        });
      },

      removeNFTsByWallet: (walletId) => {
        set((state) => {
          const newNftsMap = new Map(state.nfts);
          Array.from(newNftsMap.values())
            .filter((nft) => nft.walletId === walletId)
            .forEach((nft) => newNftsMap.delete(nft.id));
          return { nfts: newNftsMap };
        });
      },

      getNFTsByWallet: (walletId) => {
        return Array.from(get().nfts.values()).filter(
          (nft) => nft.walletId === walletId
        );
      },

      getAllNFTs: () => {
        return Array.from(get().nfts.values());
      },

      // Custom Group Actions
      createGroup: (name, description, color) => {
        const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newGroup: CustomGroup = {
          id,
          name,
          description,
          nftIds: [],
          color: color || getRandomColor(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          customGroups: [...state.customGroups, newGroup],
        }));

        return id;
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          customGroups: state.customGroups.map((g) =>
            g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g
          ),
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          customGroups: state.customGroups.filter((g) => g.id !== id),
        }));
      },

      addToGroup: (groupId, nftIds) => {
        set((state) => ({
          customGroups: state.customGroups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  nftIds: [...new Set([...g.nftIds, ...nftIds])],
                  updatedAt: Date.now(),
                }
              : g
          ),
        }));
      },

      removeFromGroup: (groupId, nftIds) => {
        set((state) => ({
          customGroups: state.customGroups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  nftIds: g.nftIds.filter((id) => !nftIds.includes(id)),
                  updatedAt: Date.now(),
                }
              : g
          ),
        }));
      },

      // UI Actions
      setViewMode: (mode) => set({ viewMode: mode }),
      setSortMode: (mode) => set({ sortMode: mode }),
      setFilterOptions: (options) => set({ filterOptions: options }),

      // Settings Actions
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      // Utility
      clearAllData: () => {
        set({
          wallets: [],
          activeWalletId: undefined,
          nfts: new Map(),
          collections: new Map(),
          customGroups: [],
          filterOptions: {},
        });
      },
    }),
    {
      name: 'nft-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist these fields
        wallets: state.wallets,
        activeWalletId: state.activeWalletId,
        customGroups: state.customGroups,
        settings: state.settings,
        viewMode: state.viewMode,
        sortMode: state.sortMode,
      }),
    }
  )
);

// Helper function to generate random colors for groups
function getRandomColor(): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#6C5CE7',
    '#A29BFE',
    '#FD79A8',
    '#FDCB6E',
    '#6C5CE7',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Selectors
export const useWallets = () => useStore((state) => state.wallets);
export const useActiveWallet = () => {
  const activeId = useStore((state) => state.activeWalletId);
  const wallets = useStore((state) => state.wallets);
  return wallets.find((w) => w.id === activeId);
};
export const useNFTs = () => useStore((state) => state.getAllNFTs());
export const useNFTsByWallet = (walletId: string) =>
  useStore((state) => state.getNFTsByWallet(walletId));
export const useCustomGroups = () => useStore((state) => state.customGroups);
export const useSettings = () => useStore((state) => state.settings);
