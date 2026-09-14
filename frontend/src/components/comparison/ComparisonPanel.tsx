import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, CalendarRange, Layers3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapPanel } from '../map/MapPanel';
import { dataService } from '../../services/dataService';
import type { ComparisonMetric, ComparisonRequest, DataLayer, DataMode, LandCoverEntry, RegionSector, SectorBoundaryCollection, SectorId, Year } from '../../types';

type Props = {
  sectors: RegionSector[];
  years: Year[];
  currentSector: SectorId;
  currentYear: Year;
  selectedLayer: DataLayer;
  opacity: number;
  boundaries: SectorBoundaryCollection | null;
  boundariesLoading: boolean;
  dataMode: DataMode;
};

const layerNames: Record<DataLayer, string> = { lst: 'LST', ndvi: 'NDVI' };

export function ComparisonPanel({ sectors, years, currentSector, currentYear, selectedLayer, opacity, boundaries, boundariesLoading, dataMode }: Props) {
  const sectorOptions = sectors.filter((sector) => sector.id !== 'all');
  const initialSector = currentSector === 'all' ? '1' : currentSector;
  const [type, setType] = useState<ComparisonRequest['type']>('sector');
  const [primarySector, setPrimarySector] = useState<SectorId>(initialSector);
  const [secondarySector, setSecondarySector] = useState<SectorId>(initialSector === '6' ? '1' : '6');
  const [sectorYear, setSectorYear] = useState<Year>(currentYear);
  const [primaryYear, setPrimaryYear] = useState<Year>(years[0] ?? 2020);
  const [secondaryYear, setSecondaryYear] = useState<Year>(currentYear === (years[0] ?? 2020) ? years[years.length - 1] ?? 2025 : currentYear);
  const valid = type === 'sector' ? primarySector !== secondarySector : primaryYear !== secondaryYear;

  const request: ComparisonRequest = type === 'sector'
    ? { type, layer: selectedLayer, primarySector, secondarySector, primaryYear: sectorYear, season: 'summer' }
    : { type, layer: selectedLayer, primarySector, primaryYear, secondaryYear, season: 'summer' };
  const comparisonQuery = useQuery({
    queryKey: [dataMode, 'comparison', request],
    queryFn: () => dataService.getComparison(request),
    enabled: valid,
    retry: false,
  });
  const result = comparisonQuery.data;

  const distributionData = useMemo(() => {
    if (!result) return [];
    const primary = selectedLayer === 'lst' ? result.primary.statistics.lstDistribution : result.primary.statistics.ndviDistribution;
    const secondary = selectedLayer === 'lst' ? result.secondary.statistics.lstDistribution : result.secondary.statistics.ndviDistribution;
    return primary.map((entry) => ({ label: entry.label, primary: entry.value, secondary: secondary.find((item) => item.label === entry.label)?.value ?? 0 }));
  }, [selectedLayer, result]);

  const landCoverData = useMemo(() => result ? mergeLandCover(result.primary.landCover, result.secondary.landCover) : [], [result]);

  return (
    <section className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Compare</p><h2 className="mt-1 text-lg font-semibold text-slate-50">Dataset comparison</h2></div><span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300">Summer scenes · {dataMode === 'demo' ? 'Preview data' : 'API data'}</span></div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeButton active={type === 'sector'} icon={Layers3} title="Compare sectors" detail="Different sectors during the same year" onClick={() => setType('sector')} />
          <ModeButton active={type === 'year'} icon={CalendarRange} title="Compare years" detail="The same sector across two years" onClick={() => setType('year')} />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          {type === 'sector' ? <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr_1fr]"><SelectSector label="Sector A" value={primarySector} sectors={sectorOptions} disabledValue={secondarySector} onChange={setPrimarySector} /><ArrowRightLeft className="mx-auto mb-2 h-4 w-4 text-slate-500" /><SelectSector label="Sector B" value={secondarySector} sectors={sectorOptions} disabledValue={primarySector} onChange={setSecondarySector} /><SelectYear label="Year" value={sectorYear} years={years} onChange={setSectorYear} /></div> : <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto_1fr]"><SelectSector label="Sector" value={primarySector} sectors={sectorOptions} onChange={setPrimarySector} /><SelectYear label="Year A" value={primaryYear} years={years} disabledValue={secondaryYear} onChange={setPrimaryYear} /><ArrowRightLeft className="mx-auto mb-2 h-4 w-4 text-slate-500" /><SelectYear label="Year B" value={secondaryYear} years={years} disabledValue={primaryYear} onChange={setSecondaryYear} /></div>}
          {!valid ? <p className="mt-3 text-xs text-amber-300">Choose two different {type === 'sector' ? 'sectors' : 'years'} to compare.</p> : <p className="mt-3 text-[11px] text-slate-500">{layerNames[selectedLayer]} · Summer · Equivalent legend metadata on both maps</p>}
        </div>
      </div>

      {comparisonQuery.isLoading ? <ComparisonSkeleton /> : comparisonQuery.isError ? <StateCard title="Comparison unavailable" detail="The selected datasets could not be compared. Check availability or try again when the data service is online." /> : result ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {[result.primary, result.secondary].map((dataset, index) => <MapPanel key={`${selectedLayer}-${dataset.sectorId}-${dataset.year}`} eyebrow={`Dataset ${index === 0 ? 'A' : 'B'}`} selectedSector={dataset.sectorId} selectedLayer={selectedLayer} selectedYear={dataset.year} opacity={opacity} onSectorSelect={() => undefined} layerDescriptor={{ ...dataset.mapLayer, legend: result.sharedLegend }} sectors={sectors} boundaries={boundaries} boundariesLoading={boundariesLoading} layerLoading={false} layerError={false} dataMode={dataMode} />)}
          </div>

          <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Comparison metrics</p><h3 className="mt-1 text-base font-semibold text-slate-100">{result.title}</h3></div><p className="text-xs text-slate-500">Delta = second dataset minus first dataset</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{result.metrics.map((item) => <MetricCard key={item.id} metric={item} />)}</div></section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ComparisonChart title={`${layerNames[selectedLayer]} distribution comparison`} data={distributionData} primaryLabel={result.primary.label} secondaryLabel={result.secondary.label} />
            {landCoverData.length ? <ComparisonChart title="Land-cover distribution comparison" data={landCoverData} primaryLabel={result.primary.label} secondaryLabel={result.secondary.label} /> : <StateCard title="Land-cover comparison unavailable" detail="One or both selected datasets do not include land-cover context." />}
          </section>

          <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Comparison report</p><h3 className="mt-1 text-base font-semibold text-slate-100">Deterministic dataset summary</h3><div className="mt-3 grid gap-3 lg:grid-cols-3">{result.report.map((section) => <article key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3"><h4 className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{section.title}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{section.body}</p></article>)}</div><p className="mt-3 text-[10px] text-slate-500">Data note · {result.context} {result.isDemo ? 'Values are deterministic preview data.' : ''}</p></section>
        </>
      ) : <StateCard title="Choose a valid comparison" detail="Comparison results will appear after two different datasets are selected." />}
    </section>
  );
}

