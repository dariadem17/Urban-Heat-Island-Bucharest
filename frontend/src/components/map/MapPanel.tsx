import { useEffect, useRef, useState } from 'react';
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
    'osm-base': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'navy-background', type: 'background', paint: { 'background-color': '#07131f' } },
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm-base',
      paint: {
        'raster-opacity': 0.9,
        'raster-saturation': -0.85,
        'raster-contrast': 0.18,
        'raster-brightness-min': 0.04,
        'raster-brightness-max': 0.42,
      },
    },
  ],
};

const BOUNDARY_SOURCE = 'bucharest-sector-boundaries';
const BOUNDARY_FILL = 'bucharest-sector-fill';
const OVERLAY_SOURCE = 'scientific-overlay-source';
const OVERLAY_LAYER = 'scientific-overlay-layer';

const preloadedScientificImages = new Map<string, HTMLImageElement>();

function getScientificImageUrl(sourceUrl: string, layer: DataLayer, year: number) {
  const url = new URL(sourceUrl, window.location.href);
  url.pathname = url.pathname.replace(/\/(?:lst|ndvi)_\d+\.png$/, `/${layer}_${year}.png`);
  url.searchParams.set('layer', layer);
  url.searchParams.set('year', String(year));
  return url.toString();
}

function preloadScientificImage(url: string) {
  if (preloadedScientificImages.has(url)) return;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => preloadedScientificImages.set(url, image);
  image.src = url;
}

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

function projectedBoundaryPath(map: maplibregl.Map, feature: SectorBoundaryCollection['features'][number]) {
  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates as number[][][]]
    : feature.geometry.coordinates as number[][][][];
  return polygons.flatMap((polygon) => polygon.map((ring) => {
    const points = ring.map(([lon, lat], index) => {
      const point = map.project([lon, lat]);
      return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    });
    return `${points.join(' ')} Z`;
  })).join(' ');
}

function removeScientificOverlay(map: maplibregl.Map) {
  if (map.getLayer(OVERLAY_LAYER)) map.removeLayer(OVERLAY_LAYER);
  if (map.getSource(OVERLAY_SOURCE)) map.removeSource(OVERLAY_SOURCE);
}

