import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalcInputs, RecurringCost } from "@/lib/calculator";
import { Fuel, Zap, Sun, Plus, Trash2 } from "lucide-react";

interface CalculatorFormProps {
  inputs: CalcInputs;
  onChange: (inputs: CalcInputs) => void;
  onReset: () => void;
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  variant?: "default" | "ev" | "gas" | "solar";
}

const SliderField = ({ label, value, onChange, unit, min, max, step = 1, variant = "default" }: SliderFieldProps) => {
  const [display, setDisplay] = React.useState(String(value));

  React.useEffect(() => {
    setDisplay(String(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <div className="relative">
          <input
            type="number"
            value={display}
            onChange={(e) => {
              setDisplay(e.target.value);
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) onChange(Math.min(max, Math.max(min, num)));
            }}
            onBlur={() => {
              if (display === "" || isNaN(parseFloat(display))) {
                setDisplay("0");
                onChange(min);
              }
            }}
            step={step}
            min={min}
            className="input-field w-32 pr-12 text-right text-sm h-8"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        variant={variant}
        className="w-full"
      />
    </div>
  );
};

const RECURRENCE_OPTIONS = [
  { value: "1", label: "Annual" },
  { value: "2", label: "Every 2 years" },
  { value: "3", label: "Every 3 years" },
  { value: "4", label: "Every 4 years" },
  { value: "5", label: "Every 5 years" },
  { value: "6", label: "Every 6 years" },
  { value: "8", label: "Every 8 years" },
  { value: "10", label: "Every 10 years" },
];

const RecurringCostRow = ({
  cost,
  onChange,
  onRemove,
  variant,
}: {
  cost: RecurringCost;
  onChange: (updated: RecurringCost) => void;
  onRemove: () => void;
  variant: "ev" | "gas";
}) => (
  <div className="flex items-center gap-2">
    <Input
      value={cost.name}
      onChange={(e) => onChange({ ...cost, name: e.target.value })}
      placeholder="e.g. Tires, Battery"
      className="flex-1 h-8 text-sm"
    />
    <div className="relative shrink-0">
      <Input
        type="number"
        value={cost.amount || ""}
        onChange={(e) => onChange({ ...cost, amount: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        className="w-20 h-8 text-sm text-right pr-5"
      />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€</span>
    </div>
    <Select
      value={String(cost.everyYears)}
      onValueChange={(v) => onChange({ ...cost, everyYears: parseInt(v) })}
    >
      <SelectTrigger className="w-[130px] h-8 text-xs shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RECURRENCE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  </div>
);

const RecurringCostsSection = ({
  costs,
  onChange,
  variant,
}: {
  costs: RecurringCost[];
  onChange: (costs: RecurringCost[]) => void;
  variant: "ev" | "gas";
}) => {
  const addCost = () => {
    onChange([...costs, { id: crypto.randomUUID(), name: "", amount: 0, everyYears: 1 }]);
  };

  const updateCost = (index: number, updated: RecurringCost) => {
    const next = [...costs];
    next[index] = updated;
    onChange(next);
  };

  const removeCost = (index: number) => {
    onChange(costs.filter((_, i) => i !== index));
  };

  const accentColor = variant === "ev" ? "text-ev" : "text-gas";

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">Recurring Costs</Label>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 text-xs gap-1 ${accentColor}`}
          onClick={addCost}
        >
          <Plus className="w-3 h-3" />
          Add
        </Button>
      </div>
      {costs.length > 0 && (
        <div className="space-y-2">
          {costs.map((cost, i) => (
            <RecurringCostRow
              key={cost.id}
              cost={cost}
              onChange={(updated) => updateCost(i, updated)}
              onRemove={() => removeCost(i)}
              variant={variant}
            />
          ))}
        </div>
      )}
      {costs.length === 0 && (
        <p className="text-[11px] text-muted-foreground/60 italic">
          Add costs like tires, battery replacement, inspection...
        </p>
      )}
    </div>
  );
};

const SectionCard = ({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) => (
  <div className="card-calculator p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="section-title">{title}</h3>
    </div>
    <div className="grid gap-4">{children}</div>
  </div>
);

const set = (inputs: CalcInputs, onChange: (i: CalcInputs) => void, key: keyof CalcInputs) =>
  (v: number | boolean) => onChange({ ...inputs, [key]: v });

export default function CalculatorForm({ inputs, onChange, onReset }: CalculatorFormProps) {
  const s = (key: keyof CalcInputs) => set(inputs, onChange, key);

  return (
    <div className="space-y-5">
      {/* Gasoline & Electric - Side by Side */}
      <div className="grid sm:grid-cols-2 gap-5">
        <SectionCard icon={Fuel} title="Gasoline Car" color="bg-gas/15 text-gas">
          <SliderField label="Purchase Price" value={inputs.gasPurchasePrice} onChange={s("gasPurchasePrice") as (v: number) => void} unit="€" min={0} max={100000} step={100} variant="gas" />
          <SliderField label="Fuel Consumption" value={inputs.fuelConsumption} onChange={s("fuelConsumption") as (v: number) => void} unit="L/100km" min={2} max={20} step={0.1} variant="gas" />
          <SliderField label="Annual Maintenance" value={inputs.gasMaintenanceAnnual} onChange={s("gasMaintenanceAnnual") as (v: number) => void} unit="€/yr" min={0} max={3000} step={10} variant="gas" />
          <SliderField label="Annual Insurance" value={inputs.gasInsuranceAnnual} onChange={s("gasInsuranceAnnual") as (v: number) => void} unit="€/yr" min={0} max={3000} step={10} variant="gas" />
          <SliderField label="Resale Value" value={inputs.gasResaleValue} onChange={s("gasResaleValue") as (v: number) => void} unit="€" min={0} max={100000} step={100} variant="gas" />
          <RecurringCostsSection
            costs={inputs.gasRecurringCosts}
            onChange={(costs) => onChange({ ...inputs, gasRecurringCosts: costs })}
            variant="gas"
          />
        </SectionCard>

        <SectionCard icon={Zap} title="Electric Car" color="bg-ev/15 text-ev">
          <SliderField label="Purchase Price" value={inputs.evPurchasePrice} onChange={s("evPurchasePrice") as (v: number) => void} unit="€" min={0} max={100000} step={100} variant="ev" />
          <SliderField label="Energy Consumption" value={inputs.evConsumption} onChange={s("evConsumption") as (v: number) => void} unit="kWh/100km" min={8} max={35} step={0.1} variant="ev" />
          <SliderField label="Annual Maintenance" value={inputs.evMaintenanceAnnual} onChange={s("evMaintenanceAnnual") as (v: number) => void} unit="€/yr" min={0} max={3000} step={10} variant="ev" />
          <SliderField label="Annual Insurance" value={inputs.evInsuranceAnnual} onChange={s("evInsuranceAnnual") as (v: number) => void} unit="€/yr" min={0} max={3000} step={10} variant="ev" />
          <SliderField label="Resale Value" value={inputs.evResaleValue} onChange={s("evResaleValue") as (v: number) => void} unit="€" min={0} max={100000} step={100} variant="ev" />
          <RecurringCostsSection
            costs={inputs.evRecurringCosts}
            onChange={(costs) => onChange({ ...inputs, evRecurringCosts: costs })}
            variant="ev"
          />
        </SectionCard>
      </div>

      {/* Solar Toggle - Full Width */}
      <div className="card-calculator p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-solar/15 text-solar-foreground">
              <Sun className="w-4 h-4" />
            </div>
            <h3 className="section-title">Solar Panels</h3>
          </div>
          <Switch
            checked={inputs.hasSolar}
            onCheckedChange={s("hasSolar") as (v: boolean) => void}
            variant="solar"
          />
        </div>
        {inputs.hasSolar && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <SliderField label="System Capacity" value={inputs.solarCapacity} onChange={s("solarCapacity") as (v: number) => void} unit="kW" min={1} max={25} step={0.1} variant="solar" />
            <SliderField label="Annual Generation (0 = auto)" value={inputs.annualSolarGeneration} onChange={s("annualSolarGeneration") as (v: number) => void} unit="kWh/yr" min={0} max={30000} step={10} variant="solar" />
            <SliderField label="Household Usage" value={inputs.householdElectricityUsage} onChange={s("householdElectricityUsage") as (v: number) => void} unit="kWh/yr" min={0} max={15000} step={10} variant="solar" />
            <SliderField label="Solar System Cost" value={inputs.solarSystemCost} onChange={s("solarSystemCost") as (v: number) => void} unit="€" min={0} max={30000} step={100} variant="solar" />
            <div className="flex items-center justify-between sm:col-span-2">
              <Label className="text-sm font-medium">Net Metering?</Label>
              <Switch
                checked={inputs.hasNetMetering}
                onCheckedChange={s("hasNetMetering") as (v: boolean) => void}
                variant="solar"
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ↺ Reset to defaults
      </button>
    </div>
  );
}
