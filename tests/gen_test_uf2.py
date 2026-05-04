#!/usr/bin/env python3
"""Generate manual-inspection UF2 fixtures into tests/uf2_files/.

Produces a deterministic incrementing.bin (block N filled with byte value N)
and several UF2 variants exercising different familyID, base address, and flag
combinations. See .github/copilot-instructions.md ("Test fixtures") for the
full variant catalogue.
"""
import struct
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
UF2CONV = REPO_ROOT / "uf2" / "utils" / "uf2conv.py"
OUT_DIR = SCRIPT_DIR / "uf2_files"

UF2_MAGIC_START0 = 0x0A324655
UF2_MAGIC_START1 = 0x9E5D5157
UF2_MAGIC_END = 0x0AB16F30

FLAG_NOT_MAIN_FLASH = 0x00000001
FLAG_FILE_CONTAINER = 0x00001000
FLAG_FAMILY_ID = 0x00002000
FLAG_MD5 = 0x00004000
FLAG_EXT_TAGS = 0x00008000


def gen_incrementing_bin(path: Path, num_blocks: int = 256) -> None:
    """Write a bin where 256-byte block N is filled with value N % 256."""
    buf = bytearray(num_blocks * 256)
    for n in range(num_blocks):
        buf[n * 256:(n + 1) * 256] = bytes([n & 0xFF]) * 256
    path.write_bytes(buf)
    print(f"Wrote {len(buf)} bytes to {path}")


def run_uf2conv(bin_path: Path, out_uf2: Path, family: str, base: str) -> None:
    subprocess.run(
        [
            sys.executable, str(UF2CONV),
            "-c",
            "-f", family,
            "-b", base,
            "-o", str(out_uf2),
            str(bin_path),
        ],
        check=True,
    )


def set_flags_all_blocks(buf: bytearray, extra_flags: int) -> None:
    for offset in range(0, len(buf), 512):
        flags = struct.unpack_from("<I", buf, offset + 8)[0]
        struct.pack_into("<I", buf, offset + 8, flags | extra_flags)


def make_not_main_flash(src: bytes) -> bytes:
    out = bytearray(src)
    set_flags_all_blocks(out, FLAG_NOT_MAIN_FLASH)
    return bytes(out)


def make_md5(src: bytes) -> bytes:
    """Set MD5 flag and write a recognisable region/checksum at end of data[]."""
    out = bytearray(src)
    set_flags_all_blocks(out, FLAG_MD5)
    region_start = 0x10000000
    region_length = 0x00010000
    md5_placeholder = bytes([0xAA] * 16)
    trailer = struct.pack("<II", region_start, region_length) + md5_placeholder
    assert len(trailer) == 24
    # data[] occupies bytes 32..508; last 24 bytes of data are 484..508.
    for offset in range(0, len(out), 512):
        out[offset + 484:offset + 508] = trailer
    return bytes(out)


def encode_ext_tag(tag_type: int, payload: bytes) -> bytes:
    """Encode a single extension tag, padded to 4-byte boundary.

    Layout: size byte, 3-byte LE tag type, payload, zero-padding to 4-byte align.
    """
    raw = bytes([0]) + tag_type.to_bytes(3, "little") + payload
    pad = (-len(raw)) % 4
    raw += b"\x00" * pad
    assert len(raw) <= 0xFF
    return bytes([len(raw)]) + raw[1:]


def make_extension_tags(src: bytes) -> bytes:
    out = bytearray(src)
    set_flags_all_blocks(out, FLAG_EXT_TAGS)
    tags = b""
    tags += encode_ext_tag(0x9FC7BC, b"0.1.2\x00")             # version
    tags += encode_ext_tag(0x650D9D, b"ACME Toaster mk3\x00")  # description
    tags += b"\x00\x00\x00\x00"                                # terminator
    # Tags start right after the 256-byte payload, i.e. at block_offset + 32 + 256 = +288.
    # Available space until magicEnd at +508 is 220 bytes; assert we fit.
    assert len(tags) <= 220, f"ext tags too large: {len(tags)}"
    for offset in range(0, len(out), 512):
        out[offset + 288:offset + 288 + len(tags)] = tags
    return bytes(out)


