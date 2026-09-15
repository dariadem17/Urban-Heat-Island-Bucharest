import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimelineEntry } from '../../types';

type Props = {
  timeline: TimelineEntry[];
  city: boolean;
};

export function TemporalTrendPanel({ timeline, city }: Props) {
  const lstKey = city ? 'lst' : 'lstVsCity';
  const ndviKey = city ? 'ndvi' : 'ndviVsCity';
  const lstValues = timeline.map((entry) => entry[lstKey]).filter((value): value is number => value !== null);
  const ndviValues = timeline.map((entry) => entry[ndviKey]).filter((value): value is number => value !== null);

  if (!lstValues.length || !ndviValues.length) return null;

  const lstDomain: [number, number] = city
    ? [Math.min(...lstValues) - 0.5, Math.max(...lstValues) + 0.5]
    : [Math.min(0, ...lstValues) - 0.1, Math.max(0, ...lstValues) + 0.1];
  const ndviDomain: [number, number] = city
    ? [Math.min(...ndviValues) - 0.01, Math.max(...ndviValues) + 0.01]
    : [Math.min(0, ...ndviValues) - 0.005, Math.max(0, ...ndviValues) + 0.005];

  return (
    <section className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4">
      <h3 className="text-base font-semibold text-slate-100">{city ? 'Evolutia Bucurestiului' : 'Evolutia sectorului fata de oras'}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        {city
          ? 'Fiecare punct este media unei observatii disponibile pentru Bucuresti. Seria descrie trecutul si nu reprezinta o prognoza.'
          : 'Fiecare punct compara sectorul cu media Bucurestiului din acelasi an. Linia 0 este media orasului; graficul arata daca diferenta se repeta in timp.'}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs font-medium text-amber-200">{city ? 'LST mediu (°C)' : 'LST fata de oras (°C)'}</p>
          <p className="mt-1 text-[11px] text-slate-400">{city ? 'Temperatura medie a suprafetei.' : 'Peste 0: sectorul este mai cald.'}</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} width={38} domain={lstDomain} tickFormatter={(value) => Number(value).toFixed(1)} />
                {city ? null : <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />}
                <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} °C`, city ? 'LST mediu' : 'Fata de oras']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                <Line type="linear" dataKey={lstKey} stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-xs font-medium text-emerald-200">{city ? 'NDVI mediu' : 'NDVI fata de oras'}</p>
          <p className="mt-1 text-[11px] text-slate-400">{city ? 'Valoarea medie pentru Bucuresti.' : 'Sub 0: sectorul are NDVI mai mic.'}</p>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} width={38} domain={ndviDomain} tickFormatter={(value) => Number(value).toFixed(2)} />
                {city ? null : <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />}
                <Tooltip formatter={(value) => [Number(value).toFixed(3), city ? 'NDVI mediu' : 'Fata de oras']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 12 }} />
                <Line type="linear" dataKey={ndviKey} stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
