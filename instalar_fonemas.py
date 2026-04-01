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

import os
import sys
import subprocess
import shutil
import platform

# ════════════════════════════════════════════════════════════════════
# MAPEAMENTO: arquivo Kaggle → arquivo do sistema (audio/fonemas/)
# ════════════════════════════════════════════════════════════════════

# Estrutura: "nome_kaggle.wav" → "nome_sistema.ogg"
MAPA = {
    "a.wav":    "a.ogg",      # /a/  vogal oral
    "ê.wav":    "e.ogg",      # /e/  vogal fechada
    "é.wav":    "eps.ogg",    # /ɛ/  vogal aberta
    "i.wav":    "i.ogg",      # /i/
    "ô.wav":    "o.ogg",      # /o/  vogal fechada
    "ó.wav":    "ope.ogg",    # /ɔ/  vogal aberta
    "u.wav":    "u.ogg",      # /u/
    "am.wav":   "an.ogg",     # /ã/  vogal nasal
    "em.wav":   "en.ogg",     # /ẽ/
    "im.wav":   "in.ogg",     # /ĩ/
    "om.wav":   "on.ogg",     # /õ/
    "um.wav":   "un.ogg",     # /ũ/
    "p.wav":    "p.ogg",      # /p/
    "b.wav":    "b.ogg",      # /b/
    "t.wav":    "t.ogg",      # /t/
    "d.wav":    "d.ogg",      # /d/
    "k.wav":    "k.ogg",      # /k/
    "g.wav":    "g.ogg",      # /g/
    "f.wav":    "f.ogg",      # /f/
    "v.wav":    "v.ogg",      # /v/
    "s.wav":    "s.ogg",      # /s/
    "z.wav":    "z.ogg",      # /z/
    "ch.wav":   "sh.ogg",     # /ʃ/  CH / X
    "j.wav":    "zh.ogg",     # /ʒ/  J / G
    "m.wav":    "m.ogg",      # /m/
    "n.wav":    "n.ogg",      # /n/
    "nh.wav":   "nh.ogg",     # /ɲ/  NH
    "l.wav":    "l.ogg",      # /l/
    "lh.wav":   "lh.ogg",     # /ʎ/  LH
    "r-2.wav":  "r.ogg",      # /ɾ/  R suave (caro, para)
    "R.wav":    "rr.ogg",     # /ʁ/  R forte (rato, carro)
}

# ════════════════════════════════════════════════════════════════════
# CAMINHOS
# ════════════════════════════════════════════════════════════════════

REPO_DIR   = os.path.dirname(os.path.abspath(__file__))
KAGGLE_DIR = os.path.join(REPO_DIR, "fonemas-wav")
AUDIO_DIR  = os.path.join(REPO_DIR, "audio", "fonemas")

# ════════════════════════════════════════════════════════════════════
# VERIFICAR / INSTALAR FFMPEG
# ════════════════════════════════════════════════════════════════════

def check_ffmpeg():
    return shutil.which("ffmpeg") is not None

def install_ffmpeg():
    system = platform.system().lower()
    print("\n📦 FFmpeg não encontrado. Instalando...\n")
    if system == "darwin":
        r = subprocess.run(["brew", "install", "ffmpeg"], capture_output=True)
        if r.returncode == 0:
            print("  ✅ FFmpeg instalado via Homebrew")
            return True
        else:
            print("  ❌ Homebrew não encontrado.")
            print("  → Instale o Homebrew: https://brew.sh")
            print("  → Depois execute: brew install ffmpeg")
            return False
    elif system == "linux":
        r = subprocess.run(["sudo","apt-get","install","-y","ffmpeg"],
                           capture_output=True)
        return r.returncode == 0
    elif system == "windows":
        print("  → Baixe o FFmpeg em: https://ffmpeg.org/download.html")
        print("  → Adicione ao PATH e execute o script novamente.")
        return False
    return False

# ════════════════════════════════════════════════════════════════════
# CONVERTER WAV → OGG
# ════════════════════════════════════════════════════════════════════

