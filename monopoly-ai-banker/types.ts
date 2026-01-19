
export interface Property {
  name: string;
  colorGroup?: string;
  cost: number;
}

export interface Player {
  id: string;
  name: string;
  balance: number;
  properties: Property[];
  color: string;
}

export type AppScreen = 'setup' | 'game' | 'player-detail';

export interface ScanResult {
  detectedMoney: {
    denomination: number;
    count: number;
  }[];
  detectedProperties: string[];
  totalValue: number;
}
