export interface Page {
  render(): string;
  mount?(): void;
  unmount?(): void;
}

export type LayoutType = 'public' | 'admin';

export interface RouteConfig {
  path: string;
  page: () => Page;
  layout: LayoutType;
  guard?: () => boolean;
}
