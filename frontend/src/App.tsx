import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, MapPinned, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsPanel } from './components/analytics/AnalyticsPanel';
import { ChartPanel } from './components/charts/ChartPanel';
import { TemporalTrendPanel } from './components/charts/TemporalTrendPanel';
import { ComparisonPanel } from './components/comparison/ComparisonPanel';
import { ControlPanel } from './components/controls/ControlPanel';
import { MapPanel } from './components/map/MapPanel';
import { InsightsPanel } from './components/report/InsightsPanel';
import { useDashboardData } from './hooks/useDashboardData';
import { dataMode, dataService } from './services/dataService';
import { LAYER_NAMES, PRIMARY_LAYERS, SUPPORTED_SEASONS } from './data/appConfig';
import type { DataLayer, Season, SectorId, Year } from './types';

const defaultSector: SectorId = 'all';
const defaultYear: Year = 2025;
const defaultLayer: DataLayer = 'lst';
const defaultSeason: Season = 'summer';

type AppView = 'overview' | 'comparison';

function App() {
  const [selectedSector, setSelectedSector] = useState<SectorId>(defaultSector);
  const [selectedYear, setSelectedYear] = useState<Year>(defaultYear);
  const [selectedLayer, setSelectedLayer] = useState<DataLayer>(defaultLayer);
  const [opacity, setOpacity] = useState<number>(52);
  const [season, setSeason] = useState<Season>(defaultSeason);
  const [view, setView] = useState<AppView>('overview');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [view]);

  const { availabilityQuery, boundariesQuery, statisticsQuery, landCoverQuery, layerQuery, sectorsQuery, yearsQuery } = useDashboardData(
    selectedSector,
    selectedYear,
    selectedLayer,
    season,
  );

  const currentLayerName = LAYER_NAMES[selectedLayer];
  const currentStats = statisticsQuery.data;
  const selectedAvailability = availabilityQuery.data?.find(
    (entry) => entry.year === selectedYear && entry.season === season,
  )?.layers;

  const reportQuery = useQuery({
    queryKey: ['explore-report', selectedSector, selectedYear, season, currentStats, landCoverQuery.data],
    queryFn: () => {
      if (!currentStats) {
        throw new Error('Statisticile necesare pentru raport nu sunt disponibile.');
      }
      return dataService.getReport(currentStats, landCoverQuery.data ?? []);
    },
    enabled: Boolean(currentStats) && landCoverQuery.isSuccess,
  });

  const headerMeta = useMemo(
    () => [
      { label: 'Date', value: dataMode === 'demo' ? 'Date demonstrative' : 'Date din API' },
      { label: 'Sezon', value: 'Vara' },
      { label: 'Strat', value: currentLayerName },
    ],
    [currentLayerName],
  );

  const resetFilters = () => {
    setSelectedSector(defaultSector);
    setSelectedYear(defaultYear);
    setSelectedLayer(defaultLayer);
    setOpacity(52);
    setSeason(defaultSeason);
  };

  const changeYear = (year: Year) => {
    const nextAvailability = availabilityQuery.data?.find(
      (entry) => entry.year === year && entry.season === season,
    )?.layers;
    const nextLayer = PRIMARY_LAYERS.find((layer) => nextAvailability?.[layer] === 'available');

    setSelectedYear(year);
    if (nextAvailability?.[selectedLayer] !== 'available' && nextLayer) {
      setSelectedLayer(nextLayer);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1117] text-slate-100 antialiased">
      {filtersOpen ? <button type="button" aria-label="Inchide filtrele" onClick={() => setFiltersOpen(false)} className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm xl:hidden" /> : null}
      <div className="mx-auto flex min-h-screen max-w-[1800px] xl:flex-row">
        <aside className={`fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] overflow-y-auto border-r border-slate-800 bg-[#0d141b] transition-transform duration-200 xl:static xl:z-auto xl:w-[290px] xl:shrink-0 xl:translate-x-0 ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <ControlPanel
            comparisonMode={view === 'comparison'}
            sectors={sectorsQuery.data ?? []}
            years={yearsQuery.data ?? []}
            selectedSector={selectedSector}
            selectedYear={selectedYear}
            selectedLayer={selectedLayer}
            selectedSeason={season}
            opacity={opacity}
            onSectorChange={(sector) => { setSelectedSector(sector); setFiltersOpen(false); }}
            onYearChange={changeYear}
            onLayerChange={setSelectedLayer}
            onSeasonChange={setSeason}
            onOpacityChange={setOpacity}
            onReset={resetFilters}
            availableLayers={PRIMARY_LAYERS}
            availableSeasons={SUPPORTED_SEASONS}
            layerAvailability={view === 'comparison' ? undefined : selectedAvailability}
            opacityEnabled={view === 'comparison' || layerQuery.data?.source.kind === 'image' || layerQuery.data?.source.kind === 'raster-tiles'}
            onClose={() => setFiltersOpen(false)}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-800 bg-[#111b26]/80 px-4 py-3 backdrop-blur-sm sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setFiltersOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 xl:hidden" aria-label="Deschide filtrele"><SlidersHorizontal className="h-4 w-4" /></button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <MapPinned className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/80">
                    Insula de caldura urbana - Bucuresti
                  </p>
                  <p className="text-xs text-slate-400">{view === 'overview' ? `Vara · ${selectedYear}` : 'Alege anii in panoul de comparatie'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden flex-wrap items-center gap-2 md:flex">
                  {headerMeta.map((item) => (
                    <div key={item.label} className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300">
                      <span className="mr-1.5 text-slate-500">{item.label}:</span>
                      {item.value}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setView(view === 'overview' ? 'comparison' : 'overview')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
                >
                  <ArrowRightLeft className="h-4 w-4 text-emerald-300" />
                  {view === 'overview' ? 'Compara' : 'Exploreaza'}
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {view === 'overview' ? (
              <>
                <MapPanel
                  selectedSector={selectedSector}
                  selectedLayer={selectedLayer}
                  selectedYear={selectedYear}
                  opacity={opacity}
                  onSectorSelect={setSelectedSector}
                  layerDescriptor={layerQuery.data ?? null}
                  sectors={sectorsQuery.data ?? []}
                  boundaries={boundariesQuery.data ?? null}
                  boundariesLoading={boundariesQuery.isLoading}
                  layerLoading={layerQuery.isLoading}
                  layerError={layerQuery.isError}
                  dataMode={dataMode}
                />

                <AnalyticsPanel
                  stats={statisticsQuery.data ?? null}
                  activeLayer={selectedLayer}
                  loading={statisticsQuery.isLoading}
                  error={statisticsQuery.isError}
                />

                {selectedYear === 2025 && reportQuery.data?.timeline?.length ? (
                  <TemporalTrendPanel timeline={reportQuery.data.timeline} city={selectedSector === 'all'} />
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[2.1fr_1fr]">
                  <ChartPanel stats={statisticsQuery.data ?? null} landCover={landCoverQuery.data ?? []} activeLayer={selectedLayer} loading={statisticsQuery.isLoading || landCoverQuery.isLoading} error={statisticsQuery.isError || landCoverQuery.isError} />
                  <InsightsPanel report={reportQuery.data ?? null} loading={reportQuery.isLoading} error={reportQuery.isError} selectedSector={selectedSector} onCompare={(sector) => { if (sector) setSelectedSector(sector); setView('comparison'); }} />
                </div>
              </>
            ) : (
              <ComparisonPanel
                sectors={sectorsQuery.data ?? []}
                years={yearsQuery.data ?? []}
                currentSector={selectedSector}
                currentYear={selectedYear}
                selectedLayer={selectedLayer}
                opacity={opacity}
                boundaries={boundariesQuery.data ?? null}
                boundariesLoading={boundariesQuery.isLoading}
                dataMode={dataMode}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