def make_file_container(out_path: Path) -> None:
    """Build a tiny UF2 from scratch holding one embedded file.

    File-container blocks repurpose the fileSize/familyID slot as fileSize,
    so FLAG_FAMILY_ID is not set.
    """
    filename = b"hello.txt\x00"
    file_content = b"Hello from UF2 file container fixture!\n" * 4
    payload_size = 128
    num_blocks = (len(file_content) + payload_size - 1) // payload_size
    blocks = []
    for blockno in range(num_blocks):
        chunk = file_content[blockno * payload_size:(blockno + 1) * payload_size]
        chunk_padded = chunk + b"\x00" * (payload_size - len(chunk))
        header = struct.pack(
            "<IIIIIIII",
            UF2_MAGIC_START0, UF2_MAGIC_START1,
            FLAG_FILE_CONTAINER,
            blockno * payload_size,            # targetAddr = offset within file
            payload_size, blockno, num_blocks,
            len(file_content),                  # fileSize
        )
        data = bytearray(476)
        data[0:payload_size] = chunk_padded
        data[payload_size:payload_size + len(filename)] = filename
        block = header + bytes(data) + struct.pack("<I", UF2_MAGIC_END)
        assert len(block) == 512
        blocks.append(block)
    out_path.write_bytes(b"".join(blocks))
    print(f"Wrote {num_blocks * 512} bytes ({num_blocks} blocks) to {out_path}")


def selfcheck(path: Path, expected_flag_bits: int) -> None:
    data = path.read_bytes()
    flags0 = struct.unpack_from("<I", data, 8)[0]
    if flags0 & expected_flag_bits != expected_flag_bits:
        raise SystemExit(
            f"selfcheck failed for {path.name}: flags=0x{flags0:08x} "
            f"missing bits 0x{expected_flag_bits:08x}"
        )
    print(f"  {path.name}: flags=0x{flags0:08x} OK")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    bin_path = OUT_DIR / "incrementing.bin"
    gen_incrementing_bin(bin_path)

    family_variants = [
        ("no_family.uf2",  "0x0",        "0x2000"),
        ("family_a.uf2",   "0xAAAAAAAA", "0x10000000"),
        ("family_b.uf2",   "0xBBBBBBBB", "0x4000"),
        ("family_c.uf2",   "0xCAFEBABE", "0x26000"),
        ("family_d.uf2",   "0xDEADBEEF", "0x08008000"),
    ]
    for name, family, base in family_variants:
        run_uf2conv(bin_path, OUT_DIR / name, family, base)

    base_uf2 = (OUT_DIR / "family_a.uf2").read_bytes()

    (OUT_DIR / "flag_not_main_flash.uf2").write_bytes(make_not_main_flash(base_uf2))
    (OUT_DIR / "flag_md5.uf2").write_bytes(make_md5(base_uf2))
    (OUT_DIR / "flag_extension_tags.uf2").write_bytes(make_extension_tags(base_uf2))
    make_file_container(OUT_DIR / "flag_file_container.uf2")

    # Large fixture: 6 MiB bin -> 12 MiB UF2 (24576 blocks of 512 bytes).
    # Sized to clearly exceed the 10 MiB boundary the editor treats as "large".
    large_bin = OUT_DIR / "large.bin"
    gen_incrementing_bin(large_bin, num_blocks=6 * 1024 * 1024 // 256)
    run_uf2conv(large_bin, OUT_DIR / "large.uf2", "0xAAAAAAAA", "0x10000000")

    print("\nSelf-check:")
    selfcheck(OUT_DIR / "family_a.uf2", FLAG_FAMILY_ID)
    selfcheck(OUT_DIR / "no_family.uf2", 0)  # any flags accepted
    selfcheck(OUT_DIR / "flag_not_main_flash.uf2", FLAG_NOT_MAIN_FLASH | FLAG_FAMILY_ID)
    selfcheck(OUT_DIR / "flag_md5.uf2", FLAG_MD5 | FLAG_FAMILY_ID)
    selfcheck(OUT_DIR / "flag_extension_tags.uf2", FLAG_EXT_TAGS | FLAG_FAMILY_ID)
    selfcheck(OUT_DIR / "flag_file_container.uf2", FLAG_FILE_CONTAINER)


if __name__ == "__main__":
    main()
