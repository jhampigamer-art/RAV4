
export interface Package {
  id: string;
  address: string;
  recipient: string;
  status: 'pending' | 'delivered';
  timestamp: number;
}

export interface Stop {
  address: string;
  packages: Package[];
  lat?: number;
  lng?: number;
}

export type GPSProvider = 'google' | 'waze' | 'apple';

export interface AppState {
  packages: Package[];
  isScanning: boolean;
  onboardingStep: number;
  preferredGPS: GPSProvider;
}
