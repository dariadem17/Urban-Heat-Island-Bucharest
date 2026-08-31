import { GaugeCircle, Leaf, Sprout, ThermometerSun } from 'lucide-react';
import type { DataLayer, SectorStatistics } from '../../types';

type Props = { stats: SectorStatistics | null; activeLayer: DataLayer; loading: boolean; error: boolean };
type MetricCard = { label: string; value: number | null; unit: string; detail: string; accent: string; icon: typeof GaugeCircle };

const formatValue = (metric: MetricCard) => metric.value === null ? 'Unavailable' : `${metric.value}${metric.unit}`;

function metricsFor(stats: SectorStatistics | null, layer: DataLayer): MetricCard[] {
  const common = {
    avgLst: { label: 'Average LST', value: stats?.avgLst ?? null, unit: '°C', detail: 'Mean land surface temperature', accent: 'bg-amber-500/10 text-amber-200 border-amber-500/20', icon: ThermometerSun },
    minLst: { label: 'Minimum LST', value: stats?.minLst ?? null, unit: '°C', detail: 'Lowest available surface value', accent: 'bg-sky-500/10 text-sky-200 border-sky-500/20', icon: GaugeCircle },
    maxLst: { label: 'Maximum LST', value: stats?.maxLst ?? null, unit: '°C', detail: 'Highest available surface value', accent: 'bg-rose-500/10 text-rose-200 border-rose-500/20', icon: ThermometerSun },
    avgNdvi: { label: 'Average NDVI', value: stats?.avgNdvi ?? null, unit: '', detail: 'Mean vegetation index', accent: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20', icon: Leaf },
    minNdvi: { label: 'Minimum NDVI', value: stats?.minNdvi ?? null, unit: '', detail: 'Lowest available vegetation index', accent: 'bg-lime-500/10 text-lime-200 border-lime-500/20', icon: Leaf },
    maxNdvi: { label: 'Maximum NDVI', value: stats?.maxNdvi ?? null, unit: '', detail: 'Highest available vegetation index', accent: 'bg-green-500/10 text-green-200 border-green-500/20', icon: Sprout },
    hotspot: { label: 'Hotspot area', value: stats?.hotspotAreaPct ?? null, unit: '%', detail: stats?.hotspotDefinition ?? 'Threshold definition pending', accent: 'bg-violet-500/10 text-violet-200 border-violet-500/20', icon: ThermometerSun },
    vegetated: { label: 'Vegetated area', value: stats?.vegetatedAreaPct ?? null, unit: '%', detail: 'Available vegetation-area metric', accent: 'bg-teal-500/10 text-teal-200 border-teal-500/20', icon: Sprout },
  } satisfies Record<string, MetricCard>;
  return layer === 'lst'
    ? [common.avgLst, common.minLst, common.maxLst, common.hotspot, common.avgNdvi]
    : [common.avgNdvi, common.minNdvi, common.maxNdvi, common.vegetated, common.avgLst];
}

export function AnalyticsPanel({ stats, activeLayer, loading, error }: Props) {
  const metrics = metricsFor(stats, activeLayer);
  return (
    <section className="space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</p><h2 className="mt-1 text-lg font-semibold text-slate-50">Contextual indicators</h2></div>
        <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-[10px] text-slate-400">{activeLayer === 'lst' ? 'Surface temperature in focus' : 'Vegetation signal in focus'}</span>
      </div>
      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">Statistics could not be loaded for this selection.</div> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} title={metric.detail} className={`min-h-32 rounded-2xl border p-3.5 shadow-sm shadow-slate-950/20 ${metric.accent}`}>
              <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">{metric.label}</p><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-current/20 bg-slate-950/20"><Icon className="h-4 w-4" /></div></div>
              {loading ? <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-700/60" /> : <div className={`font-semibold tracking-tight text-white ${metric.value === null ? 'text-sm' : 'text-2xl'}`}>{formatValue(metric)}</div>}
              <p className="mt-2 text-[11px] text-slate-300">{metric.detail}</p>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
