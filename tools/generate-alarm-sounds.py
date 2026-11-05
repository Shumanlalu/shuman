#!/usr/bin/env python3
"""Generate shuman's 15 original alarm loops.

The generated WAV files are dedicated to the public domain under CC0 1.0.
No external samples, libraries, or downloads are used.
"""

from __future__ import annotations

import math
import os
import random
import struct
import wave
from array import array

SR = 22050
DURATION = 8.0
N = int(SR * DURATION)
TAU = math.tau
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "alarm-sounds"))


def midi(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69.0) / 12.0))


def add_bell(buf: list[float], start: float, freq: float, dur: float = 2.2, amp: float = 0.14) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    decay = 3.2 / max(dur, 0.3)
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.004)) * math.exp(-t * decay)
        s = (math.sin(TAU * freq * t)
             + 0.38 * math.sin(TAU * freq * 2.01 * t)
             + 0.18 * math.sin(TAU * freq * 3.0 * t)
             + 0.09 * math.sin(TAU * freq * 4.16 * t))
        buf[i0 + i] += amp * env * s


def add_glass(buf: list[float], start: float, freq: float, dur: float = 2.4, amp: float = 0.08) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    decay = 2.8 / max(dur, 0.3)
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.003)) * math.exp(-t * decay)
        s = (math.sin(TAU * freq * t)
             + 0.24 * math.sin(TAU * freq * 2.76 * t)
             + 0.1 * math.sin(TAU * freq * 5.4 * t))
        buf[i0 + i] += amp * env * s


def add_marimba(buf: list[float], start: float, freq: float, dur: float = 0.55, amp: float = 0.11) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.002)) * math.exp(-t * 6.2)
        s = (math.sin(TAU * freq * t)
             + 0.3 * math.sin(TAU * freq * 4.0 * t)
             + 0.1 * math.sin(TAU * freq * 10.0 * t))
        buf[i0 + i] += amp * env * s


def add_pluck(buf: list[float], start: float, freq: float, dur: float = 1.2, amp: float = 0.1) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.004)) * math.exp(-t * 3.2)
        s = 0.0
        for k in range(1, 8):
            s += math.sin(TAU * freq * k * t) / k
        buf[i0 + i] += amp * env * s * 0.72


def add_celesta(buf: list[float], start: float, freq: float, dur: float = 1.8, amp: float = 0.1) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    decay = 3.4 / max(dur, 0.3)
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.003)) * math.exp(-t * decay)
        s = (math.sin(TAU * freq * t)
             + 0.34 * math.sin(TAU * freq * 3.01 * t)
             + 0.16 * math.sin(TAU * freq * 5.4 * t))
        buf[i0 + i] += amp * env * s


def add_pad(buf: list[float], start: float, dur: float, freq: float, amp: float = 0.018) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    attack = min(1.2, dur * 0.35)
    release = min(1.4, dur * 0.4)
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = min(1.0, t / attack) * min(1.0, (dur - t) / release if t < dur else 0.0)
        if env <= 0:
            continue
        s = (math.sin(TAU * freq * t)
             + 0.65 * math.sin(TAU * freq * 1.0032 * t)
             + 0.18 * math.sin(TAU * freq * 0.5 * t))
        buf[i0 + i] += amp * env * s / 1.8


def add_bass(buf: list[float], start: float, freq: float, dur: float = 1.4, amp: float = 0.08) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = (1.0 - math.exp(-t / 0.006)) * math.exp(-t * (2.4 / max(dur, 0.3)))
        s = math.sin(TAU * freq * t) + 0.12 * math.sin(TAU * freq * 2.0 * t)
        buf[i0 + i] += amp * env * s


def add_flute(buf: list[float], start: float, freq: float, dur: float = 1.2, amp: float = 0.12) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    rng = random.Random(int(freq * 97 + start * 1000))
    attack = 0.14
    release = 0.25
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = min(1.0, t / attack) * min(1.0, (dur - t) / release if t < dur else 0.0)
        if env <= 0:
            continue
        vib = 0.007 * math.sin(TAU * 5.1 * t)
        phase = TAU * freq * (t + vib * t)
        breath = (rng.random() * 2.0 - 1.0) * 0.018
        s = math.sin(phase) + 0.14 * math.sin(2.0 * phase) + breath
        buf[i0 + i] += amp * env * s


