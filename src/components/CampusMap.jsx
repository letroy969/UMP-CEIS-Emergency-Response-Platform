import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { INC_TYPES, MBOMBELA_BUILDINGS, PRIORITY } from "../constants.js";
import { MAPPED_BUILDINGS } from "../maps/campusBuildings.js";
import { campusBoundary, checkCampusLocation, getCurrentLocation } from "../maps/location.js";

const CAMPUS_CENTER = [-25.4356, 30.9821];
const hasGps = (incident) => incident?.lat !== null && incident?.lat !== undefined && incident?.lat !== ""
  && incident?.lng !== null && incident?.lng !== undefined && incident?.lng !== ""
  && Number.isFinite(Number(incident.lat)) && Number.isFinite(Number(incident.lng))
  && Math.abs(Number(incident.lat)) <= 90 && Math.abs(Number(incident.lng)) <= 180;

function createMarkerIcon(label, color, extraClass = "") {
  return L.divIcon({
    className: "ceis-map-marker-wrap",
    html: `<span class="ceis-map-marker ${extraClass}" style="--marker-color:${color}"><b>${label}</b></span>`,
    iconSize: [30, 36],
    iconAnchor: [15, 30],
    popupAnchor: [0, -29],
  });
}

const incidentIcon = (incident) => createMarkerIcon("!", PRIORITY[incident.priority]?.color || "#B83018", "ceis-incident-marker");
const userIcon = createMarkerIcon("●", "#1769D2", "ceis-user-marker");

function MapViewport({ selectedPoint, location }) {
  const map = useMap();
  const selectedLat = selectedPoint?.lat;
  const selectedLng = selectedPoint?.lng;
  const locationLat = location?.latitude;
  const locationLng = location?.longitude;

  useEffect(() => {
    if (Number.isFinite(selectedLat) && Number.isFinite(selectedLng)) map.flyTo([selectedLat, selectedLng], Math.max(map.getZoom(), 17), { duration: 0.6 });
  }, [map, selectedLat, selectedLng]);

  useEffect(() => {
    if (Number.isFinite(locationLat) && Number.isFinite(locationLng)) map.flyTo([locationLat, locationLng], Math.max(map.getZoom(), 17), { duration: 0.7 });
  }, [map, locationLat, locationLng]);

  return null;
}

function MapPinSetter({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        accuracyMeters: null,
        capturedAt: new Date().toISOString(),
        source: "map-pin",
      });
    },
  });
  return null;
}

function getLocationLabel(location) {
  if (!location) return "No location selected";
  const status = checkCampusLocation(location);
  const accuracy = Number.isFinite(location.accuracyMeters)
    ? ` · ±${Math.round(location.accuracyMeters)} m`
    : " · map pin";
  const label = {
    inside: "Inside mapped campus boundary",
    outside: "Outside mapped campus boundary",
    uncertain: "GPS accuracy too low to verify campus boundary",
    unverified: "Location selected; GPS accuracy unavailable",
    unknown: "Location could not be verified",
  }[status];
  return `${label}${accuracy}`;
}

