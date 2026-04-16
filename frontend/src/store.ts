import type { ProfileCategory, Application, StatsData } from './types/index.ts';

export interface AppState {
  useApi: boolean;
  selectedProfile: ProfileCategory | null;
  formData: Record<string, unknown>;
  currentStep: number;
  token: string | null;
  isAuthenticated: boolean;
  adminEmail: string | null;
  stats: StatsData | null;
  applications: Application[];
  currentApplication: Application | null;
  filters: { userType: string; status: string; search: string; page: number };
  loading: boolean;
  modalOpen: boolean;
  pollsEnabled: boolean;
}

type StateKey = keyof AppState;
type Listener<K extends StateKey> = (value: AppState[K], state: AppState) => void;

class Store {
  private state: AppState;
  private listeners = new Map<StateKey, Set<Listener<StateKey>>>();

  constructor() {
    this.state = {
      useApi: false,
      selectedProfile: null,
      formData: {},
      currentStep: 1,
      token: sessionStorage.getItem('bm_token') || localStorage.getItem('bm_token'),
      isAuthenticated: !!(sessionStorage.getItem('bm_token') || localStorage.getItem('bm_token')),
      adminEmail: null,
      stats: null,
      applications: [],
      currentApplication: null,
      filters: { userType: 'all', status: 'all', search: '', page: 1 },
      loading: false,
      modalOpen: false,
      pollsEnabled: true,
    };
  }

  get<K extends StateKey>(key: K): AppState[K] {
    return this.state[key];
  }

  set<K extends StateKey>(key: K, value: AppState[K]): void {
    this.state[key] = value;
    this.notify(key);

    // Persist certain keys
    if (key === 'token') {
      if (value) {
        sessionStorage.setItem('bm_token', value as string);
        localStorage.removeItem('bm_token'); // migrate away from localStorage
      } else {
        sessionStorage.removeItem('bm_token');
        localStorage.removeItem('bm_token');
      }
    }
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  subscribe<K extends StateKey>(key: K, fn: Listener<K>): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    const set = this.listeners.get(key)!;
    set.add(fn as Listener<StateKey>);
    return () => set.delete(fn as Listener<StateKey>);
  }

  private notify(key: StateKey): void {
    this.listeners.get(key)?.forEach(fn => fn(this.state[key], this.state));
  }
}

export const store = new Store();

/** localStorage-based application store (offline fallback) */
export const localStore = {
  KEY: 'bm_apps',
  get(): Application[] {
    return JSON.parse(localStorage.getItem(this.KEY) || '[]');
  },
  add(app: Application): void {
    const data = this.get();
    data.unshift(app);
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },
  update(id: string, patch: Partial<Application>): void {
    const data = this.get();
    const idx = data.findIndex(a => a._id === id);
    if (idx > -1) {
      Object.assign(data[idx], patch);
      localStorage.setItem(this.KEY, JSON.stringify(data));
    }
  },
};
