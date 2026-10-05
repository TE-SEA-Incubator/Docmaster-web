import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopbarState {
  title: string;
  breadcrumbs: Breadcrumb[];
}

interface TopbarContextValue extends TopbarState {
  setTopbar: (title: string, breadcrumbs?: Breadcrumb[]) => void;
}

const TopbarContext = createContext<TopbarContextValue>({
  title: "",
  breadcrumbs: [],
  setTopbar: () => {},
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TopbarState>({ title: "", breadcrumbs: [] });

  const setTopbar = useCallback((title: string, breadcrumbs: Breadcrumb[] = []) => {
    setState({ title, breadcrumbs });
  }, []);

  return (
    <TopbarContext.Provider value={{ ...state, setTopbar }}>
      {children}
    </TopbarContext.Provider>
  );
}

export function useTopbarContext() {
  return useContext(TopbarContext);
}
