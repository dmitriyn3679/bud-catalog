import { createContext, useContext, useState } from 'react';

interface CatalogDrawerCtx {
  opened: boolean;
  open: () => void;
  close: () => void;
}

const CatalogDrawerContext = createContext<CatalogDrawerCtx | null>(null);

export function CatalogDrawerProvider({ children }: { children: React.ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <CatalogDrawerContext.Provider value={{ opened, open: () => setOpened(true), close: () => setOpened(false) }}>
      {children}
    </CatalogDrawerContext.Provider>
  );
}

export function useCatalogDrawer() {
  const ctx = useContext(CatalogDrawerContext);
  if (!ctx) throw new Error('useCatalogDrawer must be used within CatalogDrawerProvider');
  return ctx;
}
