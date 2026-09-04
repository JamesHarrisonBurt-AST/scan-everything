import * as THREE from 'three';

export const STORAGE_KEY = 'curio_ar_markers';
export const PLACE_DISTANCE = 3;

export const RARITY_COLORS = {
  common: 0x999999,
  interesting: 0x2dd4bf,
  unusual: 0xc084fc,
  exceptional: 0xfbbf24,
};

export function loadSavedMarkers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveMarkersToStorage(markers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  } catch { /* ignore */ }
}

export function createMarkerMesh(marker, discovery) {
  const color = RARITY_COLORS[discovery.rarity] || RARITY_COLORS.common;
  const group = new THREE.Group();
  group.userData.markerId = marker.id;
  group.userData.discoveryId = marker.discoveryId;
  group.position.set(marker.position.x, marker.position.y, marker.position.z);
  group.userData.baseY = marker.position.y;

  // Gem (octahedron)
  const gemGeo = new THREE.OctahedronGeometry(0.12, 0);
  const gemMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.5,
    metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.92,
  });
  group.add(new THREE.Mesh(gemGeo, gemMat));

  // Inner glow sphere
  const glowGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  // Ring/halo
  const ringGeo = new THREE.TorusGeometry(0.2, 0.01, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  group.userData.ring = ring;

  // Pin stem
  const pinGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.15, 8);
  const pinMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.y = -0.15;
  group.add(pin);

  // Invisible hitbox for easier selection (larger than the gem)
  const hitboxGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const hitboxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
  hitbox.userData.markerId = marker.id;
  group.add(hitbox);

  return group;
}

export function disposeMarkerMesh(group) {
  group.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
}

export function clusterMarkers(markers, threshold = 2.5) {
  if (markers.length === 0) return [];
  const clusters = [];
  const assigned = new Set();
  for (const marker of markers) {
    if (assigned.has(marker.id)) continue;
    const cluster = [marker];
    assigned.add(marker.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of markers) {
        if (assigned.has(other.id)) continue;
        for (const cm of cluster) {
          const dx = cm.position.x - other.position.x;
          const dz = cm.position.z - other.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < threshold) {
            cluster.push(other);
            assigned.add(other.id);
            changed = true;
            break;
          }
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export function getZoneLabel(centroid) {
  const x = centroid.x;
  const z = centroid.z;
  const dist = Math.sqrt(x * x + z * z);
  if (dist < 1.5) return 'Center';
  const isFront = z < -0.5;
  const isBack = z > 0.5;
  const isLeft = x < -0.5;
  const isRight = x > 0.5;
  const parts = [];
  if (isFront) parts.push('Front');
  else if (isBack) parts.push('Back');
  if (isLeft) parts.push('Left');
  else if (isRight) parts.push('Right');
  return parts.length > 0 ? parts.join('-') + ' Zone' : 'Side Zone';
}