def add_shaker(buf: list[float], start: float, amp: float = 0.022) -> None:
    i0 = int(start * SR)
    n = min(int(0.09 * SR), N - i0)
    if n <= 0:
        return
    rng = random.Random(int(start * SR))
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = math.exp(-t * 38.0)
        buf[i0 + i] += amp * env * (rng.random() * 2.0 - 1.0)


def add_tick(buf: list[float], start: float, high: bool, amp: float = 0.07) -> None:
    i0 = int(start * SR)
    n = min(int(0.05 * SR), N - i0)
    if n <= 0:
        return
    rng = random.Random(int(start * SR) + (1 if high else 0))
    freq = 2450.0 if high else 1580.0
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = math.exp(-t * 70.0)
        buf[i0 + i] += amp * env * (0.55 * math.sin(TAU * freq * t) + 0.45 * (rng.random() * 2.0 - 1.0))


def add_noise_swell(buf: list[float], start: float, dur: float, amp: float = 0.05) -> None:
    i0 = int(start * SR)
    n = min(int(dur * SR), N - i0)
    if n <= 0:
        return
    rng = random.Random(int(start * 1000) + 7)
    smooth = 0.0
    for i in range(n):
        t = i / SR
        if i0 + i >= N:
            break
        env = math.sin(math.pi * min(1.0, t / dur)) ** 2
        smooth = smooth * 0.94 + (rng.random() * 2.0 - 1.0) * 0.06
        buf[i0 + i] += amp * env * smooth


def add_space(buf: list[float], delay: float = 0.24, feedback: float = 0.24) -> None:
    distance = int(delay * SR)
    for i in range(distance, N):
        buf[i] += buf[i - distance] * feedback


def finish(buf: list[float], filename: str, fade_in: float = 0.012, fade_out: float = 0.02) -> None:
    if not buf:
        return
    mean = sum(buf) / N
    for i in range(N):
        buf[i] -= mean
    peak = max(abs(value) for value in buf) or 1.0
    gain = 0.88 / peak
    in_samples = max(1, int(fade_in * SR))
    out_samples = max(1, int(fade_out * SR))
    for i in range(N):
        value = buf[i] * gain
        if i < in_samples:
            value *= i / in_samples
        if i >= N - out_samples:
            value *= (N - i) / out_samples
        buf[i] = value
    samples = array("h", (int(max(-1.0, min(1.0, value)) * 32767) for value in buf))
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, filename)
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(samples.tobytes())
    peak_db = 20.0 * math.log10(max(0.0001, max(abs(v) for v in buf)))
    rms = math.sqrt(sum(v * v for v in buf) / N)
    print(f"{filename:26s} {os.path.getsize(path) / 1024:7.1f} KiB  peak {peak_db:5.1f} dBFS  rms {20 * math.log10(max(0.0001, rms)):5.1f} dBFS")


def track_golden_chime() -> list[float]:
    buf = [0.0] * N
    for note in (48, 55, 60, 64):
        add_pad(buf, 0, DURATION, midi(note), 0.014)
    for start, note in ((0, 72), (0.75, 76), (1.5, 79), (2.25, 84), (3.0, 79), (3.75, 76), (4.5, 74), (5.25, 76), (6.0, 79), (6.75, 84)):
        add_bell(buf, start, midi(note), 2.3, 0.16)
    add_bell(buf, 0, midi(48), 3.4, 0.08)
    add_bell(buf, 4, midi(55), 3.0, 0.06)
    add_glass(buf, 6.75, midi(96), 1.4, 0.03)
    add_space(buf, 0.28, 0.2)
    return buf


