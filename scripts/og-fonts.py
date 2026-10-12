"""
Make the fixed-weight fonts the share images need, from the variable fonts the site already ships.

Share images are drawn by Satori (next/og), which reads only static TTF, OTF or WOFF fonts: no WOFF2, no variable axes.
The site's headline face is Archivo at 78% width, which no static package offers, so we cut our own instances from the
fontsource variable files and write them to lib/og-fonts/. Each Latin and Latin Extended file is cut separately, the way
fontsource splits them, so Czech text still renders.

Both fonts are under the SIL Open Font License 1.1. A cut instance is a Modified Version, and Adobe reserves the font name
"Source" for Source Serif, so every instance gets a new name ("Ctrl AI Serif" and so on). The licences are copied beside the
fonts.

Run after changing a weight or width, or after updating the fontsource packages:
    python3 -m venv /tmp/og-venv && /tmp/og-venv/bin/pip install fonttools brotli
    /tmp/og-venv/bin/python -I scripts/og-fonts.py
"""
import pathlib
import shutil

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODULES = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "lib" / "og-fonts"

# (output file stem, new family name, weight class, source package, source file stem, axis values)
INSTANCES = [
    ("display-800", "Ctrl AI Display", 800, "archivo", "archivo", {"wdth": 78, "wght": 800}),
    ("sans-500", "Ctrl AI Sans", 500, "archivo", "archivo", {"wdth": 100, "wght": 500}),
    ("sans-700", "Ctrl AI Sans", 700, "archivo", "archivo", {"wdth": 100, "wght": 700}),
    ("serif-600", "Ctrl AI Serif", 600, "source-serif-4", "source-serif-4", {"opsz": 60, "wght": 600}),
]
SUBSETS = ["latin", "latin-ext"]


def rename(font: TTFont, family: str, weight: int) -> None:
    """Give the instance its own name everywhere a name is stored, keeping the copyright and licence records."""
    style = "Regular"
    full = f"{family} {weight}"
    postscript = full.replace(" ", "")
    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 2, 3, 4, 6, 16, 17, 21, 22, 25) or record.nameID >= 256:
            names.removeNames(nameID=record.nameID)
    for name_id, value in ((1, f"{family} {weight}"), (2, style), (3, f"{postscript};ctrlai-og"), (4, full), (6, postscript), (16, family), (17, str(weight))):
        names.setName(value, name_id, 3, 1, 0x409)
    font["OS/2"].usWeightClass = weight


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stem, family, weight, package, source, axes in INSTANCES:
        for subset in SUBSETS:
            path = MODULES / package / "files" / f"{source}-{subset}-standard-normal.woff2"
            font = instantiateVariableFont(TTFont(path), axes)
            rename(font, family, weight)
            font.flavor = "woff"
            target = OUT / f"{stem}-{subset}.woff"
            font.save(target)
            print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")
    for package in ("archivo", "source-serif-4"):
        shutil.copyfile(MODULES / package / "LICENSE", OUT / f"OFL-{package}.txt")


if __name__ == "__main__":
    main()
