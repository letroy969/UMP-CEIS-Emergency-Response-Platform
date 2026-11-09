import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PRIORITY } from "../../constants.js";
import { navigationTarget } from "../../maps/navigation.js";

const CAMPUS_CENTER = [-25.4356, 30.9821];

function markerIcon(label, color, extraClass = "") {
  return L.divIcon({
    className: "ceis-map-marker-wrap",
    html: `<span class="ceis-map-marker ${extraClass}" style="--marker-color:${color}"><b>${label}</b></span>`,
    iconSize: [30, 36],
    iconAnchor: [15, 30],
    popupAnchor: [0, -29],
  });
}

const meIcon = markerIcon("●", "#1769D2", "ceis-user-marker");

// Keeps the responder and the selected incident in view as either moves.
function FitView({ me, target }) {
  const map = useMap();
  const meKey = me ? `${me.lat.toFixed(4)},${me.lng.toFixed(4)}` : "";
  const targetKey = target ? `${target.lat},${target.lng}` : "";
  useEffect(() => {
    if (me && target) {
      map.fitBounds(L.latLngBounds([me.lat, me.lng], [target.lat, target.lng]), { padding: [48, 48], maxZoom: 18 });
    } else if (target) {
      map.setView([target.lat, target.lng], Math.max(map.getZoom(), 17));
    } else if (me) {
      map.setView([me.lat, me.lng], Math.max(map.getZoom(), 16));
    }
    // Re-fit only when the rounded positions change, not on every GPS jitter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, meKey, targetKey]);
  return null;
}

export default function ResponderMap({ incidents, selectedId, onSelect, position, height = 420 }) {
  const points = useMemo(() => incidents
    .map(incident => ({ incident, target: navigationTarget(incident) }))
    .filter(item => item.target), [incidents]);
  const selected = points.find(item => item.incident.id === selectedId) || null;
  const me = position ? { lat: position.lat, lng: position.lng } : null;

  return (
    <div style={{ height, borderRadius: 10, overflow: "hidden", border: "1px solid #D9DEE8" }}>
      <MapContainer center={CAMPUS_CENTER} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitView me={me} target={selected?.target || null} />
        {me && (
          <>
            {Number.isFinite(position.accuracyMeters) && position.accuracyMeters > 5 && (
              <Circle center={[me.lat, me.lng]} radius={position.accuracyMeters} pathOptions={{ color: "#1769D2", weight: 1, fillOpacity: 0.08 }} />
            )}
            <Marker position={[me.lat, me.lng]} icon={meIcon} zIndexOffset={1000}>
              <Popup>You are here{Number.isFinite(position.accuracyMeters) ? ` (±${Math.round(position.accuracyMeters)} m)` : ""}</Popup>
            </Marker>
          </>
        )}
        {points.map(({ incident, target }) => {
          const color = incident.isSOS ? "#B83018" : PRIORITY[incident.priority]?.color || "#B83018";
          const isSelected = incident.id === selectedId;
          return (
            <Marker
              key={incident.id}
              position={[target.lat, target.lng]}
              icon={markerIcon(incident.isSOS ? "SOS" : "!", color, `ceis-incident-marker${isSelected ? " ceis-incident-marker--selected" : ""}`)}
              eventHandlers={{ click: () => onSelect?.(incident.id) }}
              zIndexOffset={isSelected ? 900 : 0}
            >
              <Popup>
                <strong>{incident.reference || incident.id}</strong><br />
                {incident.isSOS ? "SOS alert" : incident.priority} · {target.label}
                {target.source === "building" && <><br /><em>Building location (no GPS in report)</em></>}
              </Popup>
            </Marker>
          );
        })}
        {selected?.target.accuracyMeters > 5 && (
          <Circle center={[selected.target.lat, selected.target.lng]} radius={selected.target.accuracyMeters} pathOptions={{ color: "#B83018", weight: 1, dashArray: "4 4", fillOpacity: 0.06 }} />
        )}
        {me && selected && (
          <Polyline positions={[[me.lat, me.lng], [selected.target.lat, selected.target.lng]]} pathOptions={{ color: "#1769D2", weight: 4, opacity: 0.8, dashArray: "8 8" }} />
        )}
      </MapContainer>
    </div>
  );
}