export default function CampusMap({
  incidents = [],
  selectedBuilding,
  onBuildingClick,
  compact = false,
  location = null,
  onLocationChange,
  allowLocationSelection = false,
}) {
  const [mapLocation, setMapLocation] = useState(location);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [osmError, setOsmError] = useState(false);

  useEffect(() => setMapLocation(location), [location]);

  const buildingPoints = useMemo(() => MAPPED_BUILDINGS.map((mapped) => ({
    ...mapped,
    building: MBOMBELA_BUILDINGS.find((building) => building.id === mapped.id),
  })), []);

  const activeIncidents = incidents.filter((incident) => !["RESOLVED", "CLOSED"].includes(incident.status));
  const activeIncidentCount = activeIncidents.length;
  const unlocatedIncidentCount = activeIncidents.filter((incident) => !hasGps(incident)).length;

  async function locateMe() {
    setLocating(true);
    setLocationError("");
    try {
      const current = await getCurrentLocation();
      setMapLocation(current);
      onLocationChange?.(current);
    } catch (error) {
      setLocationError(error.message);
    } finally {
      setLocating(false);
    }
  }

  function selectMapPoint(nextLocation) {
    setMapLocation(nextLocation);
    onLocationChange?.(nextLocation);
  }

  return (
    <div className={`ceis-campus-map${compact ? " is-compact" : ""}`}>
      <div className="ceis-map-toolbar">
        <div className="ceis-map-status">
          <span className="ceis-map-status-dot" />
          <span>{activeIncidentCount} active incident{activeIncidentCount === 1 ? "" : "s"}</span>
        </div>
        <button className="ceis-map-locate" type="button" onClick={locateMe} disabled={locating}>
          {locating ? "Finding location…" : "Use my location"}
        </button>
      </div>

      {locationError && <p className="ceis-map-message is-error" role="status">{locationError}</p>}
      {mapLocation && <p className="ceis-map-message" role="status">{getLocationLabel(mapLocation)}</p>}
      {osmError && <p className="ceis-map-message is-error" role="status">Map tiles could not load. Check your internet connection.</p>}

      <MapContainer
        className="ceis-leaflet-map"
        center={CAMPUS_CENTER}
        zoom={compact ? 15 : 15.5}
        scrollWheelZoom={!compact}
        zoomControl={!compact}
        attributionControl
        style={{ height: compact ? 240 : 470, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setOsmError(true) }}
        />
        <GeoJSON
          data={campusBoundary}
          style={{ color: "#244BC0", weight: 2, opacity: 0.85, fillColor: "#5479D1", fillOpacity: 0.1, dashArray: "7 5" }}
        />
        {buildingPoints.map(({ id, name, osmName, lat, lng, building }) => (
          <Marker
            key={`building-${id}`}
            position={[lat, lng]}
            icon={createMarkerIcon(id, id === selectedBuilding ? "#D4960E" : "#244BC0", "ceis-building-marker")}
            eventHandlers={{ click: () => onBuildingClick?.(building || { id, name }) }}
          >
            <Popup>
              <strong>Building {id} · {name}</strong><br />
              <span>OpenStreetMap: {osmName}</span>
            </Popup>
          </Marker>
        ))}
        {activeIncidents.filter(hasGps).map((incident) => (
          <Marker key={incident.id} position={[Number(incident.lat), Number(incident.lng)]} icon={incidentIcon(incident)}>
            <Popup>
              <strong>{INC_TYPES[incident.type]?.label || "Incident"} · {incident.priority}</strong><br />
              {incident.loc || `Building ${incident.building}`}<br />
              {incident.desc}
            </Popup>
          </Marker>
        ))}
        {mapLocation && (
          <Marker position={[mapLocation.latitude, mapLocation.longitude]} icon={userIcon}>
            <Popup><strong>Your selected location</strong><br />{getLocationLabel(mapLocation)}</Popup>
          </Marker>
        )}
        {allowLocationSelection && <MapPinSetter onSelect={selectMapPoint} />}
        <MapViewport
          selectedPoint={buildingPoints.find((building) => building.id === selectedBuilding)}
          location={mapLocation}
        />
      </MapContainer>

      <div className="ceis-map-legend">
        <span><i className="is-building" /> Mapped buildings ({MAPPED_BUILDINGS.length})</span>
        <span><i className="is-incident" /> Active incidents with GPS ({activeIncidents.filter(hasGps).length})</span>
        <span><i className="is-boundary" /> Campus boundary</span>
      </div>
      {unlocatedIncidentCount > 0 && (
        <p className="ceis-map-note">{unlocatedIncidentCount} incident{unlocatedIncidentCount === 1 ? " has" : "s have"} no GPS coordinates yet and {unlocatedIncidentCount === 1 ? "is" : "are"} listed without a map pin.</p>
      )}
    </div>
  );
}
