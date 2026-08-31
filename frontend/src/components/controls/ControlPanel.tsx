import { Info, X } from 'lucide-react';
import type { DataLayer, LayerAvailability, RegionSector, Season, SectorId, Year } from '../../types';

type ControlPanelProps = {
  sectors: RegionSector[];
  years: Year[];
  selectedSector: SectorId;
  selectedYear: Year;
  selectedLayer: DataLayer;
  selectedSeason: Season;
  opacity: number;
  onSectorChange: (sector: SectorId) => void;
  onYearChange: (year: Year) => void;
  onLayerChange: (layer: DataLayer) => void;
  onSeasonChange: (season: Season) => void;
  onOpacityChange: (value: number) => void;
  onReset: () => void;
  onClose?: () => void;
  availableLayers: DataLayer[];
  availableSeasons: Season[];
  layerAvailability?: LayerAvailability;
  opacityEnabled: boolean;
};

const layerCopy: Record<DataLayer, { short: string; long: string; help: string }> = {
  lst: { short: 'LST', long: 'Land Surface Temperature', help: 'Satellite-derived surface temperature, not air temperature.' },
  ndvi: { short: 'NDVI', long: 'Normalized Difference Vegetation Index', help: 'Spectral-reflectance indicator used to characterize vegetation.' },
};

export function ControlPanel({
  sectors, years, selectedSector, selectedYear, selectedLayer, selectedSeason, opacity,
  onSectorChange, onYearChange, onLayerChange, onSeasonChange, onOpacityChange, onReset, onClose,
  availableLayers, availableSeasons, layerAvailability, opacityEnabled,
}: ControlPanelProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">Explore controls</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-50">Urban Heat Island Bucharest</h2>
          </div>
          {onClose ? <button type="button" onClick={onClose} aria-label="Close filters" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white xl:hidden"><X className="h-4 w-4" /></button> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Location</p>
        <div className="space-y-1.5">
          {sectors.map((sector) => (
            <button key={sector.id} type="button" onClick={() => onSectorChange(sector.id)} aria-pressed={selectedSector === sector.id}
              className={`flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left text-sm transition duration-200 ${selectedSector === sector.id ? 'border-emerald-500/60 bg-emerald-500/10 text-slate-50' : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70'}`}>
              <span>{sector.name}</span>
              {selectedSector === sector.id ? <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Selected</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Data layer</p>
        <div className="space-y-1.5">
          {availableLayers.map((layer) => {
            const status = layerAvailability?.[layer] ?? 'available';
            const disabled = status !== 'available';
            return (
              <button key={layer} type="button" onClick={() => onLayerChange(layer)} disabled={disabled} aria-pressed={selectedLayer === layer}
                title={layerCopy[layer].help}
                className={`w-full rounded-xl border px-2.5 py-2 text-left transition duration-200 ${selectedLayer === layer ? 'border-blue-500/50 bg-blue-500/10 text-slate-50' : disabled ? 'cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-600' : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70'}`}>
                <span className="flex items-center justify-between gap-2 text-sm"><span>{layerCopy[layer].short}</span>{selectedLayer === layer ? <span className="text-[9px] uppercase tracking-wider text-blue-300">Selected</span> : status !== 'available' ? <span className="text-[9px] uppercase">{status}</span> : null}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500"><Info className="h-3 w-3" />{layerCopy[layer].long}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Time & layer settings</p>
        <div className="space-y-3">
          <label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Year
            <select value={selectedYear} onChange={(event) => onYearChange(Number(event.target.value) as Year)} className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-sm text-slate-100 outline-none">
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Season</p>
            <div className="flex flex-wrap gap-1.5">
              {availableSeasons.map((season) => <button key={season} type="button" onClick={() => onSeasonChange(season)} aria-pressed={selectedSeason === season} className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium capitalize text-emerald-200">{season}</button>)}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400"><span>Overlay opacity</span><span>{opacityEnabled ? `${opacity}%` : 'Awaiting layer'}</span></span>
            <input aria-label="Scientific overlay opacity" type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} disabled={!opacityEnabled} className="h-2 w-full cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-40" />
          </label>
        </div>
      </div>

      <button type="button" onClick={onReset} className="mt-auto rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition duration-200 hover:border-slate-500 hover:bg-slate-700">Reset filters</button>
    </div>
  );
}
