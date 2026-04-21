"""Rasterize a world-atlas TopoJSON land silhouette into a high-res PNG.

The TopoJSON format from world-atlas stores land polygons as a set of
delta-encoded arcs referenced by geometry objects. We decode the arcs,
stitch them into polygon rings, and rasterize them onto a Pillow canvas
using an equirectangular projection. The output is a grayscale+alpha
PNG where land is fully opaque and ocean is fully transparent — ideal
for alpha-mask sampling in the browser.
"""
from __future__ import annotations

import json
import os
import sys
from PIL import Image, ImageDraw

TOPO_PATH = sys.argv[1] if len(sys.argv) > 1 else "/tmp/land.json"
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else "static/img/world.png"
OUT_W = int(sys.argv[3]) if len(sys.argv) > 3 else 2400

# Standard web-map trim: clip to the populated band of the globe. This
# drops Antarctica and the top-of-world arctic artifacts and gives the
# output a ~2:1 aspect ratio similar to the reference images.
LAT_TOP = 78.0       # ~northern Greenland
LAT_BOTTOM = -58.0   # ~tip of South America
LAT_RANGE = LAT_TOP - LAT_BOTTOM
OUT_H = int(OUT_W * LAT_RANGE / 360.0)

with open(TOPO_PATH) as f:
    topo = json.load(f)

transform = topo.get("transform", {})
scale = transform.get("scale", [1.0, 1.0])
translate = transform.get("translate", [0.0, 0.0])

# Decode delta-compressed arcs into lists of (lng, lat) tuples.
arcs: list[list[tuple[float, float]]] = []
for raw_arc in topo["arcs"]:
    x = 0
    y = 0
    decoded: list[tuple[float, float]] = []
    for dx, dy in raw_arc:
        x += dx
        y += dy
        lng = x * scale[0] + translate[0]
        lat = y * scale[1] + translate[1]
        decoded.append((lng, lat))
    arcs.append(decoded)


def ring_points(arc_indices: list[int]) -> list[tuple[float, float]]:
    """Stitch a polygon ring from its referenced arcs.

    A negative index means "reverse arc ~i"; consecutive arcs share
    their join point, so we drop the first point of each subsequent
    arc to avoid duplicates.
    """
    out: list[tuple[float, float]] = []
    for idx in arc_indices:
        arc = arcs[~idx][::-1] if idx < 0 else arcs[idx]
        if out:
            out.extend(arc[1:])
        else:
            out.extend(arc)
    return out


polygons: list[list[tuple[float, float]]] = []
for geom in topo["objects"]["land"]["geometries"]:
    gtype = geom["type"]
    if gtype == "Polygon":
        polygons.append(ring_points(geom["arcs"][0]))
    elif gtype == "MultiPolygon":
        for poly_rings in geom["arcs"]:
            polygons.append(ring_points(poly_rings[0]))

img = Image.new("LA", (OUT_W, OUT_H), (0, 0))
draw = ImageDraw.Draw(img)


def project(lng: float, lat: float) -> tuple[int, int]:
    px = int((lng + 180.0) / 360.0 * OUT_W)
    py = int((LAT_TOP - lat) / LAT_RANGE * OUT_H)
    return px, py


def unwrap_ring(ring: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Remove antimeridian jumps so adjacent points are always <180° apart.

    The ring may extend beyond the [-180, 180] band afterwards; the
    rasterizer will simply clip the off-canvas portion. Rendering the
    ring a second time shifted by -360 recovers the wrap-around part
    that would otherwise be missing on the opposite side.
    """
    if not ring:
        return ring
    out: list[tuple[float, float]] = [ring[0]]
    for i in range(1, len(ring)):
        lng, lat = ring[i]
        prev_lng = out[-1][0]
        while lng - prev_lng > 180.0:
            lng -= 360.0
        while lng - prev_lng < -180.0:
            lng += 360.0
        out.append((lng, lat))
    return out


def draw_ring(ring: list[tuple[float, float]], lng_shift: float = 0.0) -> None:
    pixels = [project(lng + lng_shift, lat) for lng, lat in ring]
    draw.polygon(pixels, fill=(0, 255))


for ring in polygons:
    if len(ring) < 3:
        continue

    lats = [pt[1] for pt in ring]
    if max(lats) < LAT_BOTTOM or min(lats) > LAT_TOP:
        continue

    unwrapped = unwrap_ring(ring)
    lng_range = max(pt[0] for pt in unwrapped) - min(pt[0] for pt in unwrapped)
    # Near-global rings (e.g. Antarctica looped around the pole) aren't
    # a useful silhouette in this context — skip them.
    if lng_range > 340.0:
        continue

    draw_ring(unwrapped, 0.0)
    # Redraw shifted so the antimeridian wrap-around lobe appears on
    # the opposite side of the canvas as well.
    draw_ring(unwrapped, -360.0)
    draw_ring(unwrapped, +360.0)

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
img.save(OUT_PATH, optimize=True)
print(f"Wrote {OUT_PATH} ({OUT_W}x{OUT_H}) with {len(polygons)} polygons")
