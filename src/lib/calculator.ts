export interface RecurringCost {
  id: string;
  name: string;
  amount: number;
  everyYears: number; // 1 = annual, 2 = every 2 years, etc.
}

export interface CalcInputs {
  ownershipYears: number;
  annualKm: number;
  electricityCost: number;
  gasPurchasePrice: number;
  fuelPrice: number;
  fuelConsumption: number;
  gasMaintenanceAnnual: number;
  gasInsuranceAnnual: number;
  gasRecurringCosts: RecurringCost[];
  gasResaleValue: number;
  evPurchasePrice: number;
  evConsumption: number;
  evMaintenanceAnnual: number;
  evInsuranceAnnual: number;
  evRecurringCosts: RecurringCost[];
  evResaleValue: number;
  hasSolar: boolean;
  solarCapacity: number;
  annualSolarGeneration: number;
  householdElectricityUsage: number;
  hasNetMetering: boolean;
  solarSystemCost: number;
}

export interface YearlyData {
  year: number;
  gasCumulative: number;
  evCumulative: number;
  evSolarCumulative: number;
  savings: number;
  savingsWithSolar: number;
}

export interface CalcResults {
  gasAnnualFuel: number;
  gasAnnualTotal: number;
  evAnnualCharging: number;
  evAnnualTotal: number;
  annualSavings: number;
  gasTotalCost: number;
  evTotalCost: number;
  totalSavings: number;
  evEnergyNeeded: number;
  solarCoverageKwh: number;
  solarCoveragePercent: number;
  gridElectricityCost: number;
  solarEvSavings: number;
  solarRoiYears: number | null;
  breakEvenYears: number | null;
  breakEvenYearsWithSolar: number | null;
  combinedRoiYears: number | null;
  maxEvPrice: number;
  evSolarAnnualTotal: number;
  evSolarTotalCost: number;
  totalSavingsWithSolar: number;
  gasRecurringAnnualized: number;
  evRecurringAnnualized: number;
  householdElectricitySavings: number;
  yearlyData: YearlyData[];
}

export const defaultInputs: CalcInputs = {
  ownershipYears: 8,
  annualKm: 15000,
  electricityCost: 0.30,
  gasPurchasePrice: 25000,
  fuelPrice: 1.80,
  fuelConsumption: 6,
  gasMaintenanceAnnual: 500,
  gasInsuranceAnnual: 700,
  gasRecurringCosts: [],
  gasResaleValue: 10000,
  evPurchasePrice: 25000,
  evConsumption: 18,
  evMaintenanceAnnual: 300,
  evInsuranceAnnual: 1300,
  evRecurringCosts: [],
  evResaleValue: 15000,
  hasSolar: false,
  solarCapacity: 6,
  annualSolarGeneration: 0,
  householdElectricityUsage: 4000,
  hasNetMetering: false,
  solarSystemCost: 8000,
};

/** Find the fractional year where gasCumulative crosses the given EV cumulative line */
function findCrossingYear(
  data: YearlyData[],
  evKey: 'evCumulative' | 'evSolarCumulative'
): number | null {
  if (data.length > 0 && data[0].gasCumulative >= data[0][evKey]) return 0;
  for (let i = 1; i < data.length; i++) {
    const prevDiff = data[i - 1].gasCumulative - data[i - 1][evKey];
    const currDiff = data[i].gasCumulative - data[i][evKey];
    if (prevDiff < 0 && currDiff >= 0) {
      const fraction = -prevDiff / (currDiff - prevDiff);
      return data[i - 1].year + fraction;
    }
  }
  return null;
}

/** Annualize recurring costs: amount / everyYears */
function annualizeRecurring(costs: RecurringCost[]): number {
  return costs.reduce((sum, c) => sum + (c.everyYears > 0 ? c.amount / c.everyYears : 0), 0);
}

/** Calculate total recurring costs incurred up to and including a given year */
function recurringCostUpToYear(costs: RecurringCost[], year: number): number {
  return costs.reduce((sum, c) => {
    if (c.everyYears <= 0) return sum;
    const times = Math.floor(year / c.everyYears);
    return sum + c.amount * times;
  }, 0);
}

