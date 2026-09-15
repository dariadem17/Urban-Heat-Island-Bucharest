import { ArrowRightLeft } from 'lucide-react';
import type { EnvironmentalReport, SectorId } from '../../types';

type Props = { report: EnvironmentalReport | null; loading: boolean; error: boolean; selectedSector: SectorId; onCompare: (sector?: SectorId) => void };

const priorityLabel: Record<string, string> = {
  historical: 'Reper istoric',
  'compare sectors': 'Unde sa incepi',
  'focused review': 'Prioritate pentru verificarea amplasamentului',
  'routine review': 'Pastreaza avantajele zonei',
  'insufficient data': 'Date insuficiente pentru o recomandare',
};

export function InsightsPanel({ report, loading, error, selectedSector, onCompare }: Props) {
  const facts = report?.assessment;
  const recommendations = facts?.intervention.recommendations ?? [];
  const cityOverview = selectedSector === 'all';
  const historical = report?.mode === 'historical';
  const suggestedSector = cityOverview ? facts?.benchmark.prioritySectors?.[0]?.sector : undefined;
  const nextSteps = historical
    ? ['Urmareste diferentele fata de media orasului, nu doar temperaturile absolute.', 'Foloseste anul 2025 si verificarea parcelei pentru deciziile de proiect.']
    : cityOverview
    ? ['La prima schita, pastreaza o curte plantata continua, nu doar fasii verzi intre parcari.', 'Aseaza intrarile si locurile de stat afara in zone umbrite dupa-amiaza.']
    : ['Viziteaza parcela dupa-amiaza si noteaza intrarile si pavajul fara umbra.', 'Cere inventarul arborilor si verifica ce poate ramane dupa construire.'];

  return (
    <aside className="self-start rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4" aria-busy={loading}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">{historical ? 'Evolutia zonei' : 'Raport pentru dezvoltare imobiliara'}</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-50">{report?.title ?? 'Evaluarea zonei selectate'}</h2>
      {loading ? <div className="mt-4 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-800/60" />)}</div>
        : error ? <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-200">Raportul nu a putut fi pregatit pentru aceasta selectie.</div>
          : report ? <div className="mt-4 space-y-4">
            {report.summary ? <div className={`rounded-2xl border p-4 ${facts?.intervention.priority === 'focused review' ? 'border-amber-500/30 bg-amber-500/10' : 'border-sky-500/25 bg-sky-500/10'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">{facts ? priorityLabel[facts.intervention.priority] ?? 'Ce arata zona' : 'Ce arata zona'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{report.summary}</p>
            </div> : null}
            {recommendations.length > 0 ? <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{historical ? 'Ce ramane relevant azi' : 'Ce sa incluzi in proiect'}</h3>
              <ol className="mt-3 space-y-3">
                {recommendations.map((recommendation, index) => <li key={recommendation} className="flex gap-3 text-sm leading-6 text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">{index + 1}</span>
                  <span>{recommendation}</span>
                </li>)}
              </ol>
            </section> : !facts ? report.sections.slice(0, 2).map((section) => <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <h3 className="text-xs font-semibold text-slate-200">{section.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-300">{section.body}</p>
            </section>) : null}
            {report.temporalSignal && !historical ? <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <h3 className="text-xs font-semibold text-slate-100">Semnal in timp</h3>
              <p className="mt-1 text-xs leading-5 text-slate-300">{report.temporalSignal}</p>
            </div> : null}
            <p className="border-t border-slate-800 pt-3 text-[11px] leading-5 text-slate-400">{report.dataNote}</p>
            <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Pasul urmator</h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-200">
                {nextSteps.map((step) => <li key={step} className="flex gap-2"><span className="text-emerald-300">•</span><span>{step}</span></li>)}
              </ul>
              <button type="button" onClick={() => onCompare(historical ? selectedSector : suggestedSector)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                {historical ? 'Compara cu 2025' : 'Deschide comparatia'} <ArrowRightLeft className="h-4 w-4" />
              </button>
            </section>
          </div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">Datele raportului nu sunt disponibile.</div>}
    </aside>
  );
}