def track_morning_marimba() -> list[float]:
    buf = [0.0] * N
    bpm = 100.0
    beat = 60.0 / bpm
    chords = [(60, 64, 67), (62, 65, 69), (64, 67, 71), (65, 69, 72)]
    for bar, chord in enumerate(chords):
        start = bar * 4 * beat
        add_bass(buf, start, midi(chord[0] - 12), 1.5, 0.075)
        for step in range(8):
            note = chord[(0, 1, 2, 1, 0, 1, 2, 1)[step]]
            add_marimba(buf, start + step * beat / 2, midi(note), 0.5, 0.1)
            if step % 2 == 1:
                add_shaker(buf, start + step * beat / 2, 0.018)
        add_marimba(buf, start, midi(chord[0] + 12), 0.7, 0.05)
    add_space(buf, 0.2, 0.16)
    return buf


def track_glass_sunrise() -> list[float]:
    buf = [0.0] * N
    bpm = 84.0
    beat = 60.0 / bpm
    chords = [(53, 57, 60), (48, 52, 55), (50, 53, 57), (46, 50, 53)]
    for index, chord in enumerate(chords):
        start = index * 4 * beat
        for note in chord:
            add_pad(buf, start, 4 * beat + 0.8, midi(note), 0.018)
        add_bass(buf, start, midi(chord[0] - 12), 1.6, 0.06)
    melody = [77, 81, 84, 88, 84, 81, 79, 77, 76, 79, 81, 84, 81, 79, 77, 76]
    for index, note in enumerate(melody):
        add_glass(buf, index * beat, midi(note), 2.4, 0.075)
    add_glass(buf, 4.4, midi(96), 1.8, 0.022)
    add_space(buf, 0.31, 0.28)
    return buf


def track_quiet_bells() -> list[float]:
    buf = [0.0] * N
    for note in (48, 55, 60):
        add_pad(buf, 0, DURATION, midi(note), 0.015)
    for start, note, amp in ((0.0, 72, 0.18), (1.5, 79, 0.12), (3.0, 76, 0.14), (4.5, 72, 0.16), (6.0, 67, 0.1), (7.0, 72, 0.14)):
        add_bell(buf, start, midi(note), 3.8, amp)
    add_bass(buf, 0, midi(36), 4.0, 0.06)
    add_space(buf, 0.36, 0.3)
    return buf


def track_analog_dawn() -> list[float]:
    buf = [0.0] * N
    for note in (57, 64, 69):
        add_pad(buf, 0, DURATION, midi(note), 0.012)
    melody = [69, 72, 74, 76, 79, 76, 74, 72]
    for index in range(25):
        note = melody[index % len(melody)]
        start = index * 0.3
        i0 = int(start * SR)
        n = min(int(0.18 * SR), N - i0)
        for i in range(n):
            t = i / SR
            env = (1.0 - math.exp(-t / 0.003)) * math.exp(-t * 12.0)
            buf[i0 + i] += 0.075 * env * (math.sin(TAU * midi(note) * t) + 0.18 * math.sin(TAU * midi(note) * 3.0 * t))
    for start, note in ((0, 45), (2.4, 48), (4.8, 50), (7.2, 43)):
        add_bass(buf, start, midi(note), 2.0, 0.07)
    add_space(buf, 0.22, 0.2)
    return buf


def track_harp_glow() -> list[float]:
    buf = [0.0] * N
    bpm = 92.0
    beat = 60.0 / bpm
    chords = [(50, 54, 57, 62), (45, 49, 52, 57), (47, 50, 54, 59), (43, 47, 50, 55)]
    for index, chord in enumerate(chords):
        start = index * 4 * beat
        for note in chord:
            add_pad(buf, start, 4 * beat + 0.5, midi(note), 0.012)
        add_bass(buf, start, midi(chord[0] - 12), 1.5, 0.06)
        for step in range(8):
            note = chord[(0, 1, 2, 3, 2, 1, 0, 1)[step]]
            add_pluck(buf, start + step * beat / 2, midi(note + 12), 1.1, 0.085)
    add_pluck(buf, 3.0, midi(86), 1.5, 0.03)
    add_space(buf, 0.25, 0.22)
    return buf


