import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import { PopulatorTarget, TargetsResponse } from "../types/discovery";

interface PopulatorContextType {
  targets: PopulatorTarget[];
  activeTarget: PopulatorTarget | null;
  loading: boolean;
  error: string | null;
  setActiveTargetId: (id: string) => void;
  refreshTargets: () => Promise<void>;
}

const STORAGE_KEY = "mqp_active_target_id";

const PopulatorContext = createContext<PopulatorContextType | undefined>(
  undefined,
);

export const PopulatorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [targets, setTargets] = useState<PopulatorTarget[]>([]);
  const [activeTargetId, setActiveTargetIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      const res = await axios.get<TargetsResponse>("/api/discovery/targets", {
        params: refresh ? { refresh: true } : undefined,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        timeout: 8000,
      });
      const fetchedTargets = res.data.targets ?? [];
      setTargets(fetchedTargets);
      setError(null);

      // Select active target
      if (fetchedTargets.length > 0) {
        const storedId = localStorage.getItem(STORAGE_KEY);
        const match = fetchedTargets.find(
          (t) => t.id === storedId || t.projectName === storedId,
        );
        if (match) {
          setActiveTargetIdState(match.id);
        } else {
          const defaultTarget =
            fetchedTargets.find((t) => t.isDefault) ?? fetchedTargets[0];
          setActiveTargetIdState(defaultTarget.id);
          localStorage.setItem(STORAGE_KEY, defaultTarget.id);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch discovered targets:", err);
      setError(err?.message || "Failed to fetch targets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
    const interval = setInterval(() => {
      fetchTargets(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTargets]);

  const setActiveTargetId = (id: string) => {
    setActiveTargetIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const refreshTargets = async () => {
    await fetchTargets(true);
  };

  const activeTarget =
    targets.find((t) => t.id === activeTargetId) ??
    targets.find((t) => t.isDefault) ??
    (targets[0] || null);

  return (
    <PopulatorContext.Provider
      value={{
        targets,
        activeTarget,
        loading,
        error,
        setActiveTargetId,
        refreshTargets,
      }}
    >
      {children}
    </PopulatorContext.Provider>
  );
};

export const usePopulator = (): PopulatorContextType => {
  const context = useContext(PopulatorContext);
  if (!context) {
    throw new Error("usePopulator must be used within a PopulatorProvider");
  }
  return context;
};
