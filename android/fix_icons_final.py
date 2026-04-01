import os
import shutil
import struct
import zlib

def make_png(width, height, color):
    png = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr + struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xffffffff)
    line = b'\x00' + (struct.pack('BBB', *color) * width)
    data = zlib.compress(line * height)
    png += struct.pack('>I', len(data)) + b'IDAT' + data + struct.pack('>I', zlib.crc32(b'IDAT' + data) & 0xffffffff)
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    return png

# Create a master PNG in current dir (d:\invoice\android)
master_path = 'fixed_icon_master.png'
with open(master_path, 'wb') as f:
    f.write(make_png(512, 512, (255, 31, 31)))

# Distribute to mipmap folders (relative to android dir)
base_res = os.path.join('app', 'src', 'main', 'res')
dirs = ['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi', 'mipmap-ldpi']
files = ['app_icon.png', 'app_icon_foreground.png', 'app_icon_round.png', 'app_icon_round_foreground.png']

for d in dirs:
    path = os.path.join(base_res, d)
    if os.path.exists(path):
        for f_name in files:
            target = os.path.join(path, f_name)
            try:
                shutil.copy2(master_path, target)
                print(f"✅ Replaced {target}")
            except Exception as e:
                print(f"❌ Failed {target}: {e}")
