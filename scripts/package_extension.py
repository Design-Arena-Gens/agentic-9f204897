#!/usr/bin/env python3
"""
Utility script to package the Chrome extension into a distributable zip archive.
Usage:
    python3 scripts/package_extension.py
"""

import argparse
import os
import pathlib
import zipfile


def package_extension(source: pathlib.Path, destination: pathlib.Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in source.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(source)
                zf.write(file_path, arcname.as_posix())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        default="extension",
        help="Path to the extension directory",
    )
    parser.add_argument(
        "--output",
        default="public/uorigin-advanced-shield.zip",
        help="Path for the output archive",
    )
    args = parser.parse_args()

    source_dir = pathlib.Path(args.source).resolve()
    if not source_dir.exists():
        raise SystemExit(f"Extension directory not found: {source_dir}")

    output_path = pathlib.Path(args.output).resolve()
    package_extension(source_dir, output_path)
    print(f"Packaged extension → {output_path}")


if __name__ == "__main__":
    main()
