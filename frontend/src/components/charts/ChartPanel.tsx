import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { DataLayer, LandCoverEntry, SectorStatistics } from '../../types';

type Props = { stats: SectorStatistics | null; landCover: LandCoverEntry[]; activeLayer: DataLayer; loading: boolean; error: boolean };

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-800 px-5 text-center text-xs leading-5 text-slate-500">{message}</div>;
}

export function ChartPanel({ stats, landCover, activeLayer, loading, error }: Props) {
  const distribution = activeLayer === 'lst' ? stats?.lstDistribution ?? [] : stats?.ndviDistribution ?? [];
  const distributionTitle = activeLayer === 'lst' ? 'Distributia LST' : 'Distributia NDVI';
  const distributionColor = activeLayer === 'lst' ? '#f59e0b' : '#22c55e';
  const spectralBreakdown = landCover.length === 0 && Boolean(stats?.ndviSurfaceBreakdown?.length);
  const signalLabels = [
    'Posibila apa / umbra · NDVI < 0',
    'Posibile cladiri / sol gol · NDVI 0–0.2',
    'Vegetatie rara / amestec · NDVI 0.2–0.4',
    'Vegetatie probabila · NDVI ≥ 0.4',
  ];
  const breakdownEntries = spectralBreakdown
    ? (stats?.ndviSurfaceBreakdown ?? []).map((entry, index) => ({ ...entry, label: signalLabels[index] ?? entry.label }))
    : landCover;
  const relationship = stats?.lstNdviRelationship;
  const contrast = relationship?.contrast;
  const difference = contrast ? Math.abs(contrast.highMinusLowC) : null;
  const relationshipText = contrast && difference !== null
    ? difference < 0.1
      ? 'Zonele cu NDVI mic si mare au aproape aceeasi temperatura medie a suprafetei.'
      : `Zonele cu NDVI mare au, in medie, o temperatura a suprafetei cu ${difference.toFixed(1)} °C ${contrast.highMinusLowC < 0 ? 'mai mica' : 'mai mare'} decat zonele cu NDVI mic.`
    : relationship?.summary;

  return (
    <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-3.5" aria-busy={loading}>
      <div className="mb-3"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Analiza</p><h2 className="mt-1 text-lg font-semibold text-slate-50">Ce arata datele</h2></div>
      {loading ? <div className="grid gap-3 xl:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-slate-800/60" /><div className="h-64 animate-pulse rounded-2xl bg-slate-800/60" /></div> : error ? <EmptyChart message="Datele pentru grafice nu au putut fi incarcate." /> : (
        <>
          <div className="grid gap-3 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3" role="img" aria-label={`Grafic: ${distributionTitle}`}>
              <h3 className="mb-2 text-sm font-medium text-slate-200">{distributionTitle}</h3>
              <p className="mb-2 text-xs leading-5 text-slate-400">Fiecare bara arata procentul pixelilor dintr-un interval. O bara mai inalta inseamna ca intervalul apare mai des in zona aleasa.</p>
              {distribution.length === 0 ? <EmptyChart message={`Nu exista date pentru ${distributionTitle.toLowerCase()}.`} /> : <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution} barCategoryGap={10}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} /><XAxis dataKey="label" stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Bar dataKey="value" name="Procent" unit="%" radius={[6, 6, 0, 0]} fill={distributionColor} /></BarChart></ResponsiveContainer></div>}
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3" role="img" aria-label="Graficul relatiei dintre NDVI si temperatura suprafetei">
              <h3 className="mb-1 text-sm font-medium text-slate-200">Vegetatie si temperatura suprafetei</h3>
              <p className="mb-2 text-xs leading-5 text-slate-400">Fiecare punct este o locatie. Spre dreapta inseamna NDVI mai mare; in sus inseamna suprafata mai calda. Un grup de puncte care coboara spre dreapta indica o asociere intre NDVI mare si temperatura mai mica.</p>
              {stats?.lstNdviRelationship?.available ? <p className="mb-2 text-[11px] text-slate-500">Sunt afisate {stats.ndviVsLst.length} puncte din {stats.lstNdviRelationship.sampleCount?.toLocaleString()} perechi de pixeli valizi. Comparatia temperaturilor medii este sub diagrama circulara.</p> : null}
              {!stats?.ndviVsLst.length ? <EmptyChart message="Datele pentru relatie nu sunt disponibile." /> : <div className="h-52"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis type="number" dataKey="ndvi" name="NDVI" stroke="#cbd5e1" domain={[-1, 1]} tickLine={false} axisLine={false} fontSize={10} /><YAxis type="number" dataKey="lst" name="LST" unit="°C" stroke="#cbd5e1" tickLine={false} axisLine={false} fontSize={10} /><Tooltip cursor={{ strokeDasharray: '4 4' }} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /><Scatter data={stats.ndviVsLst} fill="#34d399" /></ScatterChart></ResponsiveContainer></div>}
            </article>
          </div>
          <article className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3" aria-label={spectralBreakdown ? 'Indicii de suprafata din NDVI' : 'Distributia claselor de teren'}>
            <div className="mb-3"><h3 className="text-sm font-medium text-slate-200">{spectralBreakdown ? 'Tipuri posibile de suprafata din NDVI' : 'Land Cover'}</h3>{spectralBreakdown ? <p className="mt-1 text-xs leading-5 text-slate-400">Estimare orientativa: intervalele NDVI nu sunt clase de teren cartografiate.</p> : null}</div>
            {breakdownEntries.length === 0 ? <EmptyChart message="Nu exista date pentru aceasta diagrama." /> : <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"><div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={breakdownEntries} dataKey="percentage" nameKey="label" innerRadius={42} outerRadius={70} paddingAngle={3}>{breakdownEntries.map((entry) => <Cell key={entry.categoryId ?? entry.label} fill={entry.color} />)}</Pie><Tooltip formatter={(value) => [`${Number(value ?? 0)}%`, 'Procent']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} /></PieChart></ResponsiveContainer></div><div className="space-y-2">{breakdownEntries.map((entry) => <div key={entry.categoryId ?? entry.label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-xs leading-4 text-slate-200">{entry.label}</span></div><span className="shrink-0 text-xs font-medium text-slate-50">{entry.percentage}%</span></div>)}</div></div>}
            {relationship?.available ? <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
              <h4 className="text-sm font-semibold text-sky-100">Ce arata comparatia cu LST</h4>
              <p className="mt-1 text-sm leading-6 text-slate-100">{relationshipText}</p>
              {contrast ? <p className="mt-2 text-xs leading-5 text-slate-300">Temperatura medie: <strong className="text-amber-200">{contrast.lowNdviMeanLstC.toFixed(1)} °C</strong> unde NDVI &lt; 0.2, fata de <strong className="text-emerald-200">{contrast.highNdviMeanLstC.toFixed(1)} °C</strong> unde NDVI ≥ 0.4.</p> : null}
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Calculata din pixelii care se suprapun in ambele harti, indiferent de stratul afisat. Diferenta observata nu prezice efectul plantarii si nu dovedeste o cauza.</p>
            </div> : null}
          </article>
        </>
      )}
    </section>
  );
}
