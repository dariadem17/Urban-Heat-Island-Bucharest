import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { DataLayer, LandCoverEntry, SectorStatistics } from '../../types';

type Props = { stats: SectorStatistics | null; landCover: LandCoverEntry[]; activeLayer: DataLayer; loading: boolean; error: boolean };

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-800 px-5 text-center text-xs leading-5 text-slate-500">{message}</div>;
}

export function ChartPanel({ stats, landCover, activeLayer, loading, error }: Props) {
  const distribution = activeLayer === 'lst' ? stats?.lstDistribution ?? [] : stats?.ndviDistribution ?? [];
  const distributionTitle = activeLayer === 'lst' ? 'LST distribution' : 'NDVI distribution';
  const distributionColor = activeLayer === 'lst' ? '#f59e0b' : '#22c55e';
  const spectralBreakdown = landCover.length === 0 && Boolean(stats?.ndviSurfaceBreakdown?.length);
  const breakdownEntries = spectralBreakdown ? stats?.ndviSurfaceBreakdown ?? [] : landCover;

  return (
    <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-3.5" aria-busy={loading}>
      <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Analytics</p><h2 className="mt-1 text-lg font-semibold text-slate-50">Dataset patterns</h2></div>
      {loading ? <div className="grid gap-3 xl:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-slate-800/60" /><div className="h-64 animate-pulse rounded-2xl bg-slate-800/60" /></div> : error ? <EmptyChart message="Analytical data could not be loaded for this selection." /> : (
        <>
          <div className="grid gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3" role="img" aria-label={`${distributionTitle} chart`}>
              <h3 className="mb-2 text-sm font-medium text-slate-200">{distributionTitle}</h3>
              {distribution.length === 0 ? <EmptyChart message={`${distributionTitle} data is unavailable.`} /> : <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} barCategoryGap={10}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="label" stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Bar dataKey="value" name="Share" unit="%" radius={[6, 6, 0, 0]} fill={distributionColor} /></BarChart></ResponsiveContainer></div>}
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3" role="img" aria-label="NDVI and land surface temperature relationship chart">
              <h3 className="mb-1 text-sm font-medium text-slate-200">NDVI vs LST relationship</h3><p className="mb-2 text-[10px] text-slate-500">{stats?.lstNdviRelationship?.available ? `${stats.ndviVsLst.length} paired-pixel samples shown · Spearman ρ ${stats.lstNdviRelationship.spearmanRho?.toFixed(3)} across ${stats.lstNdviRelationship.sampleCount?.toLocaleString()} valid pairs. Association, not causation.` : 'Paired raster data is required; no causal conclusion is implied.'}</p>
              {!stats?.ndviVsLst.length ? <EmptyChart message="Relationship data is unavailable." /> : <div className="h-52"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis type="number" dataKey="ndvi" name="NDVI" stroke="#cbd5e1" domain={[-1, 1]} tickLine={false} axisLine={false} fontSize={10} /><YAxis type="number" dataKey="lst" name="LST" unit="°C" stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><Tooltip cursor={{ strokeDasharray: '4 4' }} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Scatter data={stats.ndviVsLst} fill="#34d399" /></ScatterChart></ResponsiveContainer></div>}
            </article>
          </div>
          <article className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3" role="img" aria-label={spectralBreakdown ? 'NDVI surface-signal breakdown chart' : 'Land-cover distribution chart'}>
            <div className="mb-3"><h3 className="text-sm font-medium text-slate-200">{spectralBreakdown ? 'NDVI surface-signal breakdown' : 'Land-cover distribution'}</h3><p className="mt-1 text-[10px] text-slate-500">{spectralBreakdown ? 'Calculated from valid NDVI pixels for this area and year. Spectral intervals are not buildings, water or land-use classes.' : 'Categorized surface types supplied as contextual data.'}</p></div>
            {breakdownEntries.length === 0 ? <EmptyChart message="Land-cover and NDVI breakdown data are unavailable for this dataset." /> : <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={breakdownEntries} dataKey="percentage" nameKey="label" innerRadius={42} outerRadius={70} paddingAngle={3}>{breakdownEntries.map((entry) => <Cell key={entry.categoryId ?? entry.label} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, 'Share']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Legend /></PieChart></ResponsiveContainer></div><div className="space-y-2">{breakdownEntries.map((entry) => <div key={entry.categoryId ?? entry.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="truncate text-xs text-slate-200">{entry.label}</span></div><span className="text-xs font-medium text-slate-50">{entry.percentage}%</span></div>)}</div></div>}
          </article>
        </>
      )}
    </section>
  );
}
