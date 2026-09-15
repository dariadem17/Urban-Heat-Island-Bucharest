import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, CalendarRange, Layers3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapPanel } from '../map/MapPanel';
import { dataService } from '../../services/dataService';
import type { ComparisonMetric, ComparisonRequest, ComparisonResult, DataLayer, DataMode, LandCoverEntry, RegionSector, SectorBoundaryCollection, SectorId, Year } from '../../types';

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
  const latestYear = years.at(-1) ?? 2025;
  const [type, setType] = useState<ComparisonRequest['type']>(currentYear < latestYear ? 'year' : 'sector');
  const [primarySector, setPrimarySector] = useState<SectorId>(initialSector);
  const [secondarySector, setSecondarySector] = useState<SectorId>(initialSector === '6' ? '1' : '6');
  const [sectorYear, setSectorYear] = useState<Year>(currentYear);
  const [primaryYear, setPrimaryYear] = useState<Year>(currentYear < latestYear ? currentYear : years.at(-2) ?? 2023);
  const [secondaryYear, setSecondaryYear] = useState<Year>(latestYear);
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

  const landCoverData = useMemo(() => result && result.primary.landCover.length && result.secondary.landCover.length ? mergeLandCover(result.primary.landCover, result.secondary.landCover) : [], [result]);
  const distributionReading = result && distributionData.length ? describeDistribution(selectedLayer, distributionData) : '';
  const landCoverReading = result && landCoverData.length ? describeLandCover(result.primary.landCover, result.secondary.landCover) : '';

  return (
    <section className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Comparatie</p><h2 className="mt-1 text-lg font-semibold text-slate-50">Compara datele</h2></div><span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300">Date de vara · {dataMode === 'demo' ? 'Date demonstrative' : 'Date din API'}</span></div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ModeButton active={type === 'sector'} icon={Layers3} title="Compara sectoare" detail="Doua sectoare in acelasi an" onClick={() => setType('sector')} />
          <ModeButton active={type === 'year'} icon={CalendarRange} title="Compara ani" detail="Acelasi sector in doi ani" onClick={() => setType('year')} />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          {type === 'sector' ? <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr_1fr]"><SelectSector label="Sector A" value={primarySector} sectors={sectorOptions} disabledValue={secondarySector} onChange={setPrimarySector} /><ArrowRightLeft className="mx-auto mb-2 h-4 w-4 text-slate-500" /><SelectSector label="Sector B" value={secondarySector} sectors={sectorOptions} disabledValue={primarySector} onChange={setSecondarySector} /><SelectYear label="An" value={sectorYear} years={years} onChange={setSectorYear} /></div> : <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto_1fr]"><SelectSector label="Sector" value={primarySector} sectors={sectorOptions} onChange={setPrimarySector} /><SelectYear label="Anul A" value={primaryYear} years={years} disabledValue={secondaryYear} onChange={setPrimaryYear} /><ArrowRightLeft className="mx-auto mb-2 h-4 w-4 text-slate-500" /><SelectYear label="Anul B" value={secondaryYear} years={years} disabledValue={primaryYear} onChange={setSecondaryYear} /></div>}
          {!valid ? <p className="mt-3 text-xs text-amber-300">Alege {type === 'sector' ? 'doua sectoare' : 'doi ani'} diferite pentru comparatie.</p> : <p className="mt-3 text-[11px] text-slate-500">{layerNames[selectedLayer]} · Vara · Aceeasi scara pe ambele harti</p>}
        </div>
      </div>

      {comparisonQuery.isLoading ? <ComparisonSkeleton /> : comparisonQuery.isError ? <StateCard title="Comparatia nu este disponibila" detail="Datele selectate nu au putut fi comparate. Verifica daca sunt disponibile si daca API-ul functioneaza." /> : result ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {[result.primary, result.secondary].map((dataset, index) => <MapPanel key={`${selectedLayer}-${dataset.sectorId}-${dataset.year}`} eyebrow={`Selectia ${index === 0 ? 'A' : 'B'}`} selectedSector={dataset.sectorId} selectedLayer={selectedLayer} selectedYear={dataset.year} opacity={opacity} onSectorSelect={() => undefined} layerDescriptor={{ ...dataset.mapLayer, legend: result.sharedLegend }} sectors={sectors} boundaries={boundaries} boundariesLoading={boundariesLoading} layerLoading={false} layerError={false} dataMode={dataMode} />)}
          </div>

          <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Indicatori comparati</p><h3 className="mt-1 text-base font-semibold text-slate-100">{result.title}</h3></div><p className="text-xs text-slate-500">Diferenta = selectia B minus selectia A</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{result.metrics.map((item) => <MetricCard key={item.id} metric={item} />)}</div></section>

          {result.type === 'year' && result.timeline?.length ? <TemporalTrendPanel timeline={result.timeline} /> : null}

          <section className="grid gap-4 xl:grid-cols-2">
            <ComparisonChart title={`Distributia ${layerNames[selectedLayer]}`} description={selectedLayer === 'ndvi' ? 'Verde = selectia A, albastru = B. Fiecare grupa arata procentul zonei cu NDVI in acel interval; spre dreapta inseamna un semnal de vegetatie mai puternic.' : 'Verde = selectia A, albastru = B. Fiecare grupa arata procentul zonei intr-un interval de temperatura; spre dreapta inseamna suprafete mai calde.'} reading={distributionReading} data={distributionData} primaryLabel={result.primary.label} secondaryLabel={result.secondary.label} />
            {landCoverData.length ? <ComparisonChart title="Land Cover" description="Procente din fiecare sector. Suprafetele construite includ si drumuri; arborii sunt o clasa separata." reading={landCoverReading} landCover data={landCoverData} primaryLabel={result.primary.label} secondaryLabel={result.secondary.label} /> : <StateCard title="Comparatia Land Cover nu este disponibila" detail="Lipsesc datele pentru cel putin una dintre selectii." />}
          </section>

          <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4"><h3 className="text-base font-semibold text-slate-100">Interpretare</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{result.report.map((section) => <article key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><h4 className="text-xs font-semibold text-slate-100">{section.title}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{section.body}</p></article>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">{result.context} {result.isDemo ? 'Acestea sunt valori demonstrative.' : ''}</p></section>
        </>
      ) : <StateCard title="Alege o comparatie valida" detail="Rezultatele apar dupa selectarea a doua seturi de date diferite." />}
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
  return <article className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{metric.label}</p><div className="mt-3 flex items-end justify-between gap-2"><span className="text-xl font-semibold text-slate-50">{metric.primary}<small className="ml-1 text-[10px] font-normal text-slate-500">{valueUnit}</small></span><span className="pb-1 text-xs text-slate-600">fata de</span><span className="text-xl font-semibold text-slate-50">{metric.secondary}<small className="ml-1 text-[10px] font-normal text-slate-500">{valueUnit}</small></span></div><p className="mt-3 text-[11px] text-slate-400">Diferenta: <span className="font-medium text-slate-200">{metric.delta > 0 ? '+' : ''}{metric.delta} {metric.unit === 'percentage points' ? 'puncte procentuale' : metric.unit}</span></p></article>;
}

