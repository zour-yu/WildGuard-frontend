/**
 * WildlifeReserveMap.tsx - Clean, Minimalist & Intuitive Wildlife Operations Map Engine
 * 
 * Key Design Refinements:
 * 1. Clutter-Free Aesthetics: Eliminates permanent overlapping text badges. Detailed info appears smoothly on hover/click.
 * 2. Realistic Boundary Advisory:
 *    - Elephants near agricultural buffer zones display a calm, warm amber pulse and neat status chip.
 *    - Monitored farmland buffer polygon features a subtle, translucent boundary outline.
 *    - Sleek, unobtrusive top advisory notice with 1-click ranger patrol assignment.
 * 3. Compact Single-Row HUD: Unified header with compact Sector Selector dropdown and Satellite/Canvas mode toggle.
 * 4. Minimalist Tactical Cartography: Soft translucent sector backdrops, 100% free of external tile watermarks.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Layers,
  MapPin,
  Send,
  Eye,
  AlertTriangle,
  Crosshair,
  Skull,
  Flame,
  Shield,
  RotateCcw,
  Navigation,
  Compass,
  Zap,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { CollarTelemetryData, GeofenceZoneData, RangerData } from '../../types/telemetry';
import { Incident } from '../../types/incident';
import { ConflictReport } from '../../types/conflict';
import { calculateDistanceMeters } from '../../utils/geoUtils';

export interface WildlifeReserveMapProps {
  telemetryList?: CollarTelemetryData[];
  geofenceZones?: GeofenceZoneData[];
  rangers?: RangerData[];
  incidents?: Incident[];
  conflicts?: ConflictReport[];
  selectedIncidentId?: string | null;
  selectedConflictId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  onDispatchIncident?: (incident: Incident) => void;
  onSelectConflict?: (conflict: ConflictReport) => void;
  onDispatchConflict?: (conflict: ConflictReport) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

// Sanctuary Center & Strict Bounding Limits (Galwala Sanctuary, Sri Lanka)
const SANCTUARY_CENTER: [number, number] = [6.837, 80.988];
const SANCTUARY_BOUNDS: L.LatLngBoundsLiteral = [
  [6.808, 80.955],
  [6.866, 81.020],
];

// 100% Free Satellite Imagery (Zero Watermarks)
const ESRI_SATELLITE_LAYER = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri World Imagery &mdash; Galwala Reserve Aerial Feed',
  maxZoom: 19,
};

// 6 CONTIGUOUS OPERATIONAL SECTORS (Covering 100% of the 45.2 km² Reserve)
export const CONTIGUOUS_SECTORS = [
  {
    id: 's1',
    code: 'SEC-01',
    name: 'Northern Ridge Highlands',
    shortName: 'Sector 1: Northern Ridge',
    color: '#10b981', // Emerald
    riskLevel: 'LOW_RISK',
    areaKm2: 8.4,
    center: [6.854, 80.974] as [number, number],
    coordinates: [
      [6.846, 80.960],
      [6.846, 80.988],
      [6.862, 80.988],
      [6.862, 80.960],
    ],
    description: 'Elevated rocky terrain, northern observation watchtower & natural wilderness ridge.',
  },
  {
    id: 's2',
    code: 'SEC-02',
    name: 'Handapanagala Reservoir Basin',
    shortName: 'Sector 2: Reservoir Basin',
    color: '#06b6d4', // Cyan
    riskLevel: 'MEDIUM_RISK',
    areaKm2: 9.6,
    center: [6.852, 81.002] as [number, number],
    coordinates: [
      [6.844, 80.988],
      [6.844, 81.016],
      [6.862, 81.016],
      [6.862, 80.988],
    ],
    description: 'Freshwater lake, marshland reed beds & high-frequency elephant watering corridor.',
  },
  {
    id: 's3',
    code: 'SEC-03',
    name: 'Galwala Core Elephant Sanctuary',
    shortName: 'Sector 3: Core Reserve',
    color: '#059669', // Deep Green
    riskLevel: 'PROTECTED_CORE',
    areaKm2: 11.2,
    center: [6.836, 80.987] as [number, number],
    coordinates: [
      [6.828, 80.975],
      [6.828, 80.998],
      [6.844, 80.998],
      [6.846, 80.988],
      [6.846, 80.975],
    ],
    description: 'Strictly protected primary teak forest, elephant herd breeding zone & research collar core.',
  },
  {
    id: 's4',
    code: 'SEC-04',
    name: 'Farmland 8A & Solar Electric Fence',
    shortName: 'Sector 4: Farmland 8A Buffer',
    color: '#f97316', // Warm Amber/Coral
    riskLevel: 'AGRICULTURAL_BUFFER',
    areaKm2: 7.8,
    center: [6.820, 80.975] as [number, number],
    coordinates: [
      [6.812, 80.960],
      [6.812, 80.990],
      [6.828, 80.990],
      [6.828, 80.960],
    ],
    description: 'Solar electric boundary fence facing community paddy fields. Monitored buffer zone.',
  },
  {
    id: 's5',
    code: 'SEC-05',
    name: 'Western Community Settlement Buffer',
    shortName: 'Sector 5: West Buffer',
    color: '#f59e0b', // Amber
    riskLevel: 'BUFFER_ZONE',
    areaKm2: 4.8,
    center: [6.837, 80.967] as [number, number],
    coordinates: [
      [6.828, 80.960],
      [6.828, 80.975],
      [6.846, 80.975],
      [6.846, 80.960],
    ],
    description: 'Transition buffer zone bordering local village settlements and agrarian outskirts.',
  },
  {
    id: 's6',
    code: 'SEC-06',
    name: 'Eastern Wildlife Transit Corridor',
    shortName: 'Sector 6: East Corridor',
    color: '#8b5cf6', // Purple
    riskLevel: 'MIGRATION_ROUTE',
    areaKm2: 6.2,
    center: [6.828, 81.004] as [number, number],
    coordinates: [
      [6.812, 80.990],
      [6.812, 81.016],
      [6.844, 81.016],
      [6.828, 80.990],
    ],
    description: 'Open wilderness migration path connecting to adjacent Gal Oya National Park ecosystem.',
  },
];

// Tactical Infrastructure & Landmarks
const PARK_INFRASTRUCTURE = {
  outposts: [
    { name: 'Park Headquarters Command Post (HQ)', coords: [6.836, 80.966] as [number, number], type: 'HQ' },
    { name: 'North Ridge Watchtower (Obs-1)', coords: [6.858, 80.972] as [number, number], type: 'TOWER' },
    { name: 'Reservoir Ranger Station (Obs-2)', coords: [6.850, 81.008] as [number, number], type: 'STATION' },
    { name: 'Solar Fence Gate 8A Checkpoint', coords: [6.815, 80.976] as [number, number], type: 'GATE' },
  ],
  waterBodies: [
    {
      name: 'Handapanagala Reservoir Basin',
      coords: [
        [6.848, 80.994],
        [6.854, 81.008],
        [6.846, 81.013],
        [6.840, 81.001],
      ],
    },
  ],
  electricFence: [
    [6.812, 80.960],
    [6.812, 80.990],
    [6.812, 81.016],
  ],
  patrolTracks: [
    [
      [6.815, 80.966],
      [6.835, 80.980],
      [6.848, 80.992],
      [6.858, 80.975],
    ],
    [
      [6.835, 80.980],
      [6.848, 81.008],
      [6.858, 81.012],
    ],
  ],
};

export const WildlifeReserveMap: React.FC<WildlifeReserveMapProps> = ({
  telemetryList = [],
  geofenceZones = [],
  rangers = [],
  incidents = [],
  conflicts = [],
  selectedIncidentId,
  selectedConflictId,
  onSelectIncident,
  onDispatchIncident,
  onSelectConflict,
  onDispatchConflict,
  height = '500px',
  center = SANCTUARY_CENTER,
  zoom = 14,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const sectorsGroupRef = useRef<L.LayerGroup | null>(null);
  const infrastructureGroupRef = useRef<L.LayerGroup | null>(null);
  const breadcrumbGroupRef = useRef<L.LayerGroup | null>(null);
  const telemetryGroupRef = useRef<L.LayerGroup | null>(null);
  const incidentsGroupRef = useRef<L.LayerGroup | null>(null);
  const conflictsGroupRef = useRef<L.LayerGroup | null>(null);
  const rangersGroupRef = useRef<L.LayerGroup | null>(null);

  // Trajectory history
  const trajectoryHistoryRef = useRef<Map<string, [number, number][]>>(new Map());

  const [mapMode, setMapMode] = useState<'schematic' | 'satellite'>('schematic');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [showSectors, setShowSectors] = useState<boolean>(true);
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);
  const [showAnimals, setShowAnimals] = useState<boolean>(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(false); // Default off for neatness
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showConflicts, setShowConflicts] = useState<boolean>(true);
  const [showRangers, setShowRangers] = useState<boolean>(true);
  const [cursorCoords, setCursorCoords] = useState<[number, number]>(SANCTUARY_CENTER);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: SANCTUARY_CENTER,
        zoom: 14,
        minZoom: 13,
        maxZoom: 18,
        maxBounds: SANCTUARY_BOUNDS,
        maxBoundsViscosity: 1.0,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initialize layer groups
      sectorsGroupRef.current = L.layerGroup().addTo(map);
      infrastructureGroupRef.current = L.layerGroup().addTo(map);
      breadcrumbGroupRef.current = L.layerGroup().addTo(map);
      telemetryGroupRef.current = L.layerGroup().addTo(map);
      incidentsGroupRef.current = L.layerGroup().addTo(map);
      conflictsGroupRef.current = L.layerGroup().addTo(map);
      rangersGroupRef.current = L.layerGroup().addTo(map);

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorCoords([
          Number(e.latlng.lat.toFixed(4)),
          Number(e.latlng.lng.toFixed(4)),
        ]);
      });

      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      const handleResize = () => map.invalidateSize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Tile mode switcher
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (mapMode === 'satellite') {
      tileLayerRef.current = L.tileLayer(ESRI_SATELLITE_LAYER.url, {
        attribution: ESRI_SATELLITE_LAYER.attribution,
        maxZoom: ESRI_SATELLITE_LAYER.maxZoom,
      }).addTo(mapInstanceRef.current);
    }
  }, [mapMode]);

  // Check if any animal is currently near or in a buffer zone
  const activeBreachingAnimal = useMemo(() => {
    return telemetryList.find((a) => a.isBreaching) || null;
  }, [telemetryList]);

  // 3. Render Minimalist Subtle Sectors + Master Boundary
  useEffect(() => {
    if (!mapInstanceRef.current || !sectorsGroupRef.current) return;
    sectorsGroupRef.current.clearLayers();

    if (!showSectors) return;

    // A. Master Sanctuary Outer Boundary
    const masterBoundaryCoords = [
      [6.812, 80.960],
      [6.812, 81.016],
      [6.862, 81.016],
      [6.862, 80.960],
    ];

    const masterPolygon = L.polygon(masterBoundaryCoords as any, {
      color: '#10b981',
      weight: 2,
      fill: false,
      dashArray: '6, 6',
      opacity: 0.8,
    });
    sectorsGroupRef.current.addLayer(masterPolygon);

    // B. Subtle Sector Outlines (Clean, uncluttered, no large static labels)
    CONTIGUOUS_SECTORS.forEach((sec) => {
      const isSelected = selectedSector === sec.id;
      const isBreached = activeBreachingAnimal && (sec.id === 's4' || sec.riskLevel === 'AGRICULTURAL_BUFFER' || sec.riskLevel === 'CRITICAL_HOTSPOT');

      const polygon = L.polygon(sec.coordinates as any, {
        color: isBreached ? '#f97316' : isSelected ? sec.color : '#64748b',
        weight: isBreached ? 2.5 : isSelected ? 2.5 : 1,
        fillColor: isBreached ? '#f97316' : sec.color,
        fillOpacity: isBreached ? 0.14 : isSelected ? 0.22 : 0.06,
        dashArray: isBreached ? '4, 4' : undefined,
      });

      polygon.on('click', () => handleSectorSelect(sec.id));

      polygon.bindTooltip(
        `<div class="font-sans p-1 text-slate-800 text-xs">
          <strong style="color: ${sec.color}">${sec.shortName}</strong>
          <span class="block text-[10px] text-slate-500 font-mono">${sec.areaKm2} km² • ${sec.riskLevel.replace('_', ' ')}</span>
        </div>`,
        { sticky: true }
      );

      sectorsGroupRef.current?.addLayer(polygon);
    });
  }, [showSectors, selectedSector, activeBreachingAnimal]);

  // 4. Render Tactical Infrastructure (Reservoir & Solar Fence)
  useEffect(() => {
    if (!mapInstanceRef.current || !infrastructureGroupRef.current) return;
    infrastructureGroupRef.current.clearLayers();

    if (!showInfrastructure) return;

    // A. Handapanagala Reservoir
    PARK_INFRASTRUCTURE.waterBodies.forEach((lake) => {
      const waterPoly = L.polygon(lake.coords as any, {
        color: '#0284c7',
        fillColor: '#0ea5e9',
        fillOpacity: 0.35,
        weight: 1.5,
      });
      waterPoly.bindTooltip(
        `<div class="font-sans font-bold text-xs text-sky-600 p-1">💧 ${lake.name}</div>`,
        { sticky: true }
      );
      infrastructureGroupRef.current?.addLayer(waterPoly);
    });

    // B. Solar Electric Barrier Line (Warm amber technical styling)
    const fenceLine = L.polyline(PARK_INFRASTRUCTURE.electricFence as any, {
      color: '#f59e0b',
      weight: 2,
      dashArray: '5, 5',
      opacity: 0.85,
    });
    fenceLine.bindTooltip(
      `<div class="font-sans font-bold text-xs text-amber-600 p-1">⚡ Solar Electric Fence (Grid 8A)</div>`,
      { sticky: true }
    );
    infrastructureGroupRef.current?.addLayer(fenceLine);

    // C. Patrol Outposts (Clean minimalist icons)
    PARK_INFRASTRUCTURE.outposts.forEach((post) => {
      const postIconHtml = `
        <div class="w-5 h-5 rounded-md bg-slate-900/90 border border-slate-600 text-amber-400 flex items-center justify-center text-[10px] shadow cursor-pointer">
          ${post.type === 'HQ' ? '🏢' : post.type === 'TOWER' ? '🗼' : '🛖'}
        </div>
      `;
      const icon = L.divIcon({
        html: postIconHtml,
        className: 'custom-outpost-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker(post.coords, { icon });
      marker.bindTooltip(
        `<div class="font-sans p-1 text-xs text-slate-800 font-bold">${post.name}</div>`,
        { sticky: true }
      );
      infrastructureGroupRef.current?.addLayer(marker);
    });
  }, [showInfrastructure]);

  // 5. Render Live Animals with Calm & Clear Boundary Highlighting
  useEffect(() => {
    if (!mapInstanceRef.current || !telemetryGroupRef.current || !breadcrumbGroupRef.current) return;
    telemetryGroupRef.current.clearLayers();
    breadcrumbGroupRef.current.clearLayers();

    if (!showAnimals) return;

    telemetryList.forEach((animal) => {
      const isBreaching = animal.isBreaching;
      const speed = animal.speedKmh || 4.2;

      // Trajectory breadcrumbs
      const history = trajectoryHistoryRef.current.get(animal.collarId) || [];
      const lastPoint = history[history.length - 1];
      if (!lastPoint || lastPoint[0] !== animal.location[0] || lastPoint[1] !== animal.location[1]) {
        const updated = [...history, animal.location];
        if (updated.length > 8) updated.shift();
        trajectoryHistoryRef.current.set(animal.collarId, updated);
      }

      const currentHistory = trajectoryHistoryRef.current.get(animal.collarId) || [animal.location];

      if (showBreadcrumbs && currentHistory.length > 1) {
        const polyline = L.polyline(currentHistory, {
          color: isBreaching ? '#f59e0b' : '#10b981',
          weight: 2,
          opacity: 0.6,
          dashArray: '3, 4',
        });
        breadcrumbGroupRef.current?.addLayer(polyline);
      }

      // Dynamic Animal Marker: Calm, graceful pulse on buffer advisory
      const animalHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isBreaching
              ? `
                <!-- Gentle Amber Advisory Pulse Halo -->
                <span class="animate-pulse absolute -inset-1.5 rounded-full bg-amber-400/30"></span>
                
                <!-- Floating Clean Boundary Notice Chip -->
                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 border border-amber-500/50 text-amber-300 font-bold text-[8px] px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap flex items-center gap-1">
                  <span>🌾 Buffer Notice</span>
                </div>
              `
              : ''
          }

          <!-- Core Avatar Pin -->
          <div class="w-8 h-8 rounded-full ${
            isBreaching
              ? 'bg-amber-600 ring-2 ring-white shadow-lg'
              : 'bg-emerald-600 ring-2 ring-white shadow-md'
          } text-white flex items-center justify-center font-bold text-xs transition-transform group-hover:scale-125">
            🐘
          </div>

          <!-- Minimal Hover Info Pill -->
          <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap border border-slate-700 hidden group-hover:flex items-center gap-1">
            <span>${animal.animalName}</span>
            <span class="text-emerald-400 font-mono">(${speed} km/h)</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: animalHtml,
        className: 'custom-animal-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([animal.location[0], animal.location[1]], { icon });

      // Rich Inspector Popup on Click
      marker.bindPopup(
        `<div class="font-sans p-2 text-slate-800 space-y-2 min-w-[210px]">
          <div class="flex items-center justify-between border-b pb-1">
            <span class="font-black text-xs text-slate-900">${animal.animalName}</span>
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
              isBreaching ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
            }">
              ${isBreaching ? '🌾 NEAR BUFFER' : 'NORMAL BUFFER'}
            </span>
          </div>
          <p class="text-[11px] text-slate-600">Species: <strong>${animal.species || 'Asian Elephant'}</strong></p>
          <p class="text-[11px] text-slate-600">Collar ID: <code class="bg-slate-100 px-1 py-0.5 rounded">${animal.collarId}</code></p>
          <div class="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t">
            <span>Battery: <strong class="text-emerald-600">${animal.batteryLevel}%</strong></span>
            <span>Speed: <strong>${speed} km/h</strong></span>
          </div>
          ${
            isBreaching
              ? `<div class="p-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] rounded font-medium">
                  🌾 Telemetry shows animal approaching Farmland 8A boundary. Patrol advisory logged.
                </div>`
              : ''
          }
        </div>`
      );

      telemetryGroupRef.current?.addLayer(marker);
    });
  }, [telemetryList, showAnimals, showBreadcrumbs]);

  // 6. Render Minimalist Incident Pins - Clean icons, no clutter
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentsGroupRef.current) return;
    incidentsGroupRef.current.clearLayers();

    if (!showIncidents) return;

    incidents.forEach((inc) => {
      const isSelected = selectedIncidentId === inc.id;
      const isResolved = inc.status === 'RESOLVED';
      const isDispatched = inc.status === 'DISPATCHED';

      const iconEmoji =
        inc.type === 'SNARE'
          ? '🪤'
          : inc.type === 'CARCASS'
          ? '💀'
          : inc.type === 'ILLEGAL_CAMPSITE'
          ? '⛺'
          : '⚠️';

      const bgClass = isResolved
        ? 'bg-emerald-600'
        : isDispatched
        ? 'bg-blue-600'
        : inc.type === 'SNARE'
        ? 'bg-red-600'
        : inc.type === 'CARCASS'
        ? 'bg-amber-600'
        : 'bg-orange-600';

      const incidentHtml = `
        <div class="relative flex items-center justify-center group cursor-pointer">
          ${
            !isResolved && inc.type === 'SNARE'
              ? `<span class="animate-pulse absolute -inset-1 rounded-full bg-red-400/40"></span>`
              : ''
          }
          <div class="w-7 h-7 rounded-full ${bgClass} text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-md transition-transform group-hover:scale-125 ${
            isSelected ? 'scale-125 ring-4 ring-emerald-400' : ''
          }">
            ${iconEmoji}
          </div>
          <!-- Clean Hover Tooltip -->
          <div class="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap hidden group-hover:flex items-center gap-1 z-30">
            <span>${inc.type}</span>
            <span class="text-emerald-400 font-mono">(${inc.status})</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: incidentHtml,
        className: 'custom-incident-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([inc.coordinates[0], inc.coordinates[1]], { icon });

      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(inc);
      });

      // Rich popup on click
      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans p-2 text-slate-800 space-y-2 min-w-[210px] max-w-[260px]';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between border-b pb-1">
          <span class="font-black text-xs uppercase text-slate-900">${inc.type}</span>
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
            isResolved
              ? 'bg-emerald-100 text-emerald-800'
              : isDispatched
              ? 'bg-blue-100 text-blue-800'
              : 'bg-red-100 text-red-800'
          }">
            ${inc.status}
          </span>
        </div>

        ${
          inc.photoUrl
            ? `<div class="rounded-lg overflow-hidden border max-h-20"><img src="${inc.photoUrl}" class="w-full h-20 object-cover" /></div>`
            : ''
        }

        <p class="text-xs font-medium text-slate-700 leading-tight">${inc.description}</p>

        <div class="text-[10px] text-slate-500 font-mono bg-slate-50 p-1 rounded border">
          Coordinates: ${inc.coordinates[0].toFixed(4)}° N, ${inc.coordinates[1].toFixed(4)}° E
        </div>
      `;

      if (inc.status === 'RECORDED' && onDispatchIncident) {
        const btn = document.createElement('button');
        btn.className =
          'w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm mt-1 cursor-pointer';
        btn.innerHTML = '<span>Assign Ranger Patrol</span>';
        btn.onclick = () => onDispatchIncident(inc);
        popupContent.appendChild(btn);
      }

      marker.bindPopup(popupContent);
      incidentsGroupRef.current?.addLayer(marker);
    });
  }, [incidents, showIncidents, selectedIncidentId]);

  // 7. Render Clean Field Rangers - Sleek tactical dots
  useEffect(() => {
    if (!mapInstanceRef.current || !rangersGroupRef.current) return;
    rangersGroupRef.current.clearLayers();

    if (!showRangers) return;

    rangers.forEach((ranger) => {
      const rangerHtml = `
        <div class="relative flex items-center justify-center group cursor-pointer">
          <div class="w-6 h-6 rounded-full bg-blue-600 ring-2 ring-white text-white flex items-center justify-center text-[11px] shadow-md transition-transform group-hover:scale-125">
            👮
          </div>
          <!-- Clean Hover Tooltip -->
          <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-950 text-blue-200 text-[8px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap hidden group-hover:block">
            ${ranger.callsign} (${ranger.name.split(' ')[0]})
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: rangerHtml,
        className: 'custom-ranger-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([ranger.location[0], ranger.location[1]], { icon });

      marker.bindPopup(
        `<div class="font-sans p-2 text-slate-800 space-y-1">
          <p class="font-bold text-xs text-slate-900">${ranger.name}</p>
          <p class="text-[10px] text-slate-600">Callsign: <strong>${ranger.callsign}</strong></p>
          <p class="text-[10px] text-slate-600">Status: <span class="font-bold text-emerald-600">${ranger.status}</span></p>
          <p class="text-[10px] text-slate-500">Battery: <strong>${ranger.batteryLevel}%</strong></p>
        </div>`
      );

      rangersGroupRef.current?.addLayer(marker);
    });
  }, [rangers, showRangers]);

  // 8. Render Community Conflict Markers - Distinct Logo (📢 Megaphone / Alert Broadcast Emblem)
  useEffect(() => {
    if (!mapInstanceRef.current || !conflictsGroupRef.current) return;
    conflictsGroupRef.current.clearLayers();

    if (!showConflicts) return;

    const sectorFallbackSpots: [number, number][] = [
      [6.8224, 80.9742], // Sector 4: Farmland 8A Buffer
      [6.8378, 80.9658], // Sector 5: Western Settlement Buffer
      [6.8512, 80.9984], // Sector 2: Reservoir Basin
      [6.8182, 80.9815], // Sector 4 South
      [6.8290, 81.0040], // Sector 6: Eastern Transit Corridor
      [6.8550, 80.9750], // Sector 1: Northern Ridge
    ];

    conflicts.forEach((conflict, index) => {
      // Determine coordinates within sanctuary bounding box
      let lat = conflict.latitude;
      let lng = conflict.longitude;
      if (!lat || !lng || lat < 6.80 || lat > 6.87 || lng < 80.95 || lng > 81.03) {
        const fallback = sectorFallbackSpots[index % sectorFallbackSpots.length];
        lat = fallback[0];
        lng = fallback[1];
      }

      const isSelected = selectedConflictId === conflict._id;
      const isUnread = conflict.status === 'UNREAD';
      const isResolved = conflict.status === 'RESOLVED';
      const isHighPriority = conflict.priority === 'HIGH';

      // Distinct Logo: Megaphone Broadcast (📢) with Crimson/Rose Badge and Pulse Halo
      const conflictHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isUnread
              ? `
                <!-- Animated Alert Ping Halo for Active Unread Conflicts -->
                <span class="animate-ping absolute -inset-1.5 rounded-full bg-rose-500/40"></span>
                <span class="animate-pulse absolute -inset-2.5 rounded-full bg-amber-400/20"></span>

                <!-- Floating Alert Chip -->
                <div class="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-rose-950/95 border border-rose-500/70 text-rose-200 font-black text-[8px] px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap flex items-center gap-1 z-30">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                  <span>📢 ${conflict.source} ALERT</span>
                </div>
              `
              : ''
          }

          <!-- Core Conflict Pin: Distinct Rose/Crimson Pin with Megaphone Emblem -->
          <div class="w-8 h-8 rounded-full ${
            isResolved
              ? 'bg-emerald-600 ring-2 ring-white shadow-md'
              : isHighPriority
              ? 'bg-rose-600 ring-2 ring-white shadow-xl'
              : 'bg-amber-600 ring-2 ring-white shadow-lg'
          } text-white flex items-center justify-center font-bold text-xs transition-transform group-hover:scale-125 ${
            isSelected ? 'scale-125 ring-4 ring-rose-400' : ''
          }">
            📢
          </div>

          <!-- Clean Hover Tooltip -->
          <div class="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-slate-900/95 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap border border-slate-700 hidden group-hover:flex items-center gap-1 z-30">
            <span class="text-rose-400 font-bold">[${conflict.source}]</span>
            <span class="truncate max-w-[140px]">${conflict.location}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: conflictHtml,
        className: 'custom-conflict-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon });

      marker.on('click', () => {
        if (onSelectConflict) onSelectConflict(conflict);
      });

      // Rich Inspector Popup on Click
      const popupContent = document.createElement('div');
      popupContent.className = 'font-sans p-2 text-slate-800 space-y-2 min-w-[220px] max-w-[280px]';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between border-b pb-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xs">📢</span>
            <span class="font-black text-xs text-rose-700 uppercase tracking-wide">
              ${conflict.source === 'SMS' ? 'SMS Hotline Report' : 'Citizen App Alert'}
            </span>
          </div>
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
            isResolved
              ? 'bg-emerald-100 text-emerald-800'
              : isUnread
              ? 'bg-rose-100 text-rose-800'
              : 'bg-amber-100 text-amber-800'
          }">
            ${conflict.status}
          </span>
        </div>

        ${
          conflict.imageUrl
            ? `<div class="rounded-lg overflow-hidden border max-h-24"><img src="${conflict.imageUrl}" alt="Conflict evidence" class="w-full h-24 object-cover" /></div>`
            : ''
        }

        <p class="text-xs font-semibold text-slate-900 leading-snug">
          ${conflict.description}
        </p>

        <div class="space-y-1 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
          <div class="flex justify-between">
            <span class="text-slate-400">Reporter:</span>
            <strong class="text-slate-800">${conflict.reporter}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Location:</span>
            <span class="font-medium text-slate-700">${conflict.location}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Priority:</span>
            <strong class="${isHighPriority ? 'text-rose-600' : 'text-amber-600'}">${conflict.priority}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400">Time:</span>
            <span class="font-mono">${new Date(conflict.reportedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      `;

      if (conflict.status !== 'RESOLVED' && onDispatchConflict) {
        const btn = document.createElement('button');
        btn.className =
          'w-full py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm mt-1 cursor-pointer transition';
        btn.innerHTML = '<span>Assign Ranger Patrol</span>';
        btn.onclick = () => onDispatchConflict(conflict);
        popupContent.appendChild(btn);
      }

      marker.bindPopup(popupContent);
      conflictsGroupRef.current?.addLayer(marker);
    });
  }, [conflicts, showConflicts, selectedConflictId]);

  // Sector Selection Handler
  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
    if (!mapInstanceRef.current) return;

    if (sectorId === 'all') {
      mapInstanceRef.current.flyTo(SANCTUARY_CENTER, 14, { duration: 1.2 });
    } else {
      const sec = CONTIGUOUS_SECTORS.find((s) => s.id === sectorId);
      if (sec) {
        mapInstanceRef.current.flyTo(sec.center, 15.5, { duration: 1.2 });
      }
    }
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#080e1e] font-sans"
      style={{
        height,
        backgroundImage:
          mapMode === 'schematic'
            ? 'radial-gradient(#1e293b 1px, transparent 1px)'
            : undefined,
        backgroundSize: '28px 28px',
      }}
    >
      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* COMPACT SINGLE-ROW HEADER BAR */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Sanctuary Title Badge */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center space-x-2 text-xs text-white pointer-events-auto">
          <div className="w-6 h-6 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold block leading-tight text-xs">Galwala Sanctuary</span>
            <span className="text-[10px] font-mono text-emerald-400">
              {cursorCoords[0].toFixed(3)}° N, {cursorCoords[1].toFixed(3)}° E
            </span>
          </div>
        </div>

        {/* Center: Compact Sector Dropdown */}
        <div className="pointer-events-auto">
          <select
            value={selectedSector}
            onChange={(e) => handleSectorSelect(e.target.value)}
            className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 text-xs font-bold rounded-2xl px-3 py-2 shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">📍 All Sectors (Full Sanctuary)</option>
            {CONTIGUOUS_SECTORS.map((sec) => (
              <option key={sec.id} value={sec.id}>
                [{sec.code}] {sec.shortName}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Map Mode (Canvas / Satellite) & Camera Reset */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-2xl flex items-center text-xs">
            <button
              onClick={() => setMapMode('schematic')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition ${
                mapMode === 'schematic'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition ${
                mapMode === 'satellite'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          <button
            onClick={() => handleSectorSelect('all')}
            title="Reset to Full Sanctuary Overview"
            className="p-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white shadow-2xl transition hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ACTIVE BOUNDARY ADVISORY FLOATING CARD */}
      {activeBreachingAnimal && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 text-white text-xs font-medium px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-3 pointer-events-auto animate-in slide-in-from-top-2">
          <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-400 uppercase tracking-wider block text-[10px]">
                Boundary Advisory
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Sector 4</span>
            </div>
            <span className="text-xs text-slate-200">
              <strong>{activeBreachingAnimal.animalName}</strong> near Farmland 8A buffer
            </span>
          </div>
          {onDispatchIncident && (
            <button
              onClick={() => {
                const threat = incidents[0] || {
                  id: 'ALERT-BREACH-01',
                  type: 'SNARE',
                  coordinates: activeBreachingAnimal.location,
                  description: `${activeBreachingAnimal.animalName} near Farmland 8A buffer zone.`,
                  reporterName: 'Automated Boundary Advisory',
                  reporterId: 'SYS-GEOFENCE',
                  status: 'RECORDED',
                };
                onDispatchIncident(threat as any);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow transition shrink-0 cursor-pointer"
            >
              Assign Patrol
            </button>
          )}
        </div>
      )}

      {/* COMPACT FLOATING LAYER FILTER PILL (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 text-xs shadow-2xl pointer-events-auto">
        <button
          onClick={() => setShowSectors(!showSectors)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
            showSectors
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          🛡️ Sectors
        </button>

        <button
          onClick={() => setShowIncidents(!showIncidents)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
            showIncidents
              ? 'bg-amber-950/80 text-amber-300 border-amber-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          📋 Incidents ({incidents.length})
        </button>

        <button
          onClick={() => setShowAnimals(!showAnimals)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
            showAnimals
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          🐘 Collars ({telemetryList.length})
        </button>

        <button
          onClick={() => setShowRangers(!showRangers)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
            showRangers
              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
        >
          👮 Rangers ({rangers.length})
        </button>

        <button
          onClick={() => setShowConflicts(!showConflicts)}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition ${
            showConflicts
              ? 'bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title="Toggle Community Conflict Hotspots & SMS reports"
        >
          📢 Conflicts ({conflicts.length})
        </button>
      </div>
    </div>
  );
};

