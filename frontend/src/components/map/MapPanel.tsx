import { useEffect, useRef } from 'react';
import { AlertTriangle, DatabaseZap, LoaderCircle, Map as MapIcon } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import type {
  DataLayer,
  DataMode,
  MapLayerDescriptor,
  RegionSector,
  SectorBoundaryCollection,
  SectorId,
} from '../../types';

type MapPanelProps = {
  eyebrow?: string;
  selectedSector: SectorId;
  selectedLayer: DataLayer;
  selectedYear: number;
  opacity: number;
  onSectorSelect: (sector: SectorId) => void;
  layerDescriptor: MapLayerDescriptor | null;
  sectors: RegionSector[];
  boundaries: SectorBoundaryCollection | null;
  boundariesLoading: boolean;
  layerLoading: boolean;
  layerError: boolean;
  dataMode: DataMode;
};

const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark-base': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
    'carto-dark-labels': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'navy-background', type: 'background', paint: { 'background-color': '#07131f' } },
    {
      id: 'carto-dark-base',
      type: 'raster',
      source: 'carto-dark-base',
      paint: {
        'raster-opacity': 0.84,
        'raster-saturation': -0.38,
        'raster-contrast': 0.12,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.76,
      },
    },
    {
      id: 'carto-dark-labels',
      type: 'raster',
      source: 'carto-dark-labels',
      paint: { 'raster-opacity': 0.72 },
    },
  ],
};

const BASEMAP_LABELS = 'carto-dark-labels';
const BOUNDARY_SOURCE = 'bucharest-sector-boundaries';
const BOUNDARY_FILL = 'bucharest-sector-fill';
const BOUNDARY_LINE = 'bucharest-sector-line';
const SELECTED_BOUNDARY_LINE = 'bucharest-selected-sector-line';
const OVERLAY_SOURCE = 'scientific-overlay-source';
const OVERLAY_LAYER = 'scientific-overlay-layer';

function getGeoJsonBounds(boundaries: SectorBoundaryCollection, selectedSector: SectorId) {
  const bounds = new maplibregl.LngLatBounds();
  const features = selectedSector === 'all'
    ? boundaries.features
    : boundaries.features.filter((feature) => feature.properties.sectorId === selectedSector);

  const addCoordinates = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      bounds.extend([value[0], value[1]]);
      return;
    }
    value.forEach(addCoordinates);
  };

  features.forEach((feature) => addCoordinates(feature.geometry.coordinates));
  return bounds.isEmpty() ? null : bounds;
}

function removeScientificOverlay(map: maplibregl.Map) {
  if (map.getLayer(OVERLAY_LAYER)) map.removeLayer(OVERLAY_LAYER);
  if (map.getSource(OVERLAY_SOURCE)) map.removeSource(OVERLAY_SOURCE);
}

