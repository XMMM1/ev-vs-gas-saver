import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { CalcInputs, defaultInputs, calculateResults } from "@/lib/calculator";
import { generatePdf } from "@/lib/generatePdf";
import { supabase } from "@/integrations/supabase/client";
import CalculatorForm from "@/components/calculator/CalculatorForm";
import ResultsDashboard from "@/components/calculator/ResultsDashboard";
import { Zap, Fuel, Download, Loader2, RefreshCw, Calculator } from "lucide-react";
import ProposalFab from "@/components/ProposalFab";
import heroBg from "@/assets/hero-bg.jpg";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const CompactParam = ({
  label, value, unit, min, max, step, onChange, variant,
}: {
  label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void; variant?: "default" | "ev" | "gas" | "solar";
}) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap w-14 shrink-0">{label}</span>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min} max={max} step={step}
      variant={variant}
      className="flex-1 min-w-0"
    />
    <span className="text-xs font-semibold tabular-nums w-16 text-right shrink-0">
      {step < 1 ? value.toFixed(step < 0.1 ? 2 : 1) : value.toLocaleString()} <span className="text-[9px] text-muted-foreground font-medium">{unit}</span>
    </span>
  </div>
);

const Index = () => {
  const [inputs, setInputs] = useState<CalcInputs>(defaultInputs);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [calculatedInputs, setCalculatedInputs] = useState<CalcInputs | null>(null);
  const savedRowId = useRef<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => calculatedInputs ? calculateResults(calculatedInputs) : null, [calculatedInputs]);
  const inputsDirty = calculatedInputs !== null && JSON.stringify(inputs) !== JSON.stringify(calculatedInputs);

  // Persist: insert on first change, then update same record. Track last-saved inputs.
  const lastSavedInputs = useRef<string | null>(null);

  const saveState = useCallback(async (currentInputs: CalcInputs, currentResults: ReturnType<typeof calculateResults>) => {
    try {
      const inputsJson = JSON.stringify(currentInputs);
      if (savedRowId.current) {
        const { error } = await supabase
          .from("calculator_submissions")
          .update({ inputs: currentInputs as any, results: currentResults as any })
          .eq("id", savedRowId.current);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("calculator_submissions")
          .insert({ inputs: currentInputs as any, results: currentResults as any })
          .select("id")
          .single();
        if (error) throw error;
        if (data) savedRowId.current = data.id;
      }
      lastSavedInputs.current = inputsJson;
    } catch (e: any) {
      console.error("Save failed:", e.message);
    }
  }, []);

  const handleCalculate = useCallback(() => {
    setCalculatedInputs({ ...inputs });
    const res = calculateResults(inputs);
    saveState(inputs, res);
    toast.success("Results calculated!");
  }, [inputs, saveState]);

  const handleDownloadPdf = async () => {
    if (!results || !calculatedInputs) return;
    setPdfLoading(true);
    try {
      const currentJson = JSON.stringify(inputs);
      if (lastSavedInputs.current && currentJson !== lastSavedInputs.current) {
        try {
          const { data, error } = await supabase
            .from("calculator_submissions")
            .insert({ inputs: inputs as any, results: results as any, email })
            .select("id")
            .single();
          if (!error && data) {
            savedRowId.current = data.id;
            lastSavedInputs.current = currentJson;
          }
        } catch (e: any) {
          console.error("Failed to save new config:", e.message);
        }
      }
      // Save email linked to the submission
      if (savedRowId.current && email) {
        try {
          await supabase
            .from("pdf_downloads")
            .insert({ submission_id: savedRowId.current, email });
        } catch (e: any) {
          console.error("Failed to save email:", e.message);
        }
      }
      if (!dashboardRef.current) {
        toast.error("Dashboard not ready");
        return;
      }
      await generatePdf(dashboardRef.current, email);
      setPdfDialogOpen(false);
      toast.success("PDF downloaded!");
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Top Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showStickyBar && calculatedInputs
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-card/95 backdrop-blur-md border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="w-4 h-4 text-ev" />
                <span>EV vs Gas Calculator</span>
              </div>
               <div className="flex items-center gap-2.5">
                {inputsDirty && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 h-7 text-xs"
                    onClick={handleCalculate}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Recalculate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setPdfDialogOpen(true)}
                  disabled={!results}
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
              <CompactParam label="Ownership" value={inputs.ownershipYears} unit="yr" min={1} max={20} step={1} onChange={(v) => setInputs({ ...inputs, ownershipYears: v })} />
              <CompactParam label="Distance" value={inputs.annualKm} unit="km/yr" min={1000} max={80000} step={100} onChange={(v) => setInputs({ ...inputs, annualKm: v })} />
              <CompactParam label="Electricity" value={inputs.electricityCost} unit="€/kWh" min={0.05} max={0.80} step={0.01} onChange={(v) => setInputs({ ...inputs, electricityCost: v })} variant="ev" />
              <CompactParam label="Fuel" value={inputs.fuelPrice} unit="€/L" min={0.50} max={3.50} step={0.01} onChange={(v) => setInputs({ ...inputs, fuelPrice: v })} variant="gas" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="relative text-primary-foreground py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">vs</span>
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            EV vs Gasoline Cost Calculator
          </h1>
          <p className="text-primary-foreground/80 max-w-xl mx-auto text-sm sm:text-base">
            Compare the total cost of ownership between electric and gasoline vehicles.
            Includes fuel, maintenance, insurance, and solar panel savings.
          </p>
        </div>
      </header>

      {/* Calculator */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <section>
          <h2 className="text-xl font-bold mb-4">Configure Your Comparison</h2>
          <CalculatorForm
            inputs={inputs}
            onChange={setInputs}
            onReset={() => setInputs(defaultInputs)}
          />
          <div className="flex justify-center mt-6">
            <Button
              size="lg"
              className="gap-2 text-base px-8"
              onClick={handleCalculate}
            >
              <Calculator className="w-5 h-5" />
              {calculatedInputs ? (inputsDirty ? "Recalculate" : "Calculated ✓") : "Calculate"}
            </Button>
          </div>
        </section>

        {results && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Results</h2>
              <div className="flex items-center gap-2.5">
                {inputsDirty && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleCalculate}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recalculate
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setPdfDialogOpen(true)}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
              </div>
            </div>
            <ResultsDashboard ref={dashboardRef} results={results} inputs={calculatedInputs!} />
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>Calculations are estimates. Actual costs may vary based on driving habits, vehicle model, and local conditions.</p>
      </footer>

      <ProposalFab />

      {/* PDF Download Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download PDF Report</DialogTitle>
            <DialogDescription>
              Enter your email to receive and download a detailed cost breakdown report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="pdf-email">Email address</Label>
            <Input
              id="pdf-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidEmail) handleDownloadPdf();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleDownloadPdf}
              disabled={!isValidEmail || pdfLoading}
              className="gap-1.5 w-full sm:w-auto"
            >
              {pdfLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4" /> Download PDF</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