def converter(src_wav, dst_ogg):
    """
    Converte WAV para OGG Vorbis mono 22050Hz.
    Aplica normalização de volume EBU R128 (-16 LUFS).
    """
    cmd = [
        "ffmpeg", "-y", "-i", src_wav,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ac", "1",
        "-ar", "22050",
        "-c:a", "libvorbis",
        "-q:a", "5",
        dst_ogg
    ]
    r = subprocess.run(cmd, capture_output=True)
    return r.returncode == 0

# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("  INSTALADOR DE FONEMAS pt-BR — Kaggle Dataset")
    print("=" * 60)
    print(f"\n  Origem : {KAGGLE_DIR}")
    print(f"  Destino: {AUDIO_DIR}")
    print(f"  Total  : {len(MAPA)} fonemas\n")

    # 1. Verificar FFmpeg
    if not check_ffmpeg():
        ok = install_ffmpeg()
        if not ok:
            print("\n❌ FFmpeg é necessário. Instale e tente novamente.")
            sys.exit(1)
    else:
        print(f"  FFmpeg : ✅ {shutil.which('ffmpeg')}\n")

    # 2. Verificar pasta do Kaggle
    if not os.path.isdir(KAGGLE_DIR):
        print(f"❌ Pasta não encontrada: {KAGGLE_DIR}")
        print("   Certifique-se de que a pasta 'fonemas-wav' está dentro")
        print("   do repositório 'ingles-instrumental'.")
        sys.exit(1)

    # 3. Criar destino
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # 4. Converter e copiar
    print(f"  {'Kaggle':<12} {'Sistema':<12} {'Tamanho':<10} Status")
    print(f"  {'─'*55}")

    ok_list   = []
    fail_list = []

    for kaggle_name, sistema_name in MAPA.items():
        src = os.path.join(KAGGLE_DIR, kaggle_name)
        dst = os.path.join(AUDIO_DIR, sistema_name)

        if not os.path.exists(src):
            print(f"  {kaggle_name:<12} {sistema_name:<12} {'':10} ⚠️  WAV não encontrado")
            fail_list.append(kaggle_name)
            continue

        if converter(src, dst):
            size = os.path.getsize(dst) // 1024
            print(f"  {kaggle_name:<12} {sistema_name:<12} {size} KB{'':<6} ✅")
            ok_list.append(sistema_name)
        else:
            print(f"  {kaggle_name:<12} {sistema_name:<12} {'':10} ❌ falhou")
            fail_list.append(kaggle_name)

    # 5. Relatório
    print(f"\n{'═'*60}")
    print(f"  RESULTADO")
    print(f"  ✅ Instalados com sucesso : {len(ok_list)}/{len(MAPA)}")
    if fail_list:
        print(f"  ❌ Falhas                 : {len(fail_list)}")
        for f in fail_list:
            print(f"     • {f}")

    # 6. Git push automático
    if ok_list:
        print(f"\n{'─'*60}")
        ans = input("  Fazer git push para o GitHub agora? [s/N] ").strip().lower()
        if ans == "s":
            cmds = [
                ["git", "add", "audio/fonemas/"],
                ["git", "commit", "-m",
                 f"Audio: {len(ok_list)} fonemas reais pt-BR (Kaggle CC0 — AlfaeBeto IAB)"],
                ["git", "push", "origin", "main"],
            ]
            for cmd in cmds:
                r = subprocess.run(cmd, cwd=REPO_DIR,
                                   capture_output=True, text=True)
                label = " ".join(cmd[:3])
                if r.returncode == 0:
                    print(f"  ✅ {label}")
                else:
                    print(f"  ❌ {label}")
                    print(f"     {r.stderr.strip()[:100]}")

    print(f"\n{'═'*60}")
    print("  Pronto! Recarregue a plataforma — os fonemas agora")
    print("  usam voz humana nativa brasileira. 🇧🇷")
    print(f"{'═'*60}\n")

if __name__ == "__main__":
    main()
