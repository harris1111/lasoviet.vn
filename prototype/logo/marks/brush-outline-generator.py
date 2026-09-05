"""Generate variable-width brush-stroke outlines as SVG paths (viewBox 0 0 100 100)."""
import math

def lerp(a, b, t):
    return a + (b - a) * t

def profile(stops):
    """stops: list of (t, halfwidth). Returns smooth interpolator (Catmull-Rom on scalars)."""
    ts = [s[0] for s in stops]
    ws = [s[1] for s in stops]

    def f(t):
        t = max(0.0, min(1.0, t))
        for i in range(len(ts) - 1):
            if ts[i] <= t <= ts[i + 1]:
                span = ts[i + 1] - ts[i]
                u = 0.0 if span == 0 else (t - ts[i]) / span
                p0 = ws[i - 1] if i > 0 else ws[i]
                p1, p2 = ws[i], ws[i + 1]
                p3 = ws[i + 2] if i + 2 < len(ws) else ws[i + 1]
                # Catmull-Rom
                return 0.5 * ((2 * p1) + (-p0 + p2) * u +
                              (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3)
        return ws[-1]
    return f


def catmull_to_bezier(pts, closed=True):
    """Emit an SVG path 'd' passing smoothly through pts."""
    n = len(pts)
    d = "M %.2f %.2f" % pts[0]
    for i in range(n - 1 if not closed else n):
        p0 = pts[(i - 1) % n] if closed else pts[max(i - 1, 0)]
        p1 = pts[i % n]
        p2 = pts[(i + 1) % n] if closed else pts[min(i + 1, n - 1)]
        p3 = pts[(i + 2) % n] if closed else pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        d += " C %.2f %.2f, %.2f %.2f, %.2f %.2f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    return d + " Z"


def stroke_outline(centerline, halfwidth_fn, samples=200, out_pts=46):
    """centerline: fn(t)->(x,y) for t in [0,1]. Returns closed outline point list."""
    dense = [centerline(i / (samples - 1.0)) for i in range(samples)]
    left, right = [], []
    for i, p in enumerate(dense):
        t = i / (samples - 1.0)
        # tangent via central difference
        a = dense[max(i - 1, 0)]
        b = dense[min(i + 1, samples - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        m = math.hypot(tx, ty) or 1e-9
        nx, ny = -ty / m, tx / m
        w = halfwidth_fn(t)
        left.append((p[0] + nx * w, p[1] + ny * w))
        right.append((p[0] - nx * w, p[1] - ny * w))
    # subsample for a compact path
    step = max(1, samples // out_pts)
    idx = list(range(0, samples, step))
    if idx[-1] != samples - 1:
        idx.append(samples - 1)
    lpts = [left[i] for i in idx]
    rpts = [right[i] for i in idx]
    return lpts + list(reversed(rpts))


# ---------------------------------------------------------------- ring (ensō)
CX = CY = 50.0
R0 = 34.0
TH_START, TH_SWEEP = 40.0, 330.0   # degrees, clockwise from 12 o'clock

def ring_center(t):
    th = math.radians(TH_START + TH_SWEEP * t)
    r = R0 + 0.9 * math.sin(2 * th + 0.7) + 0.5 * math.sin(3 * th + 2.1)
    return (CX + r * math.sin(th), CY - r * math.cos(th))

ring_w = profile([(0.00, 2.4), (0.12, 3.6), (0.30, 4.8), (0.55, 5.4),
                  (0.70, 4.5), (0.84, 3.0), (0.94, 1.4), (1.00, 0.18)])

ring_d = catmull_to_bezier(stroke_outline(ring_center, ring_w, out_pts=54))

# ------------------------------------------------------------------- V stroke
V_PTS = [(34, 27), (37.8, 45), (42.2, 59), (47, 70), (54.0, 52), (59.6, 34), (65, 13)]

def _spline(pts):
    """Piecewise Catmull-Rom evaluator over a point list."""
    n = len(pts)
    def f(t):
        t = max(0.0, min(0.999999, t))
        seg = t * (n - 1)
        i = int(seg)
        u = seg - i
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[min(i + 1, n - 1)]
        p3 = pts[min(i + 2, n - 1)]
        def c(a, b, cc, d_):
            return 0.5 * ((2 * b) + (-a + cc) * u +
                          (2 * a - 5 * b + 4 * cc - d_) * u * u +
                          (-a + 3 * b - 3 * cc + d_) * u ** 3)
        return (c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]))
    return f

v_center = _spline(V_PTS)
v_w = profile([(0.00, 0.45), (0.12, 2.6), (0.28, 4.2), (0.42, 4.6), (0.50, 3.6),
               (0.62, 4.0), (0.75, 3.1), (0.88, 1.6), (1.00, 0.22)])

v_d = catmull_to_bezier(stroke_outline(v_center, v_w, out_pts=42))

# ------------------------------------------------------------- cinnabar drop
tip = v_center(0.999)
prev = v_center(0.97)
dx, dy = tip[0] - prev[0], tip[1] - prev[1]
m = math.hypot(dx, dy)
DROP = (tip[0] + dx / m * 6.6, tip[1] + dy / m * 6.6)

svg = f'''<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="{ring_d}"/>
  <path fill="currentColor" d="{v_d}"/>
  <circle cx="{DROP[0]:.2f}" cy="{DROP[1]:.2f}" r="2.9" fill="#CE5B45"/>
</svg>
'''
print(svg)
print("drop:", DROP, "tip:", tip)