export function MapPanel({
  eyebrow = 'Harta',
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
  const boundarySvgRef = useRef<SVGSVGElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleReadyRef = useRef(false);
  const [styleRevision, setStyleRevision] = useState(0);
  const sectorSelectRef = useRef(onSectorSelect);

  useEffect(() => {
    sectorSelectRef.current = onSectorSelect;
  }, [onSectorSelect]);

  useEffect(() => {
    if (layerDescriptor?.source.kind !== 'image') return;
    preloadScientificImage(getScientificImageUrl(layerDescriptor.source.url, 'lst', selectedYear));
    preloadScientificImage(getScientificImageUrl(layerDescriptor.source.url, 'ndvi', selectedYear));
  }, [layerDescriptor, selectedYear]);

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
    const handleStyleLoad = () => {
      styleReadyRef.current = true;
      setStyleRevision((revision) => revision + 1);
    };
    map.on('style.load', handleStyleLoad);
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.off('style.load', handleStyleLoad);
      styleReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundaries || !styleReadyRef.current) return;

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
          'fill-color': '#f8fafc',
          'fill-opacity': ['case', ['==', ['get', 'sectorId'], selectedSector], 0.07, 0],
        },
      });
      map.on('click', BOUNDARY_FILL, (event) => {
        const sectorId = event.features?.[0]?.properties?.sectorId as SectorId | undefined;
        if (sectorId) sectorSelectRef.current(sectorId);
      });
      map.on('mouseenter', BOUNDARY_FILL, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', BOUNDARY_FILL, () => { map.getCanvas().style.cursor = ''; });
    };

    addBoundaries();
  }, [boundaries, selectedSector, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const updateSelection = () => {
      if (map.getLayer(BOUNDARY_FILL)) {
        map.setPaintProperty(BOUNDARY_FILL, 'fill-opacity', ['case', ['==', ['get', 'sectorId'], selectedSector], 0.07, 0]);
      }

      const geographicBounds = boundaries ? getGeoJsonBounds(boundaries, selectedSector) : null;
      if (geographicBounds) {
        map.stop();
        map.fitBounds(geographicBounds, {
          padding: selectedSector === 'all' ? 56 : 88,
          maxZoom: selectedSector === 'all' ? 11 : 12.4,
          duration: 900,
        });
        return;
      }
      const selected = sectors.find((sector) => sector.id === selectedSector);
      if (selected?.center) {
        map.stop();
        map.easeTo({ center: selected.center, zoom: selectedSector === 'all' ? 10.3 : 11.4, duration: 900 });
      }
    };

    // Camera movements do not need to wait for all raster tiles to finish
    // loading. Waiting on `load` here can deadlock after the initial map load.
    updateSelection();
  }, [boundaries, sectors, selectedSector, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    const svg = boundarySvgRef.current;
    if (!map || !svg) return;
    svg.replaceChildren();
    if (!boundaries || !styleReadyRef.current) return;

    const orderedFeatures = [...boundaries.features].sort((a, b) =>
      Number(a.properties.sectorId === selectedSector) - Number(b.properties.sectorId === selectedSector));
    const paths = orderedFeatures.map((feature) => {
      const selected = feature.properties.sectorId === selectedSector;
      const makePath = (color: string, width: number) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', String(width));
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        return path;
      };
      const halo = makePath('#07131f', selected ? 9 : 5);
      const line = makePath(selected ? '#f8fafc' : '#cbd5e1', selected ? 4 : 2);
      svg.append(halo, line);
      return { feature, halo, line };
    });

    let frame = 0;
    const draw = () => {
      frame = 0;
      for (const { feature, halo, line } of paths) {
        const geometry = projectedBoundaryPath(map, feature);
        halo.setAttribute('d', geometry);
        line.setAttribute('d', geometry);
      }
    };
    const scheduleDraw = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    map.on('move', scheduleDraw);
    map.on('resize', scheduleDraw);
    return () => {
      map.off('move', scheduleDraw);
      map.off('resize', scheduleDraw);
      if (frame) cancelAnimationFrame(frame);
      svg.replaceChildren();
    };
  }, [boundaries, selectedSector, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;

    const updateOverlay = () => {
      if (!layerDescriptor || layerDescriptor.availability !== 'available') {
        removeScientificOverlay(map);
        return;
      }
      const source = layerDescriptor.source;

      if (source.kind === 'image') {
        const [[west, south], [east, north]] = source.bounds;
        const coordinates: maplibregl.Coordinates = [[west, north], [east, north], [east, south], [west, south]];
        const imageUrl = getScientificImageUrl(source.url, selectedLayer, selectedYear);
        const existingSource = map.getSource(OVERLAY_SOURCE) as maplibregl.ImageSource | undefined;

        if (existingSource?.type === 'image') {
          const preloadedImage = preloadedScientificImages.get(imageUrl);
          if (preloadedImage) existingSource.updateImage({ image: preloadedImage, coordinates });
          else existingSource.updateImage({ url: imageUrl, coordinates });
        } else {
          removeScientificOverlay(map);
          map.addSource(OVERLAY_SOURCE, {
            type: 'image',
            url: imageUrl,
            coordinates,
          });
        }
      } else if (source.kind === 'raster-tiles') {
        removeScientificOverlay(map);
        map.addSource(OVERLAY_SOURCE, {
          type: 'raster',
          tiles: source.tiles,
          tileSize: source.tileSize ?? 256,
          minzoom: source.minZoom,
          maxzoom: source.maxZoom,
        });
      } else {
        removeScientificOverlay(map);
        return;
      }

      if (!map.getLayer(OVERLAY_LAYER)) {
        const overlayLayer: maplibregl.RasterLayerSpecification = {
          id: OVERLAY_LAYER,
          type: 'raster',
          source: OVERLAY_SOURCE,
          paint: {
            'raster-opacity': opacity / 100,
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
          },
        };
        if (map.getLayer(BOUNDARY_FILL)) map.addLayer(overlayLayer, BOUNDARY_FILL);
        else map.addLayer(overlayLayer);
      }
    };

    updateOverlay();
  }, [layerDescriptor, opacity, selectedLayer, selectedYear, styleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && styleReadyRef.current && map.getLayer(OVERLAY_LAYER)) map.setPaintProperty(OVERLAY_LAYER, 'raster-opacity', opacity / 100);
  }, [opacity]);

  const selectedSectorMeta = sectors.find((sector) => sector.id === selectedSector) ?? sectors[0];
  const hasRenderableOverlay = layerDescriptor?.source.kind === 'image' || layerDescriptor?.source.kind === 'raster-tiles';

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-1 text-base font-semibold text-slate-50">{selectedSectorMeta?.name ?? 'Tot Bucurestiul'}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
          <span className={`h-2 w-2 rounded-full ${hasRenderableOverlay ? 'bg-emerald-400' : 'bg-amber-300'}`} />
          {selectedLayer.toUpperCase()} · {selectedYear}
        </div>
      </div>

      <div className="relative min-w-0">
        <div ref={containerRef} className="h-[440px] w-full sm:h-[520px]" role="application" tabIndex={0} aria-label="Harta interactiva a Bucurestiului. Foloseste sagetile pentru deplasare si tastele plus sau minus pentru zoom." />
        <svg ref={boundarySvgRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden" aria-hidden="true" />

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
            {boundariesLoading ? 'Se incarca limitele' : boundaries ? 'Contururi: limitele sectoarelor' : 'Doar harta de baza'}
          </div>
          {boundaries && selectedSector !== 'all' ? <div className="mt-1 text-slate-300">Contur alb: sectorul selectat</div> : null}
          <div className="mt-1 text-slate-400">Opacitatea stratului {opacity}%</div>
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
  if (loading) content = { icon: LoaderCircle, title: 'Se incarca stratul', detail: 'Se solicita informatiile stratului...' };
  else if (error) content = { icon: DatabaseZap, title: 'Serviciul de date nu este disponibil', detail: 'Harta de baza ramane vizibila. Incearca din nou cand API-ul functioneaza.' };
  else if (unavailable) content = { icon: AlertTriangle, title: 'Strat indisponibil', detail: 'Nu exista date pentru acest strat si acest an.' };
  else if (unsupported) content = { icon: AlertTriangle, title: 'Este necesara conversia GeoTIFF', detail: 'Pentru afisare in browser este nevoie de un raster web sau de tile-uri.' };
  else if (empty) content = { icon: MapIcon, title: demo ? 'Stratul demonstrativ asteapta date procesate' : 'Stratul de date nu este disponibil', detail: demo ? 'Date demonstrative; harta de baza ramane interactiva' : 'Pentru aceasta selectie nu este conectata o imagine raster valida.' };

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
