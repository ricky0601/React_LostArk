#!/usr/bin/env python3
"""Generate deterministic Lost Ark-sized nickname lines from OFL fonts."""

from __future__ import annotations

import argparse
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ASCII = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
RARE_UI_SYLLABLES = "뜌긔껀혓첵"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--fonts", type=Path, nargs="+", required=True)
    parser.add_argument("--characters", type=Path, required=True)
    parser.add_argument("--lines", type=int, default=4000)
    parser.add_argument("--seed", type=int, default=4821)
    return parser.parse_args()


def nickname(rng: random.Random, index: int, alphabet: str) -> str:
    coverage_lines = (len(alphabet) + 11) // 12
    if index < coverage_lines:
        start = index * 12
        return alphabet[start:start + 12]

    length = rng.randint(2, 12)
    characters = [rng.choice(alphabet) for _ in range(length)]
    if rng.random() < 0.12:
        characters[rng.randrange(length)] = rng.choice(ASCII)
    return "".join(characters)


def render(text: str, font_path: Path, font_size: int) -> Image.Image:
    font = ImageFont.truetype(str(font_path), font_size)
    probe = Image.new("L", (512, 64), 255)
    draw = ImageDraw.Draw(probe)
    draw.text((4, 1), text, font=font, fill=0, stroke_width=0)
    ink = Image.eval(probe, lambda value: 255 - value)
    bbox = ink.getbbox()
    if bbox is None:
        raise RuntimeError(f"Could not render {text!r}")
    cropped = probe.crop((max(0, bbox[0] - 3), max(0, bbox[1] - 3),
                          min(probe.width, bbox[2] + 3), min(probe.height, bbox[3] + 3)))
    threshold = 150 + (font_size % 3) * 20
    binary = cropped.point(lambda value: 0 if value < threshold else 255)
    return binary.resize((binary.width * 4, binary.height * 4), Image.Resampling.NEAREST)


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)
    corpus = args.characters.read_text(encoding="utf-8")
    alphabet = "".join(sorted(set(character for character in corpus if "가" <= character <= "힣")
                              | set(RARE_UI_SYLLABLES)))
    for index in range(args.lines):
        text = nickname(rng, index, alphabet)
        font_path = args.fonts[index % len(args.fonts)]
        image = render(text, font_path, 13 + (index % 4))
        stem = f"line-{index:05d}"
        image.save(args.output / f"{stem}.png")
        (args.output / f"{stem}.gt.txt").write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
