import type { EnvironmentalReport } from '../../types';

type Props = { report: EnvironmentalReport | null; loading: boolean; error: boolean };

const number = (value: number | null, digits = 1) => value === null ? 'Unavailable' : value.toFixed(digits);

export function InsightsPanel({ report, loading, error }: Props) {
  const facts = report?.assessment;
  const isCity = facts?.area.code === 'bucharest';
  const limitations = report?.sections.find((section) => section.title === 'Data limitations');
  const details = report?.sections.filter((section) => !['Area and period', 'What to investigate', 'Data limitations'].includes(section.title)) ?? [];

  return (
    <aside className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-3.5" aria-busy={loading}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">Urban development assessment</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-50">{report?.title ?? 'Selected area report'}</h2>
      {loading ? <div className="mt-3 space-y-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-800/60" />)}</div>
        : error ? <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">The assessment could not be prepared for this selection.</div>
          : report ? <div className="mt-3 space-y-3">
            {report.summary ? <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200">Main finding</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{report.summary}</p>
            </div> : null}
            {facts ? <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-amber-200">Thermal exposure</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">{facts.thermal.level ?? (isCity ? 'City baseline' : 'Unavailable')}</p>
                  <p className="mt-1 text-xs text-slate-300">{number(facts.thermal.avgLstC)} °C mean LST · {facts.thermal.deltaVsCityC === null ? 'City comparison unavailable' : `${facts.thermal.deltaVsCityC > 0 ? '+' : ''}${number(facts.thermal.deltaVsCityC)} °C vs city`}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{number(facts.thermal.hotspotAreaPct)}% hotspot area</p>
                  <p className="mt-1 text-[11px] text-slate-400">{facts.thermal.score === null ? 'No sector rank' : `${facts.thermal.score}/100 six-sector rank`}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-200">Vegetation deficit</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">{facts.vegetation.level ?? (isCity ? 'City baseline' : 'Unavailable')}</p>
                  <p className="mt-1 text-xs text-slate-300">{number(facts.vegetation.avgNdvi, 3)} mean NDVI · {facts.vegetation.deltaVsCity === null ? 'City comparison unavailable' : `${facts.vegetation.deltaVsCity > 0 ? '+' : ''}${number(facts.vegetation.deltaVsCity, 3)} vs city`}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{facts.vegetation.deficitScore === null ? 'No sector rank' : `${facts.vegetation.deficitScore}/100 sector rank`}</p>
                </div>
              </div>
              <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-sky-200">NDVI + surface temperature</h3>
                {facts.cooling.available ? <>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{facts.cooling.summary}</p>
                  <p className="mt-1 text-xs text-slate-300">{facts.cooling.strength} association · Spearman ρ {facts.cooling.spearmanRho?.toFixed(3)} · {facts.cooling.sampleCount?.toLocaleString()} paired pixels</p>
                  {facts.cooling.contrast ? <p className="mt-2 text-xs leading-5 text-slate-300">Mean LST: {facts.cooling.contrast.lowNdviMeanLstC.toFixed(1)} °C where NDVI &lt; 0.2; {facts.cooling.contrast.highNdviMeanLstC.toFixed(1)} °C where NDVI ≥ 0.4.</p> : null}
                  <p className="mt-1 text-[11px] text-slate-400">Calculated from both raster layers for this area and year, regardless of which map layer is visible. Association does not prove cause.</p>
                </> : <p className="mt-2 text-xs leading-5 text-slate-400">{facts.cooling.reason ?? 'The relationship cannot be calculated for this selection.'}</p>}
              </section>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Intervention priority</p>
                <p className="mt-1 text-sm font-semibold capitalize text-white">{facts.intervention.priority}</p>
                <p className="mt-1 text-xs text-slate-400">Built-up pressure and resilience: {facts.builtPressure.available && facts.resilience.available ? 'available' : 'unavailable without validated Land Cover'}</p>
              </div>
              <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200">What to improve or investigate</h3>
                <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm leading-5 text-slate-200">
                  {facts.intervention.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
                </ol>
              </section>
            </> : null}
            {!facts ? report.sections.map((section) => <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{section.body}</p>
            </section>) : <>
              <details className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-200">How this was assessed · evidence and benchmarks</summary>
                <div className="mt-3 space-y-3">
                  {details.map((section) => <section key={section.title} className="border-t border-slate-800 pt-3">
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{section.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{section.body}</p>
                  </section>)}
                </div>
              </details>
              {limitations ? <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{limitations.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">{limitations.body}</p>
              </section> : null}
            </>}
            <div className="rounded-xl border border-slate-800 px-3 py-2 text-[10px] leading-4 text-slate-500"><span className="font-semibold uppercase tracking-wider text-slate-400">Data and method · </span>{report.dataNote}</div>
          </div> : <div className="mt-3 rounded-2xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">Report data is unavailable.</div>}
    </aside>
  );
}
