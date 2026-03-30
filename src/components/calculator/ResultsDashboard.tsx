import { forwardRef } from "react";
import { CalcInputs, CalcResults } from "@/lib/calculator";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Zap, Sun, Info, Fuel } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
  LineChart, Line, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  results: CalcResults;
  inputs: CalcInputs;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const fmtDec = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);

/* Tooltip wrapper for values */
const ValueWithTip = ({
  children,
  tip,
}: {
  children: React.ReactNode;
  tip: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help border-b border-dotted border-muted-foreground/40">
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
      {tip}
    </TooltipContent>
  </Tooltip>
);

const MetricCard = ({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "ev" | "gas" | "savings" | "loss";
  tooltip?: string;
}) => {
  const accentColors: Record<string, string> = {
    ev: "text-ev",
    gas: "text-gas",
    savings: "text-savings",
    loss: "text-loss",
  };
  const bgColors: Record<string, string> = {
    ev: "bg-ev/10",
    gas: "bg-gas/10",
    savings: "bg-ev/10",
    loss: "bg-loss/10",
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent ? bgColors[accent] : "bg-secondary"}`}>
          <Icon className={`w-3.5 h-3.5 ${accent ? accentColors[accent] : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? accentColors[accent] : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
};

const EV_COLOR = "#2563eb";
const GAS_COLOR = "#e84525";
const SOLAR_COLOR = "#eab308";

const ResultsDashboard = forwardRef<HTMLDivElement, Props>(function ResultsDashboard({ results, inputs }, ref) {
  const {
    gasAnnualFuel, gasAnnualTotal,
    evAnnualCharging, evAnnualTotal,
    annualSavings, gasTotalCost, evTotalCost, totalSavings,
    breakEvenYears, breakEvenYearsWithSolar, maxEvPrice, yearlyData,
    solarCoveragePercent, solarEvSavings, solarRoiYears, gridElectricityCost,
    evEnergyNeeded, combinedRoiYears, evSolarTotalCost, totalSavingsWithSolar,
    evSolarAnnualTotal, gasRecurringAnnualized, evRecurringAnnualized,
    householdElectricitySavings,
  } = results;

  const isSaving = totalSavings > 0;
  const hasSolar = inputs.hasSolar;

  // Monthly ownership cost = total cost / ownership months
  const ownershipMonths = inputs.ownershipYears * 12;
  const gasMonthly = ownershipMonths > 0 ? gasTotalCost / ownershipMonths : 0;
  const evMonthly = ownershipMonths > 0 ? evTotalCost / ownershipMonths : 0;
  const evSolarMonthly = ownershipMonths > 0 ? evSolarTotalCost / ownershipMonths : 0;

  const annualBarData = [
    { name: "Fuel / Charging", gas: gasAnnualFuel, ev: evAnnualCharging },
    { name: "Maintenance", gas: inputs.gasMaintenanceAnnual, ev: inputs.evMaintenanceAnnual },
    { name: "Insurance", gas: inputs.gasInsuranceAnnual, ev: inputs.evInsuranceAnnual },
    ...(gasRecurringAnnualized > 0 || evRecurringAnnualized > 0
      ? [{ name: "Recurring", gas: gasRecurringAnnualized, ev: evRecurringAnnualized }]
      : []),
    { name: "Total", gas: gasAnnualTotal, ev: evAnnualTotal },
  ];

  const cumulativeData = yearlyData.map((d) => {
    const entry: Record<string, string | number> = {
      year: `Yr ${d.year}`,
      "Gasoline": Math.round(d.gasCumulative),
      "Electric": Math.round(d.evCumulative),
    };
    if (hasSolar) {
      entry["EV + Solar"] = Math.round(d.evSolarCumulative);
    }
    return entry;
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={ref} className="space-y-6">
        {/* Summary Metrics */}
        <div data-pdf-section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Annual Savings"
            value={fmt(Math.abs(annualSavings))}
            sub={annualSavings >= 0 ? "EV saves per year" : "Gas cheaper per year"}
            icon={annualSavings >= 0 ? TrendingUp : TrendingDown}
            accent={annualSavings >= 0 ? "savings" : "loss"}
            tooltip={`Formula: Gas Annual Total − EV Annual Total\n= ${fmt(gasAnnualTotal)} − ${fmt(evAnnualTotal)}\n= ${fmt(annualSavings)}\n\nGas Annual = fuel (${fmt(gasAnnualFuel)}) + maintenance (${fmt(inputs.gasMaintenanceAnnual)}) + insurance (${fmt(inputs.gasInsuranceAnnual)})${gasRecurringAnnualized > 0 ? ` + recurring (${fmt(gasRecurringAnnualized)})` : ""}\nEV Annual = charging (${fmt(evAnnualCharging)}) + maintenance (${fmt(inputs.evMaintenanceAnnual)}) + insurance (${fmt(inputs.evInsuranceAnnual)})${evRecurringAnnualized > 0 ? ` + recurring (${fmt(evRecurringAnnualized)})` : ""}`}
          />
          <MetricCard
            label={`Total ${inputs.ownershipYears}yr Savings`}
            value={fmt(Math.abs(totalSavings))}
            sub={isSaving ? "EV total savings" : "Gas total savings"}
            icon={DollarSign}
            accent={isSaving ? "savings" : "loss"}
            tooltip={`Formula: Gas TCO − EV TCO\n= ${fmt(gasTotalCost)} − ${fmt(evTotalCost)}\n= ${fmt(totalSavings)}\n\nGas TCO = purchase (${fmt(inputs.gasPurchasePrice)}) − resale (${fmt(inputs.gasResaleValue)}) + operating × ${inputs.ownershipYears}yr\nEV TCO = purchase (${fmt(inputs.evPurchasePrice)}) − resale (${fmt(inputs.evResaleValue)}) + operating × ${inputs.ownershipYears}yr`}
          />
          <MetricCard
            label="Break-Even"
            value={
              breakEvenYears === null
                ? "Never"
                : breakEvenYears === 0
                ? "Immediate"
                : `${breakEvenYears.toFixed(1)} years`
            }
            sub="EV payback period"
            icon={Calendar}
            accent="ev"
            tooltip={`Formula: Net Price Difference ÷ Annual Savings\n= (EV net cost − Gas net cost) ÷ annual savings\n= (${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)} − ${fmt(inputs.gasPurchasePrice)} + ${fmt(inputs.gasResaleValue)}) ÷ ${fmt(annualSavings)}/yr\n= ${fmt((inputs.evPurchasePrice - inputs.evResaleValue) - (inputs.gasPurchasePrice - inputs.gasResaleValue))} ÷ ${fmt(annualSavings)}\n= ${breakEvenYears === null ? "Never (EV costs more annually)" : breakEvenYears === 0 ? "Immediate (EV is cheaper upfront)" : `${breakEvenYears.toFixed(1)} years`}`}
          />
          <MetricCard
            label="Max EV Price"
            value={fmt(maxEvPrice)}
            sub="To break even with gas"
            icon={Zap}
            accent="ev"
            tooltip={`Formula: Gas net cost + (annual savings × years) + EV resale\n= (${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)}) + (${fmt(annualSavings)} × ${inputs.ownershipYears}) + ${fmt(inputs.evResaleValue)}\n= ${fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)} + ${fmt(annualSavings * inputs.ownershipYears)} + ${fmt(inputs.evResaleValue)}\n= ${fmt(maxEvPrice)}`}
          />
        </div>

        {/* Monthly Ownership Cost */}
        <div data-pdf-section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Gas Monthly Cost"
            value={fmt(gasMonthly)}
            sub="total cost / month"
            icon={Fuel}
            accent="gas"
            tooltip={`Formula: Gas TCO ÷ ownership months\n= ${fmt(gasTotalCost)} ÷ ${ownershipMonths} months\n= ${fmt(gasMonthly)}/month\n\nTCO = (${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)}) + operating costs × ${inputs.ownershipYears}yr`}
          />
          <MetricCard
            label="EV Monthly Cost"
            value={fmt(evMonthly)}
            sub="total cost / month"
            icon={Zap}
            accent="ev"
            tooltip={`Formula: EV TCO ÷ ownership months\n= ${fmt(evTotalCost)} ÷ ${ownershipMonths} months\n= ${fmt(evMonthly)}/month\n\nTCO = (${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)}) + operating costs × ${inputs.ownershipYears}yr`}
          />
          {hasSolar ? (
            <MetricCard
              label="EV + Solar Monthly"
              value={fmt(evSolarMonthly)}
              sub="total cost / month"
              icon={Sun}
              accent="ev"
              tooltip={`Formula: EV+Solar TCO ÷ ownership months\n= ${fmt(evSolarTotalCost)} ÷ ${ownershipMonths} months\n= ${fmt(evSolarMonthly)}/month\n\nTCO = (${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)}) + ${fmt(inputs.solarSystemCost)} (solar) + reduced operating × ${inputs.ownershipYears}yr`}
            />
          ) : (
            <MetricCard
              label="Monthly Savings"
              value={fmt(Math.abs(gasMonthly - evMonthly))}
              sub={gasMonthly >= evMonthly ? "EV saves per month" : "Gas cheaper per month"}
              icon={gasMonthly >= evMonthly ? TrendingUp : TrendingDown}
              accent={gasMonthly >= evMonthly ? "savings" : "loss"}
              tooltip={`Formula: Gas monthly − EV monthly\n= ${fmt(gasMonthly)} − ${fmt(evMonthly)}\n= ${fmt(gasMonthly - evMonthly)}/month`}
            />
          )}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Annual Cost Breakdown */}
          <div data-pdf-section className="card-calculator p-5">
            <h3 className="section-title mb-4">Annual Cost Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={annualBarData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <ReTooltip
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(150,12%,88%)", fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gas" name="Gasoline" fill={GAS_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="ev" name="Electric" fill={EV_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cumulative Cost */}
          <div data-pdf-section className="card-calculator p-5">
            <h3 className="section-title mb-4">Cumulative Cost Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,12%,88%)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <ReTooltip
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(150,12%,88%)", fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {(() => {
                  const be = hasSolar ? breakEvenYearsWithSolar : breakEvenYears;
                  if (be === null || be <= 0 || be > yearlyData.length) return null;
                  return (
                    <ReferenceLine
                      x={`Yr ${Math.ceil(be)}`}
                      stroke="hsl(155,10%,65%)"
                      strokeDasharray="5 5"
                      label={{ value: "Break-even", fontSize: 10, fill: "hsl(155,10%,45%)" }}
                    />
                  );
                })()}
                <Line type="monotone" dataKey="Gasoline" stroke={GAS_COLOR} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Electric" stroke={EV_COLOR} strokeWidth={2.5} dot={false} />
                {hasSolar && (
                  <Line type="monotone" dataKey="EV + Solar" stroke={SOLAR_COLOR} strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div data-pdf-section className="card-calculator p-5">
          <h3 className="section-title mb-4">Detailed Cost Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Category</th>
                  <th className="text-right py-2 px-4 font-semibold text-gas">Gasoline</th>
                  <th className="text-right py-2 px-4 font-semibold text-ev">Electric</th>
                  <th className="text-right py-2 pl-4 font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip={`Input values. Net depreciation: Gas = ${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)} = ${fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)} | EV = ${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)} = ${fmt(inputs.evPurchasePrice - inputs.evResaleValue)}`}>
                      Purchase Price
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.gasPurchasePrice)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.evPurchasePrice)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${inputs.gasPurchasePrice >= inputs.evPurchasePrice ? "text-savings" : "text-loss"}`}>
                    {fmt(inputs.gasPurchasePrice - inputs.evPurchasePrice)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip={`Estimated value at end of ${inputs.ownershipYears}-year ownership. Subtracted from purchase price to get net depreciation cost.`}>
                      Resale Value
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.gasResaleValue)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.evResaleValue)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${inputs.evResaleValue >= inputs.gasResaleValue ? "text-savings" : "text-loss"}`}>
                    {fmt(inputs.evResaleValue - inputs.gasResaleValue)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip={`Net Depreciation = Purchase Price − Resale Value\nGas: ${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)} = ${fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)}\nEV: ${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)} = ${fmt(inputs.evPurchasePrice - inputs.evResaleValue)}`}>
                      Net Depreciation
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.evPurchasePrice - inputs.evResaleValue)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${(inputs.gasPurchasePrice - inputs.gasResaleValue) >= (inputs.evPurchasePrice - inputs.evResaleValue) ? "text-savings" : "text-loss"}`}>
                    {fmt((inputs.gasPurchasePrice - inputs.gasResaleValue) - (inputs.evPurchasePrice - inputs.evResaleValue))}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip={`Gas: (${inputs.annualKm.toLocaleString()} km ÷ 100) × ${inputs.fuelConsumption} L/100km × ${fmtDec(inputs.fuelPrice)}/L = ${fmt(gasAnnualFuel)}/yr\nEV: (${inputs.annualKm.toLocaleString()} km ÷ 100) × ${inputs.evConsumption} kWh/100km × ${fmtDec(inputs.electricityCost)}/kWh = ${fmt(evAnnualCharging)}/yr`}>
                      Annual Fuel/Charging
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(gasAnnualFuel)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(evAnnualCharging)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${gasAnnualFuel >= evAnnualCharging ? "text-savings" : "text-loss"}`}>
                    {fmt(gasAnnualFuel - evAnnualCharging)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip="User-specified annual maintenance cost. EVs typically have lower maintenance (no oil changes, fewer brake replacements due to regenerative braking).">
                      Annual Maintenance
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.gasMaintenanceAnnual)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.evMaintenanceAnnual)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${inputs.gasMaintenanceAnnual >= inputs.evMaintenanceAnnual ? "text-savings" : "text-loss"}`}>
                    {fmt(inputs.gasMaintenanceAnnual - inputs.evMaintenanceAnnual)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    <ValueWithTip tip="User-specified annual insurance premium.">
                      Annual Insurance
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.gasInsuranceAnnual)}</td>
                  <td className="text-right py-2.5 px-4">{fmt(inputs.evInsuranceAnnual)}</td>
                  <td className={`text-right py-2.5 pl-4 font-medium ${inputs.gasInsuranceAnnual >= inputs.evInsuranceAnnual ? "text-savings" : "text-loss"}`}>
                    {fmt(inputs.gasInsuranceAnnual - inputs.evInsuranceAnnual)}
                  </td>
                </tr>
                {(gasRecurringAnnualized > 0 || evRecurringAnnualized > 0) && (
                  <tr>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      <ValueWithTip tip={`Each recurring cost is annualized: amount ÷ frequency in years.\nGas: ${inputs.gasRecurringCosts.map(c => `${c.name || '?'}: ${fmt(c.amount)} ÷ ${c.everyYears}yr = ${fmt(c.amount / c.everyYears)}/yr`).join(', ') || 'none'}\nEV: ${inputs.evRecurringCosts.map(c => `${c.name || '?'}: ${fmt(c.amount)} ÷ ${c.everyYears}yr = ${fmt(c.amount / c.everyYears)}/yr`).join(', ') || 'none'}`}>
                        Recurring Costs (annualized)
                      </ValueWithTip>
                    </td>
                    <td className="text-right py-2.5 px-4">{fmt(gasRecurringAnnualized)}</td>
                    <td className="text-right py-2.5 px-4">{fmt(evRecurringAnnualized)}</td>
                    <td className={`text-right py-2.5 pl-4 font-medium ${gasRecurringAnnualized >= evRecurringAnnualized ? "text-savings" : "text-loss"}`}>
                      {fmt(gasRecurringAnnualized - evRecurringAnnualized)}
                    </td>
                  </tr>
                )}
                <tr className="font-bold border-t-2">
                  <td className="py-2.5 pr-4">
                    <ValueWithTip tip={`Formula: (Purchase − Resale) + (fuel/charging + maintenance + insurance + recurring) × ${inputs.ownershipYears} years\n\nGas: (${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)}) + ${fmt(gasAnnualTotal)} × ${inputs.ownershipYears} = ${fmt(gasTotalCost)}\nEV: (${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)}) + ${fmt(evAnnualTotal)} × ${inputs.ownershipYears} = ${fmt(evTotalCost)}`}>
                      Total ({inputs.ownershipYears} years)
                    </ValueWithTip>
                  </td>
                  <td className="text-right py-2.5 px-4 text-gas">{fmt(gasTotalCost)}</td>
                  <td className="text-right py-2.5 px-4 text-ev">{fmt(evTotalCost)}</td>
                  <td className={`text-right py-2.5 pl-4 ${isSaving ? "text-savings" : "text-loss"}`}>
                    {fmt(totalSavings)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Calculation Breakdown */}
          <div data-pdf-section className="card-calculator p-5">
            <h3 className="section-title mb-4">Calculation Details</h3>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Gas calculations */}
              <div>
                <h4 className="text-sm font-semibold text-gas mb-3">Gasoline Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Distance per year</span>
                    <span className="font-medium">{inputs.annualKm.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Fuel consumption</span>
                    <span className="font-medium">{inputs.fuelConsumption} L/100km</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Fuel needed per year</span>
                    <span className="font-medium">{((inputs.annualKm / 100) * inputs.fuelConsumption).toFixed(0)} L</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Fuel price</span>
                    <span className="font-medium">{fmtDec(inputs.fuelPrice)}/L</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual fuel cost</span>
                    <span className="font-medium text-gas">{fmt(gasAnnualFuel)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual maintenance</span>
                    <span className="font-medium">{fmt(inputs.gasMaintenanceAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual insurance</span>
                    <span className="font-medium">{fmt(inputs.gasInsuranceAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-gas/5 rounded px-2 font-semibold">
                    <span>Annual total</span>
                    <span className="text-gas">{fmt(gasAnnualTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-gas/5 rounded px-2 font-semibold">
                    <span>{inputs.ownershipYears}-year total</span>
                    <span className="text-gas">{fmt(gasTotalCost)}</span>
                  </div>
                </div>
              </div>

              {/* EV calculations */}
              <div>
                <h4 className="text-sm font-semibold text-ev mb-3">Electric Cost Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Distance per year</span>
                    <span className="font-medium">{inputs.annualKm.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Energy consumption</span>
                    <span className="font-medium">{inputs.evConsumption} kWh/100km</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Energy needed per year</span>
                    <span className="font-medium">{evEnergyNeeded.toFixed(0)} kWh</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Electricity price</span>
                    <span className="font-medium">{fmtDec(inputs.electricityCost)}/kWh</span>
                  </div>
                  {hasSolar && (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Solar coverage</span>
                        <span className="font-medium">{results.solarCoverageKwh.toFixed(0)} kWh ({solarCoveragePercent.toFixed(0)}%)</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Grid electricity needed</span>
                        <span className="font-medium">{(evEnergyNeeded - results.solarCoverageKwh).toFixed(0)} kWh</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual charging cost</span>
                    <span className="font-medium text-ev">{fmt(evAnnualCharging)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual maintenance</span>
                    <span className="font-medium">{fmt(inputs.evMaintenanceAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border">
                    <span className="text-muted-foreground">Annual insurance</span>
                    <span className="font-medium">{fmt(inputs.evInsuranceAnnual)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-ev/5 rounded px-2 font-semibold">
                    <span>Annual total</span>
                    <span className="text-ev">{fmt(evAnnualTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-ev/5 rounded px-2 font-semibold">
                    <span>{inputs.ownershipYears}-year total</span>
                    <span className="text-ev">{fmt(evTotalCost)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Break-even formula */}
            <div data-pdf-section className="mt-6 p-4 rounded-lg bg-secondary text-sm">
              <h4 className="font-semibold mb-2">Break-Even Formula</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>Net EV cost: {fmt(inputs.evPurchasePrice)} − {fmt(inputs.evResaleValue)} = <span className="font-medium text-foreground">{fmt(inputs.evPurchasePrice - inputs.evResaleValue)}</span></p>
                <p>Net Gas cost: {fmt(inputs.gasPurchasePrice)} − {fmt(inputs.gasResaleValue)} = <span className="font-medium text-foreground">{fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)}</span></p>
                <p>Price difference: {fmt(inputs.evPurchasePrice - inputs.evResaleValue)} − {fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)} = <span className="font-medium text-foreground">{fmt((inputs.evPurchasePrice - inputs.evResaleValue) - (inputs.gasPurchasePrice - inputs.gasResaleValue))}</span></p>
                <p>Annual operating savings: {fmt(gasAnnualTotal)} − {fmt(evAnnualTotal)} = <span className="font-medium text-foreground">{fmt(annualSavings)}</span></p>
                <p>Break-even: {fmt((inputs.evPurchasePrice - inputs.evResaleValue) - (inputs.gasPurchasePrice - inputs.gasResaleValue))} ÷ {fmt(annualSavings)}/yr = <span className="font-medium text-foreground">
                  {breakEvenYears === null ? "Never (EV costs more annually)" : breakEvenYears === 0 ? "Immediate" : `${breakEvenYears.toFixed(1)} years`}
                </span></p>
              </div>
            </div>

            {/* Max EV price formula */}
            <div data-pdf-section className="mt-3 p-4 rounded-lg bg-secondary text-sm">
              <h4 className="font-semibold mb-2">Maximum EV Price Formula</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>Formula: Gas net cost + (annual savings × years) + EV resale value</p>
                <p>= ({fmt(inputs.gasPurchasePrice)} − {fmt(inputs.gasResaleValue)}) + ({fmt(annualSavings)} × {inputs.ownershipYears}) + {fmt(inputs.evResaleValue)}</p>
                <p>= {fmt(inputs.gasPurchasePrice - inputs.gasResaleValue)} + {fmt(annualSavings * inputs.ownershipYears)} + {fmt(inputs.evResaleValue)} = <span className="font-medium text-foreground">{fmt(maxEvPrice)}</span></p>
              </div>
            </div>
          </div>

        {/* Solar-Only Benefits */}
        {inputs.hasSolar && (
          <div data-pdf-section className="card-calculator p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-solar/15">
                <Sun className="w-4 h-4 text-solar-foreground" />
              </div>
              <h3 className="section-title">Solar Benefits (Standalone)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              These savings apply regardless of your vehicle choice — they come from powering your home with solar instead of buying electricity from the grid.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Household Elec. Savings</p>
                <p className="text-xl font-bold text-savings">
                  <ValueWithTip tip={`Formula: min(solar generation, household usage) × electricity price\n= min(${(inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200).toLocaleString()}, ${inputs.householdElectricityUsage.toLocaleString()}) kWh × ${fmtDec(inputs.electricityCost)}/kWh\n= ${Math.min(inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200, inputs.householdElectricityUsage).toLocaleString()} kWh × ${fmtDec(inputs.electricityCost)}\n= ${fmt(householdElectricitySavings)}/year`}>
                    {fmt(householdElectricitySavings)}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">saved per year</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Total Household Savings</p>
                <p className="text-xl font-bold text-savings">
                  <ValueWithTip tip={`Formula: annual savings × ownership years\n= ${fmt(householdElectricitySavings)} × ${inputs.ownershipYears}\n= ${fmt(householdElectricitySavings * inputs.ownershipYears)}`}>
                    {fmt(householdElectricitySavings * inputs.ownershipYears)}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">over {inputs.ownershipYears} years</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Solar ROI Period</p>
                <p className="text-xl font-bold">
                  <ValueWithTip tip={`Formula: solar system cost ÷ annual solar value\n= ${fmt(inputs.solarSystemCost)} ÷ (${(inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200).toLocaleString()} kWh × ${fmtDec(inputs.electricityCost)}/kWh)\n= ${fmt(inputs.solarSystemCost)} ÷ ${fmt((inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200) * inputs.electricityCost)}/yr\n= ${solarRoiYears !== null ? `${solarRoiYears.toFixed(1)} years` : "N/A"}`}>
                    {solarRoiYears !== null ? `${solarRoiYears.toFixed(1)} yrs` : "N/A"}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">solar system payback</p>
              </div>
            </div>
          </div>
        )}

        {/* EV + Solar Combined */}
        {inputs.hasSolar && (
          <div data-pdf-section className="card-calculator p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-ev/15">
                <Zap className="w-4 h-4 text-ev" />
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-solar/15 -ml-2">
                <Sun className="w-4 h-4 text-solar-foreground" />
              </div>
              <h3 className="section-title">EV + Solar Combined</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              When you combine an EV with solar, the EV benefits from reduced charging costs using solar-generated electricity.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Solar EV Coverage</p>
                <p className="text-xl font-bold">
                  <ValueWithTip tip={`Formula: solar surplus available for EV ÷ EV energy needed × 100\n\nSolar generation: ${(inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200).toLocaleString()} kWh\n− Household usage: ${inputs.householdElectricityUsage.toLocaleString()} kWh\n= Surplus: ${Math.max(0, (inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200) - inputs.householdElectricityUsage).toLocaleString()} kWh\n${!inputs.hasNetMetering ? "× 50% (no net metering)\n" : ""}Usable for EV: ${results.solarCoverageKwh.toFixed(0)} kWh of ${evEnergyNeeded.toFixed(0)} kWh needed\n= ${solarCoveragePercent.toFixed(1)}%`}>
                    {solarCoveragePercent.toFixed(0)}%
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">of EV charging needs</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">EV Charging Savings</p>
                <p className="text-xl font-bold text-savings">
                  <ValueWithTip tip={`Formula: solar EV coverage × electricity price\n= ${results.solarCoverageKwh.toFixed(0)} kWh × ${fmtDec(inputs.electricityCost)}/kWh\n= ${fmt(solarEvSavings)}/year saved on EV charging`}>
                    {fmt(solarEvSavings)}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">on EV charging/yr</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">Grid Cost for EV</p>
                <p className="text-xl font-bold">
                  <ValueWithTip tip={`Formula: (EV energy needed − solar coverage) × electricity price\n= (${evEnergyNeeded.toFixed(0)} − ${results.solarCoverageKwh.toFixed(0)}) kWh × ${fmtDec(inputs.electricityCost)}/kWh\n= ${(evEnergyNeeded - results.solarCoverageKwh).toFixed(0)} kWh × ${fmtDec(inputs.electricityCost)}\n= ${fmt(gridElectricityCost)}/year`}>
                    {fmt(gridElectricityCost)}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">annual electricity</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">EV + Solar Total</p>
                <p className="text-xl font-bold text-savings">
                  <ValueWithTip tip={`Formula: (EV purchase − resale) + solar cost + reduced operating × years\n= (${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)}) + ${fmt(inputs.solarSystemCost)} + operating × ${inputs.ownershipYears}yr\n= ${fmt(evSolarTotalCost)}\n\nVs gas TCO (${fmt(gasTotalCost)}): ${totalSavingsWithSolar >= 0 ? `saves ${fmt(totalSavingsWithSolar)}` : `costs ${fmt(Math.abs(totalSavingsWithSolar))} more`}`}>
                    {fmt(evSolarTotalCost)}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalSavingsWithSolar >= 0
                    ? `saves ${fmt(totalSavingsWithSolar)} vs gas`
                    : `costs ${fmt(Math.abs(totalSavingsWithSolar))} more`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-xs text-muted-foreground mb-1">EV + Solar Break-Even</p>
                <p className="text-xl font-bold">
                  <ValueWithTip tip={`Formula: combined price diff ÷ annual savings with solar\n= ((${fmt(inputs.evPurchasePrice)} − ${fmt(inputs.evResaleValue)}) + ${fmt(inputs.solarSystemCost)} − (${fmt(inputs.gasPurchasePrice)} − ${fmt(inputs.gasResaleValue)})) ÷ annual savings\n= ${fmt((inputs.evPurchasePrice - inputs.evResaleValue + inputs.solarSystemCost) - (inputs.gasPurchasePrice - inputs.gasResaleValue))} ÷ ${fmt(gasAnnualTotal - (evAnnualCharging + inputs.evMaintenanceAnnual + inputs.evInsuranceAnnual + evRecurringAnnualized))}/yr\n= ${breakEvenYearsWithSolar === null ? "Never" : breakEvenYearsWithSolar === 0 ? "Immediate" : `${breakEvenYearsWithSolar.toFixed(1)} years`}`}>
                    {breakEvenYearsWithSolar === null
                      ? "Never"
                      : breakEvenYearsWithSolar === 0
                      ? "Immediate"
                      : `${breakEvenYearsWithSolar.toFixed(1)} yrs`}
                  </ValueWithTip>
                </p>
                <p className="text-xs text-muted-foreground">combined payback vs gas</p>
              </div>
            </div>

            {/* Advanced solar details */}
              <div className="mt-4 p-4 rounded-lg bg-secondary text-sm">
                <h4 className="font-semibold mb-2">Solar Calculation Details</h4>
                <div className="space-y-1.5 text-muted-foreground">
                  <p>Solar generation: {(inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200).toLocaleString()} kWh/year {inputs.annualSolarGeneration === 0 ? `(estimated: ${inputs.solarCapacity} kW × 1,200 kWh/kW)` : "(user-specified)"}</p>
                  <p>Household consumption: {inputs.householdElectricityUsage.toLocaleString()} kWh/year</p>
                  <p>Available surplus: {Math.max(0, (inputs.annualSolarGeneration > 0 ? inputs.annualSolarGeneration : inputs.solarCapacity * 1200) - inputs.householdElectricityUsage).toLocaleString()} kWh/year</p>
                  <p>EV energy needed: {evEnergyNeeded.toFixed(0)} kWh/year</p>
                  <p>Usable for EV{!inputs.hasNetMetering ? " (50% without net metering)" : ""}: {results.solarCoverageKwh.toFixed(0)} kWh/year</p>
                  <p>Grid electricity for EV: {(evEnergyNeeded - results.solarCoverageKwh).toFixed(0)} kWh/year × {fmtDec(inputs.electricityCost)}/kWh = <span className="font-medium text-foreground">{fmt(gridElectricityCost)}/year</span></p>
                </div>
              </div>

            <p className="text-xs text-muted-foreground mt-3">
              EV needs {evEnergyNeeded.toFixed(0)} kWh/year • Solar covers {results.solarCoverageKwh.toFixed(0)} kWh
              {!inputs.hasNetMetering && " (50% utilization without net metering)"}
            </p>
          </div>
        )}

        {/* Year-by-Year Table */}
        <div data-pdf-section className="card-calculator p-5">
          <h3 className="section-title mb-2">Year-by-Year Projection</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            This table shows the <strong>cumulative total cost of ownership</strong> at the end of each year — purchase price plus all operating expenses (fuel/charging, maintenance, insurance, and recurring costs) accumulated over time. The <em>Cumulative Savings</em> column reveals at which point the EV becomes cheaper overall, helping you identify the break-even year.
            {hasSolar && " The EV + Solar column includes the solar system investment and the reduced charging costs from self-generated electricity."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">
                    <ValueWithTip tip="The year of ownership, starting from purchase. The row marked 'END' is your chosen ownership period.">Year</ValueWithTip>
                  </th>
                  <th className="text-right py-2 px-4 font-semibold text-gas">
                    <ValueWithTip tip="Total amount spent on the gasoline car from day one through this year: purchase price + fuel + maintenance + insurance + any recurring costs.">Gas Total</ValueWithTip>
                  </th>
                  <th className="text-right py-2 px-4 font-semibold text-ev">
                    <ValueWithTip tip="Total amount spent on the electric car from day one through this year: purchase price + grid charging + maintenance + insurance + any recurring costs (without solar).">EV Total</ValueWithTip>
                  </th>
                  {hasSolar && (
                    <th className="text-right py-2 px-4 font-semibold" style={{ color: SOLAR_COLOR }}>
                      <ValueWithTip tip="Total amount spent on the EV plus solar panels: EV purchase price + solar system cost + reduced charging (using solar-generated electricity) + maintenance + insurance + recurring costs.">EV + Solar</ValueWithTip>
                    </th>
                  )}
                  <th className="text-right py-2 pl-4 font-semibold">
                    <ValueWithTip tip="The difference between Gas Total and EV Total at each year. Positive (green) means the EV is cheaper overall by that amount. Negative (red) means the gas car is still cheaper. When this flips from red to green, you've hit the break-even point.">Cum. Savings</ValueWithTip>
                  </th>
                      <th className="text-right py-2 px-4 font-semibold text-gas">
                        <ValueWithTip tip="The fixed annual operating cost for the gasoline car: fuel + maintenance + insurance + annualized recurring costs. Same each year (no inflation modeled).">Gas Annual</ValueWithTip>
                      </th>
                      <th className="text-right py-2 px-4 font-semibold text-ev">
                        <ValueWithTip tip="The fixed annual operating cost for the EV: charging + maintenance + insurance + annualized recurring costs. Same each year (no inflation modeled).">EV Annual</ValueWithTip>
                      </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {yearlyData.filter((d) => d.year > 0).map((d) => (
                  <tr
                    key={d.year}
                    className={d.year === inputs.ownershipYears ? "bg-secondary/50 font-medium" : ""}
                  >
                    <td className="py-2 pr-4">
                      {d.year}
                      {d.year === inputs.ownershipYears && (
                        <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          END
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-4">{fmt(d.gasCumulative)}</td>
                    <td className="text-right py-2 px-4">{fmt(d.evCumulative)}</td>
                    {hasSolar && <td className="text-right py-2 px-4">{fmt(d.evSolarCumulative)}</td>}
                    <td className={`text-right py-2 pl-4 font-medium ${(hasSolar ? d.savingsWithSolar : d.savings) >= 0 ? "text-savings" : "text-loss"}`}>
                      {fmt(hasSolar ? d.savingsWithSolar : d.savings)}
                    </td>
                        <td className="text-right py-2 px-4 text-muted-foreground">{fmt(gasAnnualTotal)}</td>
                        <td className="text-right py-2 px-4 text-muted-foreground">{fmt(evAnnualTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

export default ResultsDashboard;
