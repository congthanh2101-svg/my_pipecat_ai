#!/usr/bin/env python3
"""
Giải nén file Chrome extension (.crx) để xem/sửa source.

Bản chất: .crx = header (chữ ký) + ZIP. Script này tách header rồi giải nén ZIP.

Cách dùng:
    python3 crx_unpack.py file.crx [thư_mục_đích]

Hỗ trợ CRX2 (magic Cr24, version 2) và CRX3 (version 3).
"""
import struct
import sys
import zipfile
import io
from pathlib import Path


def unpack_crx(crx_path: Path, out_dir: Path) -> None:
    data = crx_path.read_bytes()

    # Magic "Cr24"
    if data[:4] != b"Cr24":
        raise ValueError("Không phải file .crx hợp lệ (thiếu magic 'Cr24')")

    version = struct.unpack("<I", data[4:8])[0]
    if version == 2:
        # CRX2: header = 16 + pubkey_len + sig_len
        pubkey_len = struct.unpack("<I", data[8:12])[0]
        sig_len = struct.unpack("<I", data[12:16])[0]
        zip_start = 16 + pubkey_len + sig_len
    elif version == 3:
        # CRX3: header = 16 + header_size (protobuf chứa chữ ký)
        header_size = struct.unpack("<I", data[8:12])[0]
        zip_start = 16 + header_size
    else:
        raise ValueError(f"Phiên bản CRX không hỗ trợ: {version}")

    zip_bytes = data[zip_start:]
    print(f"✅ Magic: Cr24 | version: {version} | header: {zip_start} bytes | ZIP: {len(zip_bytes)} bytes")

    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # Chống path traversal
        for member in zf.namelist():
            target = (out_dir / member).resolve()
            if not str(target).startswith(str(out_dir.resolve())):
                raise ValueError(f"Đường dẫn không an toàn trong CRX: {member}")
        zf.extractall(out_dir)

    files = sorted(str(p.relative_to(out_dir)) for p in out_dir.rglob("*") if p.is_file())
    print(f"✅ Đã giải nén {len(files)} file vào: {out_dir}")
    for f in files:
        print(f"   - {f}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    crx = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else crx.parent / (crx.stem + "_unpacked")
    try:
        unpack_crx(crx, out)
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        sys.exit(1)