function ModeButton({ active, icon: Icon, title, detail, onClick }: { active: boolean; icon: typeof Layers3; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'}`}><Icon className={`h-5 w-5 ${active ? 'text-emerald-300' : 'text-slate-500'}`} /><span className="mt-3 block text-sm font-medium text-slate-100">{title}</span><span className="mt-1 block text-xs text-slate-400">{detail}</span></button>;
}

function SelectSector({ label, value, sectors, disabledValue, onChange }: { label: string; value: SectorId; sectors: RegionSector[]; disabledValue?: SectorId; onChange: (value: SectorId) => void }) {
  return <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">{label}<select value={value} onChange={(event) => onChange(event.target.value as SectorId)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm normal-case tracking-normal text-slate-100 outline-none">{sectors.map((sector) => <option key={sector.id} value={sector.id} disabled={sector.id === disabledValue}>{sector.label}</option>)}</select></label>;
}

function SelectYear({ label, value, years, disabledValue, onChange }: { label: string; value: Year; years: Year[]; disabledValue?: Year; onChange: (value: Year) => void }) {
  return <label className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value) as Year)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm normal-case tracking-normal text-slate-100 outline-none">{years.map((year) => <option key={year} value={year} disabled={year === disabledValue}>{year}</option>)}</select></label>;
}

function MetricCard({ metric }: { metric: ComparisonMetric }) {
  const valueUnit = metric.unit === 'percentage points' ? '%' : metric.unit;
  return <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{metric.label}</p><div className="mt-3 flex items-end justify-between gap-2"><span className="text-xl font-semibold text-slate-50">{metric.primary}<small className="ml-1 text-[10px] font-normal text-slate-500">{valueUnit}</small></span><span className="pb-1 text-xs text-slate-600">vs</span><span className="text-xl font-semibold text-slate-50">{metric.secondary}<small className="ml-1 text-[10px] font-normal text-slate-500">{valueUnit}</small></span></div><p className="mt-3 text-[11px] text-slate-400">Difference: <span className="font-medium text-slate-200">{metric.delta > 0 ? '+' : ''}{metric.delta} {metric.unit}</span></p></article>;
}

type ComparisonChartRow = { label: string; primary: number; secondary: number };
function ComparisonChart({ title, data, primaryLabel, secondaryLabel }: { title: string; data: ComparisonChartRow[]; primaryLabel: string; secondaryLabel: string }) {
  return <article className="min-w-0 rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4" role="img" aria-label={title}><h3 className="text-sm font-medium text-slate-100">{title}</h3><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Legend /><Bar dataKey="primary" name={primaryLabel} fill="#34d399" radius={[4, 4, 0, 0]} /><Bar dataKey="secondary" name={secondaryLabel} fill="#60a5fa" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article>;
}

function mergeLandCover(primary: LandCoverEntry[], secondary: LandCoverEntry[]): ComparisonChartRow[] {
  return primary.map((entry) => ({ label: entry.label, primary: entry.percentage, secondary: secondary.find((item) => (item.categoryId ?? item.label) === (entry.categoryId ?? entry.label))?.percentage ?? 0 }));
}

function ComparisonSkeleton() { return <div className="grid gap-4 xl:grid-cols-2"><div className="h-[520px] animate-pulse rounded-[1.5rem] bg-slate-800/60" /><div className="h-[520px] animate-pulse rounded-[1.5rem] bg-slate-800/60" /></div>; }
function StateCard({ title, detail }: { title: string; detail: string }) { return <div className="rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><h3 className="text-sm font-medium text-slate-200">{title}</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">{detail}</p></div>; }