export function calculateResults(inputs: CalcInputs): CalcResults {
  const {
    ownershipYears, annualKm, electricityCost,
     gasPurchasePrice, fuelPrice, fuelConsumption, gasMaintenanceAnnual, gasInsuranceAnnual,
    gasRecurringCosts, gasResaleValue,
    evPurchasePrice, evConsumption, evMaintenanceAnnual, evInsuranceAnnual,
    evRecurringCosts, evResaleValue,
    hasSolar, solarCapacity, annualSolarGeneration, householdElectricityUsage,
    hasNetMetering, solarSystemCost,
  } = inputs;

  const gasRecurringAnnualized = annualizeRecurring(gasRecurringCosts);
  const evRecurringAnnualized = annualizeRecurring(evRecurringCosts);

  // Gas annual costs
  const gasAnnualFuel = (annualKm / 100) * fuelConsumption * fuelPrice;

  // EV energy needs
  const evEnergyNeeded = (annualKm / 100) * evConsumption;

  // Solar calculations
  let solarCoverageKwh = 0;
  const effectiveSolarGen = annualSolarGeneration > 0
    ? annualSolarGeneration
    : solarCapacity * 1200;

  // Household electricity savings from solar (applies to both gas & EV owners)
  let householdElectricitySavings = 0;
  if (hasSolar) {
    const householdCoveredKwh = Math.min(effectiveSolarGen, householdElectricityUsage);
    householdElectricitySavings = householdCoveredKwh * electricityCost;

    const availableSolar = Math.max(0, effectiveSolarGen - householdElectricityUsage);
    if (hasNetMetering) {
      solarCoverageKwh = Math.min(availableSolar, evEnergyNeeded);
    } else {
      solarCoverageKwh = Math.min(availableSolar * 0.5, evEnergyNeeded);
    }
  }

  const gridElectricity = Math.max(0, evEnergyNeeded - solarCoverageKwh);
  const evAnnualCharging = gridElectricity * electricityCost;
  // EV without solar (EV-only scenario, always full grid price)
  const evAnnualChargingNoSolar = evEnergyNeeded * electricityCost;
  const evAnnualTotal = evAnnualChargingNoSolar + evMaintenanceAnnual + evInsuranceAnnual + evRecurringAnnualized;

  // Gas annual total (no solar deductions — solar benefits shown separately)
  const gasAnnualTotal = gasAnnualFuel + gasMaintenanceAnnual + gasInsuranceAnnual + gasRecurringAnnualized;

  const annualSavings = gasAnnualTotal - evAnnualTotal;

  // EV + Solar combined annual cost (includes solar system amortization)
  const solarAnnualAmortization = hasSolar && ownershipYears > 0 ? solarSystemCost / ownershipYears : 0;
  // EV + Solar annual total (solar-reduced charging + solar amortization)
  const evSolarAnnualTotal = hasSolar
    ? evAnnualCharging + evMaintenanceAnnual + evInsuranceAnnual + evRecurringAnnualized + solarAnnualAmortization
    : evAnnualTotal;

  // Total ownership cost (using actual recurring cost occurrences for precision)
  const gasRecurringTotal = recurringCostUpToYear(gasRecurringCosts, ownershipYears);
  const evRecurringTotal = recurringCostUpToYear(evRecurringCosts, ownershipYears);
  const gasAnnualWithoutRecurring = gasAnnualFuel + gasMaintenanceAnnual + gasInsuranceAnnual;
  const evAnnualNoSolarWithoutRecurring = evAnnualChargingNoSolar + evMaintenanceAnnual + evInsuranceAnnual;
  const evAnnualWithSolarWithoutRecurring = evAnnualCharging + evMaintenanceAnnual + evInsuranceAnnual;

  const gasTotalCost = gasPurchasePrice - gasResaleValue + gasAnnualWithoutRecurring * ownershipYears + gasRecurringTotal;
  const evTotalCost = evPurchasePrice - evResaleValue + evAnnualNoSolarWithoutRecurring * ownershipYears + evRecurringTotal;
  const totalSavings = gasTotalCost - evTotalCost;

  // EV + Solar total cost
  const evSolarTotalCost = hasSolar
    ? evPurchasePrice - evResaleValue + solarSystemCost + evAnnualWithSolarWithoutRecurring * ownershipYears + evRecurringTotal
    : evTotalCost;
  const totalSavingsWithSolar = gasTotalCost - evSolarTotalCost;

  // Solar metrics
  const solarCoveragePercent = evEnergyNeeded > 0
    ? (solarCoverageKwh / evEnergyNeeded) * 100
    : 0;
  const gridElectricityCost = evAnnualCharging;
  const solarEvSavings = solarCoverageKwh * electricityCost;

  let solarRoiYears: number | null = null;
  if (hasSolar && solarSystemCost > 0) {
    const totalSolarValue = effectiveSolarGen * electricityCost;
    solarRoiYears = totalSolarValue > 0 ? solarSystemCost / totalSolarValue : null;
  }

  // Combined ROI (EV + Solar investment vs gas)
  let combinedRoiYears: number | null = null;
  if (hasSolar) {
    const combinedInvestment = (evPurchasePrice - evResaleValue + solarSystemCost) - (gasPurchasePrice - gasResaleValue);
    const evSolarAnnualOperating = evAnnualCharging + evMaintenanceAnnual + evInsuranceAnnual + evRecurringAnnualized;
    const annualSavingsWithSolar = gasAnnualTotal - evSolarAnnualOperating;
    if (annualSavingsWithSolar > 0 && combinedInvestment > 0) {
      combinedRoiYears = combinedInvestment / annualSavingsWithSolar;
    } else if (combinedInvestment <= 0) {
      combinedRoiYears = 0;
    }
  }

  // Break-even values will be derived from yearlyData below

  const maxEvPrice = (gasPurchasePrice - gasResaleValue) + annualSavings * ownershipYears + evResaleValue;

  // Year-by-year (extend to max 12 years)
  const maxYears = Math.max(ownershipYears, 12);
  const yearlyData: YearlyData[] = [];
  for (let y = 0; y <= maxYears; y++) {
    const gasRecY = recurringCostUpToYear(gasRecurringCosts, y);
    const evRecY = recurringCostUpToYear(evRecurringCosts, y);
    const gasResaleAtYear = y >= ownershipYears ? gasResaleValue : 0;
    const evResaleAtYear = y >= ownershipYears ? evResaleValue : 0;
    const gasCum = gasPurchasePrice - gasResaleAtYear + gasAnnualWithoutRecurring * y + gasRecY;
    const evCum = evPurchasePrice - evResaleAtYear + evAnnualNoSolarWithoutRecurring * y + evRecY;
    const evSolarCum = hasSolar
      ? evPurchasePrice - evResaleAtYear + solarSystemCost + evAnnualWithSolarWithoutRecurring * y + evRecY
      : evCum;
    yearlyData.push({
      year: y,
      gasCumulative: gasCum,
      evCumulative: evCum,
      evSolarCumulative: evSolarCum,
      savings: gasCum - evCum,
      savingsWithSolar: gasCum - evSolarCum,
    });
  }

  // Break-even derived from chart data so reference line matches visual crossing
  const breakEvenYears = findCrossingYear(yearlyData, 'evCumulative');
  const breakEvenYearsWithSolar = hasSolar
    ? findCrossingYear(yearlyData, 'evSolarCumulative')
    : null;

  return {
    gasAnnualFuel, gasAnnualTotal,
    evAnnualCharging, evAnnualTotal,
    annualSavings,
    gasTotalCost, evTotalCost, totalSavings,
    evEnergyNeeded, solarCoverageKwh, solarCoveragePercent,
    gridElectricityCost, solarEvSavings, solarRoiYears,
    breakEvenYears, breakEvenYearsWithSolar,
    combinedRoiYears, maxEvPrice,
    evSolarAnnualTotal, evSolarTotalCost, totalSavingsWithSolar,
    gasRecurringAnnualized, evRecurringAnnualized,
    householdElectricitySavings,
    yearlyData,
  };
}