def track_celesta_waltz() -> list[float]:
    buf = [0.0] * N
    bpm = 108.0
    beat = 60.0 / bpm
    bars = [(57, (57, 60, 64)), (52, (52, 55, 59)), (53, (53, 57, 60)), (55, (55, 59, 62))]
    melody = [69, 72, 76, 76, 74, 72, 71, 74, 79, 79, 77, 76, 74, 72, 69]
    for index, note in enumerate(melody):
        add_celesta(buf, index * beat, midi(note), 1.6, 0.105)
    for index, (root, chord) in enumerate(bars):
        start = index * 3 * beat
        add_bass(buf, start, midi(root - 12), 1.4, 0.06)
        for offset, note in enumerate(chord):
            add_celesta(buf, start + (offset + 1) * beat, midi(note), 0.7, 0.025)
    add_space(buf, 0.2, 0.18)
    return buf


def track_ocean_bell() -> list[float]:
    buf = [0.0] * N
    for note in (48, 55, 64):
        add_pad(buf, 0, DURATION, midi(note), 0.016)
    add_noise_swell(buf, 0.0, 3.2, 0.05)
    add_noise_swell(buf, 3.8, 4.0, 0.04)
    for start, note, amp in ((0.5, 72, 0.16), (2.6, 79, 0.12), (4.4, 76, 0.13), (6.2, 72, 0.15)):
        add_bell(buf, start, midi(note), 3.0, amp)
    add_bass(buf, 0.5, midi(36), 3.0, 0.055)
    add_space(buf, 0.33, 0.28)
    return buf


def track_digital_bloom() -> list[float]:
    buf = [0.0] * N
    for note in (52, 59, 64):
        add_pad(buf, 0, DURATION, midi(note), 0.012)
    pattern = [64, 71, 76, 80, 83, 80, 76, 71]
    for index in range(26):
        note = pattern[index % len(pattern)]
        start = index * 0.3
        i0 = int(start * SR)
        n = min(int(0.26 * SR), N - i0)
        carrier = midi(note)
        for i in range(n):
            t = i / SR
            env = (1.0 - math.exp(-t / 0.002)) * math.exp(-t * 8.0)
            modulator = math.sin(TAU * carrier * 2.0 * t) * 1.2
            buf[i0 + i] += 0.075 * env * math.sin(TAU * carrier * t + modulator)
    for start, note in ((0, 40), (1.8, 47), (3.6, 45), (5.4, 47)):
        add_bass(buf, start, midi(note), 1.7, 0.07)
    add_glass(buf, 3.0, midi(88), 2.0, 0.022)
    add_glass(buf, 6.0, midi(88), 1.5, 0.018)
    add_space(buf, 0.21, 0.2)
    return buf


def track_wooden_droplet() -> list[float]:
    buf = [0.0] * N
    bpm = 96.0
    beat = 60.0 / bpm
    pattern = [67, 69, 71, 74, 76, 74, 71, 69]
    for index in range(26):
        start = index * 0.3
        note = pattern[index % len(pattern)]
        if index % 8 in (3, 7):
            continue
        add_marimba(buf, start, midi(note), 0.5, 0.105)
        if index % 4 == 2:
            add_marimba(buf, start, midi(note + 12), 0.4, 0.035)
    for start, note in ((0, 43), (2.4, 50), (4.8, 48), (7.2, 43)):
        add_bass(buf, start, midi(note), 1.7, 0.065)
    for index in range(0, 26, 2):
        add_shaker(buf, index * 0.3 + 0.15, 0.014)
    add_space(buf, 0.18, 0.15)
    return buf


def track_star_pulse() -> list[float]:
    buf = [0.0] * N
    for note in (45, 52, 57, 61, 64):
        add_pad(buf, 0, DURATION, midi(note), 0.011)
    for index in range(5):
        add_bass(buf, index * 1.667, midi(33), 1.1, 0.055)
    for start, note in ((1.2, 88), (3.4, 93), (5.1, 88), (6.8, 96)):
        add_glass(buf, start, midi(note), 1.8, 0.024)
    add_space(buf, 0.4, 0.35)
    return buf


