import test from "node:test";
import assert from "node:assert/strict";
import {
  bearingDegrees,
  compassLabel,
  directionsLinks,
  distanceMeters,
  etaMinutes,
  formatDistance,
  navigationSummary,
  navigationTarget,
} from "./navigation.js";

const ict = { lat: -25.4355976, lng: 30.9823063 };
const hotel = { lat: -25.4367101, lng: 30.985818 };

test("distance between two campus buildings matches a known value", () => {
  const meters = distanceMeters(ict, hotel);
  assert.ok(meters > 360 && meters < 380, `got ${meters}`); // ~372 m
  assert.equal(distanceMeters(ict, ict), 0);
});

test("bearings point the right way", () => {
  assert.ok(Math.abs(bearingDegrees({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }) - 0) < 0.01); // north
  assert.ok(Math.abs(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 90) < 0.01); // east
  assert.ok(Math.abs(bearingDegrees({ lat: 0, lng: 0 }, { lat: -1, lng: 0 }) - 180) < 0.01); // south
  const toHotel = bearingDegrees(ict, hotel);
  assert.ok(toHotel > 100 && toHotel < 115, `got ${toHotel}`); // east-south-east
});

test("compass labels cover all eight directions and wrap at 360°", () => {
  assert.equal(compassLabel(0), "north");
  assert.equal(compassLabel(44), "north-east");
  assert.equal(compassLabel(90), "east");
  assert.equal(compassLabel(200), "south");
  assert.equal(compassLabel(359), "north");
  assert.equal(compassLabel(-90), "west");
});

test("distances and ETAs format for humans", () => {
  assert.equal(formatDistance(3), "5 m");
  assert.equal(formatDistance(372), "370 m");
  assert.equal(formatDistance(1520), "1.5 km");
  assert.equal(formatDistance(23400), "23 km");
  assert.equal(etaMinutes(372), 5);
  assert.equal(etaMinutes(10), 1);
  assert.equal(etaMinutes(5000, "driving"), 10);
});

test("navigation prefers the reporter's GPS fix, then the building, then nothing", () => {
  assert.deepEqual(navigationTarget({ lat: -25.43, lng: 30.98, accuracy: 12, buildingName: null }), {
    lat: -25.43, lng: 30.98, source: "gps", accuracyMeters: 12, label: "Reported GPS location",
  });
  const building = navigationTarget({ lat: null, lng: null, building: "3" });
  assert.equal(building.source, "building");
  assert.equal(building.label, "ICT Building");
  assert.equal(navigationTarget({ lat: null, lng: null, building: "999" }), null);
  assert.equal(navigationTarget({ lat: "x", lng: 30, building: "0" }), null);
});

test("summary reports distance, direction and arrival", () => {
  const far = navigationSummary({ ...ict, accuracyMeters: 8 }, { ...hotel, accuracyMeters: null });
  assert.equal(far.direction, "east");
  assert.equal(far.arrived, false);
  assert.equal(far.walkMinutes, 5);
  const near = navigationSummary({ lat: hotel.lat + 0.0001, lng: hotel.lng, accuracyMeters: 10 }, { ...hotel, accuracyMeters: 15 });
  assert.equal(near.arrived, true); // ~11 m away
  assert.equal(navigationSummary(null, hotel), null);
});

test("directions links target the destination", () => {
  const links = directionsLinks(hotel);
  assert.match(links.google, /destination=-25\.4367101,30\.985818&travelmode=walking$/);
  assert.match(links.waze, /ll=-25\.4367101,30\.985818&navigate=yes$/);
});
