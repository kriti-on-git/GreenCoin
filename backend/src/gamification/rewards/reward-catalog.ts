export interface RewardItem {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  stock?: number;
  type: 'VOUCHER' | 'DONATION' | 'PLANT_TREE';
}

export const rewardCatalog: RewardItem[] = [];