def track_clockwork() -> list[float]:
    buf = [0.0] * N
    bpm = 112.0
    beat = 60.0 / bpm
    for note in (48, 55, 64):
        add_pad(buf, 0, DURATION, midi(note), 0.012)
    for index in range(15):
        add_tick(buf, index * beat, index % 2 == 0, 0.06)
    for start, note in ((0, 72), (2 * beat, 76), (4 * beat, 79), (6 * beat, 76), (8 * beat, 74), (10 * beat, 76), (12 * beat, 79)):
        add_celesta(buf, start, midi(note), 1.3, 0.08)
    for start, note in ((0, 36), (4 * beat, 43), (8 * beat, 41), (12 * beat, 43)):
        add_bass(buf, start, midi(note), 1.4, 0.06)
    add_space(buf, 0.19, 0.15)
    return buf


def track_bamboo_flute() -> list[float]:
    buf = [0.0] * N
    for note in (38, 45, 50):
        add_pad(buf, 0, DURATION, midi(note), 0.012)
    melody = ((0.0, 62, 1.5), (1.5, 65, 1.3), (2.8, 67, 1.4), (4.2, 69, 1.6), (5.8, 72, 1.4), (7.0, 69, 0.9))
    for start, note, dur in melody:
        add_flute(buf, start, midi(note), dur, 0.12)
    add_bass(buf, 0, midi(38), 4.0, 0.045)
    add_space(buf, 0.3, 0.25)
    return buf


def track_cathedral_light() -> list[float]:
    buf = [0.0] * N
    chords = ((41, 45, 48, 53), (36, 40, 43, 48), (38, 41, 45, 50), (41, 45, 48, 53))
    for index, chord in enumerate(chords):
        start = index * 2.0
        for note in chord:
            add_pad(buf, start, 2.2, midi(note), 0.02)
        add_bass(buf, start, midi(chord[0] - 12), 1.9, 0.055)
    add_bell(buf, 0.5, midi(77), 3.4, 0.07)
    add_bell(buf, 4.5, midi(84), 3.0, 0.055)
    add_space(buf, 0.42, 0.36)
    return buf


def track_first_light() -> list[float]:
    buf = [0.0] * N
    chords = ((48, 52, 55, 60), (45, 48, 52, 57), (41, 45, 48, 53), (43, 47, 50, 55))
    for index, chord in enumerate(chords):
        start = index * 2.0
        for note in chord:
            add_pad(buf, start, 2.3, midi(note), 0.018)
        add_bass(buf, start, midi(chord[0] - 12), 1.8, 0.06)
        for step, note in enumerate((chord[0], chord[1], chord[2], chord[0] + 12, chord[2] + 12)):
            add_celesta(buf, start + step * 0.19, midi(note + 12), 0.8, 0.028)
    add_bell(buf, 6.6, midi(84), 1.4, 0.09)
    add_space(buf, 0.27, 0.26)
    return buf


TRACKS = (
    ("golden-chime.wav", track_golden_chime),
    ("morning-marimba.wav", track_morning_marimba),
    ("glass-sunrise.wav", track_glass_sunrise),
    ("quiet-bells.wav", track_quiet_bells),
    ("analog-dawn.wav", track_analog_dawn),
    ("harp-glow.wav", track_harp_glow),
    ("celesta-waltz.wav", track_celesta_waltz),
    ("ocean-bell.wav", track_ocean_bell),
    ("digital-bloom.wav", track_digital_bloom),
    ("wooden-droplet.wav", track_wooden_droplet),
    ("star-pulse.wav", track_star_pulse),
    ("clockwork.wav", track_clockwork),
    ("bamboo-flute.wav", track_bamboo_flute),
    ("cathedral-light.wav", track_cathedral_light),
    ("first-light.wav", track_first_light),
)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, builder in TRACKS:
        finish(builder(), filename)


if __name__ == "__main__":
    main()