function TemporalTrendPanel({ timeline }: { timeline: NonNullable<ComparisonResult['timeline']> }) {
  const lstValues = timeline.map((entry) => entry.lstVsCity).filter((value): value is number => value !== null);
  const ndviValues = timeline.map((entry) => entry.ndviVsCity).filter((value): value is number => value !== null);
  const lstDomain: [number, number] = [Math.min(0, ...lstValues) - 0.1, Math.max(0, ...lstValues) + 0.1];
  const ndviDomain: [number, number] = [Math.min(0, ...ndviValues) - 0.005, Math.max(0, ...ndviValues) + 0.005];
  return <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4">
    <h3 className="text-base font-semibold text-slate-100">Evolutia fata de media orasului</h3>
    <p className="mt-1 text-xs leading-5 text-slate-400">Fiecare punct este un an observat. Linia 0 reprezinta media Bucurestiului din acelasi an; graficul arata un semnal repetat sau variabil, nu o prognoza.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs font-medium text-amber-200">LST fata de oras (°C)</p><p className="mt-1 text-[11px] text-slate-400">Peste 0: sectorul este mai cald.</p><div className="mt-2 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="year" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} width={34} domain={lstDomain} /><ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} °C`, 'Fata de oras']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Line type="linear" dataKey="lstVsCity" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} /></LineChart></ResponsiveContainer></div></div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs font-medium text-emerald-200">NDVI fata de oras</p><p className="mt-1 text-[11px] text-slate-400">Sub 0: sectorul are NDVI mai mic.</p><div className="mt-2 h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeline} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="year" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} width={44} domain={ndviDomain} /><ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" /><Tooltip formatter={(value) => [Number(value).toFixed(3), 'Fata de oras']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Line type="linear" dataKey="ndviVsCity" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} /></LineChart></ResponsiveContainer></div></div>
    </div>
  </section>;
}

type ComparisonChartRow = { label: string; primary: number; secondary: number };
function describeDistribution(layer: DataLayer, rows: ComparisonChartRow[]) {
  const low = rows[0];
  const high = rows.at(-1);
  if (!low || !high) return '';
  if (layer === 'ndvi') {
    return `In B, ${low.secondary.toFixed(1)}% din zona are NDVI ${low.label}, fata de ${low.primary.toFixed(1)}% in A. La NDVI ${high.label}, B are ${high.secondary.toFixed(1)}%, fata de ${high.primary.toFixed(1)}% in A. Aceste procente descriu semnalul de vegetatie, nu identifica direct cladirile.`;
  }
  return `In intervalul cel mai cald (${high.label}), B are ${high.secondary.toFixed(1)}% din zona fata de ${high.primary.toFixed(1)}% in A. In intervalul cel mai rece (${low.label}), B are ${low.secondary.toFixed(1)}% fata de ${low.primary.toFixed(1)}% in A.`;
}

function describeLandCover(primary: LandCoverEntry[], secondary: LandCoverEntry[]) {
  const share = (items: LandCoverEntry[], id: string) => items.find((entry) => entry.categoryId === id)?.percentage;
  const builtA = share(primary, 'built-up');
  const builtB = share(secondary, 'built-up');
  const treesA = share(primary, 'trees');
  const treesB = share(secondary, 'trees');
  if (builtA === undefined || builtB === undefined) return 'Nu sunt disponibile procente comparabile pentru suprafetele construite.';
  const trees = treesA !== undefined && treesB !== undefined ? ` Arbori: ${treesB.toFixed(1)}% in B fata de ${treesA.toFixed(1)}% in A.` : '';
  return `Suprafete construite: ${builtB.toFixed(1)}% in B fata de ${builtA.toFixed(1)}% in A (${builtB >= builtA ? '+' : ''}${(builtB - builtA).toFixed(1)} puncte procentuale).${trees}`;
}

function LandCoverTick({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? '';
  const lines = label === 'Suprafete construite' ? ['Suprafete', 'construite'] : label === 'Alta acoperire' ? ['Alta', 'acoperire'] : [label];
  return <text x={x} y={y + 10} textAnchor="middle" fill="#cbd5e1" fontSize={10}>{lines.map((line, index) => <tspan key={line} x={x} dy={index === 0 ? 0 : 12}>{line}</tspan>)}</text>;
}

function ComparisonChart({ title, description, reading, landCover = false, data, primaryLabel, secondaryLabel }: { title: string; description: string; reading: string; landCover?: boolean; data: ComparisonChartRow[]; primaryLabel: string; secondaryLabel: string }) {
  return <article className="min-w-0 rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4"><h3 className="text-sm font-medium text-slate-100">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ left: 8, right: 8, bottom: landCover ? 8 : 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="label" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} interval={0} height={landCover ? 48 : 30} tick={landCover ? <LandCoverTick /> : undefined} /><YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Legend /><Bar dataKey="primary" name={primaryLabel} fill="#34d399" radius={[4, 4, 0, 0]} /><Bar dataKey="secondary" name={secondaryLabel} fill="#60a5fa" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><p className="mt-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs leading-5 text-slate-200">{reading}</p></article>;
}

function mergeLandCover(primary: LandCoverEntry[], secondary: LandCoverEntry[]): ComparisonChartRow[] {
  return primary.map((entry) => ({ label: entry.label, primary: entry.percentage, secondary: secondary.find((item) => (item.categoryId ?? item.label) === (entry.categoryId ?? entry.label))?.percentage ?? 0 }));
}

function ComparisonSkeleton() { return <div className="grid gap-4 xl:grid-cols-2"><div className="h-[520px] animate-pulse rounded-[1.5rem] bg-slate-800/60" /><div className="h-[520px] animate-pulse rounded-[1.5rem] bg-slate-800/60" /></div>; }
function StateCard({ title, detail }: { title: string; detail: string }) { return <div className="rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><h3 className="text-sm font-medium text-slate-200">{title}</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">{detail}</p></div>; }
