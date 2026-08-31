import type { EnvironmentalReport } from '../../types';

type Props = { report: EnvironmentalReport | null; loading: boolean; error: boolean };

export function InsightsPanel({ report, loading, error }: Props) {
  return (
    <aside className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-3.5" aria-busy={loading}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Environmental report</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-50">{report?.title ?? 'Selected dataset summary'}</h2>
      {loading ? <div className="mt-3 space-y-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-800/60" />)}</div> : error ? <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">The report could not be prepared for this selection.</div> : report ? (
        <div className="mt-3 space-y-2.5">
          {report.sections.map((section, index) => <section key={section.title} className={`rounded-2xl border p-3 ${index === 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/50'}`}><h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">{section.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{section.body}</p></section>)}
          <div className="rounded-xl border border-slate-800 px-3 py-2 text-[10px] leading-4 text-slate-500"><span className="font-semibold uppercase tracking-wider text-slate-400">Data note · </span>{report.dataNote}</div>
        </div>
      ) : <div className="mt-3 rounded-2xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">Report data is unavailable.</div>}
    </aside>
  );
}