export function MapPanel({
  eyebrow = 'Map view',
  selectedSector,
  selectedLayer,
  selectedYear,
  opacity,
  onSectorSelect,
  layerDescriptor,
  sectors,
  boundaries,
  boundariesLoading,
  layerLoading,
  layerError,
  dataMode,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sectorSelectRef = useRef(onSectorSelect);

  useEffect(() => {
    sectorSelectRef.current = onSectorSelect;
  }, [onSectorSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const map = new maplibregl.Map({
      container,
      style: BASEMAP_STYLE,
      center: [26.1025, 44.4268],
      zoom: 10.3,
      minZoom: 8,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundaries) return;

    const addBoundaries = () => {
      const existingSource = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(boundaries as maplibregl.GeoJSONSourceSpecification['data']);
        return;
      }

      map.addSource(BOUNDARY_SOURCE, {
        type: 'geojson',
        data: boundaries as maplibregl.GeoJSONSourceSpecification['data'],
      });
      map.addLayer({
        id: BOUNDARY_FILL,
        type: 'fill',
        source: BOUNDARY_SOURCE,
        paint: {
          'fill-color': ['case', ['==', ['get', 'sectorId'], selectedSector], '#34d399', '#0f766e'],
          'fill-opacity': ['case', ['==', ['get', 'sectorId'], selectedSector], 0.28, 0.08],
        },
      }, BASEMAP_LABELS);
      map.addLayer({
        id: BOUNDARY_LINE,
        type: 'line',
        source: BOUNDARY_SOURCE,
        paint: {
          'line-color': '#5eead4',
          'line-width': 1.25,
          'line-opacity': 0.78,
        },
      }, BASEMAP_LABELS);
      map.addLayer({
        id: SELECTED_BOUNDARY_LINE,
        type: 'line',
        source: BOUNDARY_SOURCE,
        filter: selectedSector === 'all' ? ['==', ['get', 'sectorId'], ''] : ['==', ['get', 'sectorId'], selectedSector],
        paint: {
          'line-color': '#f8fafc',
          'line-width': 3,
          'line-opacity': 0.98,
        },
      }, BASEMAP_LABELS);
      map.on('click', BOUNDARY_FILL, (event) => {
        const sectorId = event.features?.[0]?.properties?.sectorId as SectorId | undefined;
        if (sectorId) sectorSelectRef.current(sectorId);
      });
      map.on('mouseenter', BOUNDARY_FILL, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', BOUNDARY_FILL, () => { map.getCanvas().style.cursor = ''; });
    };

    if (map.loaded()) addBoundaries();
    else map.once('load', addBoundaries);
  }, [boundaries, selectedSector]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateSelection = () => {
      if (map.getLayer(BOUNDARY_FILL)) {
        map.setPaintProperty(BOUNDARY_FILL, 'fill-color', ['case', ['==', ['get', 'sectorId'], selectedSector], '#34d399', '#0f766e']);
        map.setPaintProperty(BOUNDARY_FILL, 'fill-opacity', ['case', ['==', ['get', 'sectorId'], selectedSector], 0.28, 0.08]);
        if (map.getLayer(SELECTED_BOUNDARY_LINE)) {
          map.setFilter(SELECTED_BOUNDARY_LINE, selectedSector === 'all' ? ['==', ['get', 'sectorId'], ''] : ['==', ['get', 'sectorId'], selectedSector]);
        }
      }

      const geographicBounds = boundaries ? getGeoJsonBounds(boundaries, selectedSector) : null;
      if (geographicBounds) {
        map.fitBounds(geographicBounds, { padding: 64, maxZoom: 13, duration: 650 });
        return;
      }
      const selected = sectors.find((sector) => sector.id === selectedSector);
      if (selected?.center) map.easeTo({ center: selected.center, zoom: selectedSector === 'all' ? 10.3 : 11.1, duration: 650 });
    };

    if (map.loaded()) updateSelection();
    else map.once('load', updateSelection);
  }, [boundaries, sectors, selectedSector]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateOverlay = () => {
      removeScientificOverlay(map);
      if (!layerDescriptor || layerDescriptor.availability !== 'available') return;
      const source = layerDescriptor.source;

      if (source.kind === 'image') {
        const [[west, south], [east, north]] = source.bounds;
        map.addSource(OVERLAY_SOURCE, {
          type: 'image',
          url: source.url,
          coordinates: [[west, north], [east, north], [east, south], [west, south]],
        });
      } else if (source.kind === 'raster-tiles') {
        map.addSource(OVERLAY_SOURCE, {
          type: 'raster',
          tiles: source.tiles,
          tileSize: source.tileSize ?? 256,
          minzoom: source.minZoom,
          maxzoom: source.maxZoom,
        });
      } else {
        return;
      }

      map.addLayer({
        id: OVERLAY_LAYER,
        type: 'raster',
        source: OVERLAY_SOURCE,
        paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
      }, map.getLayer(BOUNDARY_FILL) ? BOUNDARY_FILL : BASEMAP_LABELS);
    };

    if (map.loaded()) updateOverlay();
    else map.once('load', updateOverlay);
  }, [layerDescriptor, opacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(OVERLAY_LAYER)) map.setPaintProperty(OVERLAY_LAYER, 'raster-opacity', opacity / 100);
  }, [opacity]);

  const selectedSectorMeta = sectors.find((sector) => sector.id === selectedSector) ?? sectors[0];
  const hasRenderableOverlay = layerDescriptor?.source.kind === 'image' || layerDescriptor?.source.kind === 'raster-tiles';

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-slate-50">{selectedSectorMeta?.name ?? 'All Bucharest'}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
          <span className={`h-2 w-2 rounded-full ${hasRenderableOverlay ? 'bg-emerald-400' : 'bg-amber-300'}`} />
          {selectedLayer.toUpperCase()} · {selectedYear}
        </div>
      </div>

      <div className="relative min-w-0">
        <div ref={containerRef} className="h-[440px] w-full sm:h-[520px]" role="application" tabIndex={0} aria-label="Interactive map of Bucharest. Use arrow keys to pan and plus or minus to zoom." />

        {layerDescriptor ? <MapLegend descriptor={layerDescriptor} /> : null}

        <MapState
          loading={layerLoading}
          error={layerError}
          unavailable={layerDescriptor?.availability !== 'available'}
          unsupported={layerDescriptor?.source.kind === 'geotiff'}
          empty={!layerLoading && !layerError && layerDescriptor?.availability === 'available' && !hasRenderableOverlay}
          demo={dataMode === 'demo'}
        />

        <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-slate-700 bg-slate-950/90 px-2.5 py-2 text-[10px] text-slate-300 shadow-lg">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${boundaries ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {boundariesLoading ? 'Loading boundaries' : boundaries ? 'Sector boundaries loaded' : 'Basemap only'}
          </div>
          <div className="mt-1 text-slate-400">Layer opacity {opacity}%</div>
        </div>
      </div>
    </section>
  );
}

