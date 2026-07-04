import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useUnits, type Unit } from "@/hooks/queries/units";

type UnitContextValue = {
  units: Unit[];
  selectedUnit: Unit | null;
  setSelectedUnit: (unit: Unit | null) => void;
  loading: boolean;
};

const UnitContext = createContext<UnitContextValue>({
  units: [],
  selectedUnit: null,
  setSelectedUnit: () => {},
  loading: false,
});

export function UnitProvider({ companyId, children }: { companyId: string; children: ReactNode }) {
  const { data: units = [], isLoading } = useUnits(companyId);
  const [selectedUnit, setSelectedUnitState] = useState<Unit | null>(null);

  useEffect(() => {
    if (!units.length) return;
    const storedId = localStorage.getItem(`unit_${companyId}`);
    if (storedId) {
      const found = units.find((u) => u.id === storedId && u.ativo);
      setSelectedUnitState(found ?? null);
    }
  }, [units, companyId]);

  const setSelectedUnit = (unit: Unit | null) => {
    setSelectedUnitState(unit);
    if (unit) {
      localStorage.setItem(`unit_${companyId}`, unit.id);
    } else {
      localStorage.removeItem(`unit_${companyId}`);
    }
  };

  return (
    <UnitContext.Provider value={{ units, selectedUnit, setSelectedUnit, loading: isLoading }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnitContext() {
  return useContext(UnitContext);
}
