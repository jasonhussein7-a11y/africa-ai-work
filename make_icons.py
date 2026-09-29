import struct, zlib

def png(size, path):
    bg = (22, 33, 58)
    fg = (255, 255, 255)
    tk = (95, 211, 163)
    s = float(size)
    cx, cy, r = s / 2, s / 2, s * 0.30
    w = s * 0.055
    pts = [(s * 0.39, s * 0.51), (s * 0.47, s * 0.59), (s * 0.62, s * 0.42)]

    def seg(px, py, ax, ay, bx, by):
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        qx, qy = ax + t * dx, ay + t * dy
        return ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5

    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            d = ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5
            ring = abs(d - r) < w / 2
            tick = min(seg(px, py, *pts[0], *pts[1]), seg(px, py, *pts[1], *pts[2])) < w / 2
            row += bytes(tk if tick else (fg if ring else bg))
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)

    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)

png(192, 'icons/icon-192.png')
png(512, 'icons/icon-512.png')
print('icons written')