type MapStateProps = {
  loading: boolean;
  error: boolean;
  unavailable: boolean;
  unsupported: boolean;
  empty: boolean;
  demo: boolean;
};

function MapState({ loading, error, unavailable, unsupported, empty, demo }: MapStateProps) {
  let content: { icon: typeof MapIcon; title: string; detail: string } | null = null;
  if (loading) content = { icon: LoaderCircle, title: 'Loading layer', detail: 'Requesting layer metadata…' };
  else if (error) content = { icon: DatabaseZap, title: 'Layer service unavailable', detail: 'The basemap remains available. Try again when the data service is online.' };
  else if (unavailable) content = { icon: AlertTriangle, title: 'Layer unavailable', detail: 'No dataset exists for this layer and year combination.' };
  else if (unsupported) content = { icon: AlertTriangle, title: 'GeoTIFF conversion required', detail: 'Provide a web raster or tile endpoint for browser display.' };
  else if (empty) content = { icon: MapIcon, title: demo ? 'Scientific overlay awaiting processed data' : 'Scientific overlay unavailable', detail: demo ? 'Demo dataset · interactive basemap remains available' : 'A validated raster image or tile source has not been connected for this selection.' };

  if (!content) return null;
  const Icon = content.icon;
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 flex w-[min(82%,460px)] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-slate-700/90 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur-md" aria-live="polite">
      <Icon className={`h-4 w-4 shrink-0 text-amber-300 ${loading ? 'animate-spin' : ''}`} />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-100">{content.title}</p>
        <p className="hidden truncate text-[10px] text-slate-400 sm:block">{content.detail}</p>
      </div>
    </div>
  );
}

function MapLegend({ descriptor }: { descriptor: MapLayerDescriptor }) {
  const { legend } = descriptor;
  const gradient = `linear-gradient(90deg, ${legend.items.map((item) => item.color).join(', ')})`;
  return (
    <div className="pointer-events-none absolute left-3 top-3 w-[min(58%,240px)] rounded-xl border border-slate-700 bg-slate-950/90 p-2.5 shadow-lg backdrop-blur-sm">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">{descriptor.name}</p>
      {legend.kind === 'continuous' ? (
        <>
          <div className="mt-2 h-2 rounded-full" style={{ background: gradient }} />
          <div className="mt-1 flex justify-between gap-2 text-[9px] text-slate-300">
            <span className="truncate">{legend.domain?.[0] ?? legend.items[0]?.label}</span>
            <span className="truncate text-right">{legend.domain?.[1] ?? legend.items.at(-1)?.label}</span>
          </div>
        </>
      ) : (
        <div className="mt-2 space-y-1.5">
          {legend.items.map((item) => <div key={item.label} className="flex items-center gap-2 text-[10px] text-slate-200"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}</div>)}
        </div>
      )}
      {legend.note ? <p className="mt-2 border-t border-slate-800 pt-1.5 text-[9px] leading-3.5 text-slate-400">{legend.note}</p> : null}
    </div>
  );
}
