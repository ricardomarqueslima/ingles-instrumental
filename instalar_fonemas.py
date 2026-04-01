#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║  INSTALADOR DE FONEMAS pt-BR — Kaggle Dataset                       ║
║  "Brazilian Portuguese Phonemes Audio" (AlfaeBeto IAB)              ║
║                                                                      ║
║  Uso: python instalar_fonemas.py                                     ║
║  Execute dentro da pasta: ingles-instrumental/                      ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os, sys, subprocess, shutil, platform

REPO_DIR   = os.path.dirname(os.path.abspath(__file__))
KAGGLE_DIR = os.path.join(REPO_DIR, "fonemas-wav")
AUDIO_DIR  = os.path.join(REPO_DIR, "audio", "fonemas")

MAPA = {
    "a.wav":   "a.ogg",    "ê.wav":  "e.ogg",   "é.wav":  "eps.ogg",
    "i.wav":   "i.ogg",    "ô.wav":  "o.ogg",   "ó.wav":  "ope.ogg",
    "u.wav":   "u.ogg",    "am.wav": "an.ogg",  "em.wav": "en.ogg",
    "im.wav":  "in.ogg",   "om.wav": "on.ogg",  "um.wav": "un.ogg",
    "p.wav":   "p.ogg",    "b.wav":  "b.ogg",   "t.wav":  "t.ogg",
    "d.wav":   "d.ogg",    "k.wav":  "k.ogg",   "g.wav":  "g.ogg",
    "f.wav":   "f.ogg",    "v.wav":  "v.ogg",   "s.wav":  "s.ogg",
    "z.wav":   "z.ogg",    "ch.wav": "sh.ogg",  "j.wav":  "zh.ogg",
    "m.wav":   "m.ogg",    "n.wav":  "n.ogg",   "nh.wav": "nh.ogg",
    "l.wav":   "l.ogg",    "lh.wav": "lh.ogg",  "r-2.wav":"r.ogg",
    "R.wav":   "rr.ogg",
}

def converter(src, dst):
    """WAV → Opus/OGG mono 48kHz (suportado pelo FFmpeg 8.x no macOS)"""
    cmd = [
        "ffmpeg", "-y", "-i", src,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ac", "1",
        "-ar", "48000",
        "-c:a", "libopus",
        "-b:a", "64k",
        dst
    ]
    r = subprocess.run(cmd, capture_output=True)
    return r.returncode == 0

def main():
    print("=" * 60)
    print("  INSTALADOR DE FONEMAS pt-BR — Kaggle Dataset")
    print("=" * 60)
    print(f"\n  Origem : {KAGGLE_DIR}")
    print(f"  Destino: {AUDIO_DIR}")
    print(f"  Codec  : libopus 64kbps mono 48kHz")
    print(f"  Total  : {len(MAPA)} fonemas\n")

    if not shutil.which("ffmpeg"):
        print("❌ FFmpeg não encontrado. Execute: brew install ffmpeg")
        sys.exit(1)

    if not os.path.isdir(KAGGLE_DIR):
        print(f"❌ Pasta não encontrada: {KAGGLE_DIR}")
        sys.exit(1)

    os.makedirs(AUDIO_DIR, exist_ok=True)

    print(f"  {'Kaggle':<12} {'Sistema':<12} {'KB':<6} Status")
    print(f"  {'─'*50}")

    ok_list, fail_list = [], []

    for kaggle_name, sistema_name in MAPA.items():
        src = os.path.join(KAGGLE_DIR, kaggle_name)
        dst = os.path.join(AUDIO_DIR, sistema_name)

        if not os.path.exists(src):
            print(f"  {kaggle_name:<12} {sistema_name:<12} {'':6} ⚠️  não encontrado")
            fail_list.append(kaggle_name)
            continue

        if converter(src, dst):
            kb = os.path.getsize(dst) // 1024
            print(f"  {kaggle_name:<12} {sistema_name:<12} {kb:<6} ✅")
            ok_list.append(sistema_name)
        else:
            print(f"  {kaggle_name:<12} {sistema_name:<12} {'':6} ❌ falhou")
            fail_list.append(kaggle_name)

    print(f"\n{'═'*60}")
    print(f"  RESULTADO")
    print(f"  ✅ Instalados : {len(ok_list)}/{len(MAPA)}")
    if fail_list:
        print(f"  ❌ Falhas     : {len(fail_list)}")
        for f in fail_list:
            print(f"     • {f}")

    if ok_list:
        print(f"\n{'─'*60}")
        ans = input("  Fazer git push para o GitHub agora? [s/N] ").strip().lower()
        if ans == "s":
            for cmd in [
                ["git","add","audio/fonemas/"],
                ["git","commit","-m",
                 f"Audio: {len(ok_list)} fonemas reais pt-BR (Kaggle CC0, libopus 64k)"],
                ["git","push","origin","main"],
            ]:
                r = subprocess.run(cmd, cwd=REPO_DIR, capture_output=True, text=True)
                print(f"  {'✅' if r.returncode==0 else '❌'} {' '.join(cmd[:3])}")
                if r.returncode != 0:
                    print(f"     {r.stderr.strip()[:100]}")

    print(f"\n{'═'*60}")
    print("  Pronto! Recarregue a plataforma para ouvir os fonemas reais.")
    print(f"{'═'*60}\n")

if __name__ == "__main__":
    main()
