#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════╗
║  DOWNLOAD DE ÁUDIOS FONÉTICOS pt-BR — Seminário Presbiteriano da    ║
║  Amazônia / Português 1                                              ║
║                                                                      ║
║  Fontes: Wikimedia Commons (CC BY-SA 2.0 BR)                        ║
║  Autor dos originais: Diego Santos (falante nativo, brasileiro)      ║
║  Licença: https://creativecommons.org/licenses/by-sa/2.0/br/        ║
║                                                                      ║
║  Uso: python download_fonemas.py                                     ║
║  Requisitos: Python 3.8+, acesso à internet                         ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import subprocess
import platform
import shutil
import urllib.request
import urllib.error
import json
import time

# ════════════════════════════════════════════════════════════════════
# CONFIGURAÇÃO
# ════════════════════════════════════════════════════════════════════

# Pasta do repositório local — ajuste se necessário
REPO_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(REPO_DIR, "audio", "fonemas")

# URL base do Wikimedia Commons (Special:FilePath redireciona para CDN)
WK_BASE = "https://commons.wikimedia.org/wiki/Special:FilePath/"

# Mapeamento: nome_do_arquivo → arquivo_no_wikimedia
# Cada entrada: (arquivo_destino, [candidatos_wikimedia_em_ordem_de_preferência])
PHONEME_MAP = {
    # ── Vogais orais ──────────────────────────────────────────────────
    "a.ogg":   ["Pt-br-a.ogg",       "Pt-br-casa.ogg"],
    "e.ogg":   ["Pt-br-e.ogg",       "Pt-br-vê.ogg"],
    "eps.ogg": ["Pt-br-é.ogg",       "Pt-br-pé.ogg"],
    "i.ogg":   ["Pt-br-i.ogg",       "Pt-br-fio.ogg"],
    "o.ogg":   ["Pt-br-o.ogg",       "Pt-br-avô.ogg"],
    "ope.ogg": ["Pt-br-ó.ogg",       "Pt-br-avó.ogg"],
    "u.ogg":   ["Pt-br-u.ogg",       "Pt-br-lua.ogg"],
    # ── Vogais nasais (mais raras — usamos palavras demonstrativas) ──
    "an.ogg":  ["Pt-br-mão.ogg",     "Pt-br-an.ogg",    "Pt-br-cão.ogg"],
    "en.ogg":  ["Pt-br-em.ogg",      "Pt-br-tem.ogg",   "Pt-br-bem.ogg"],
    "in.ogg":  ["Pt-br-im.ogg",      "Pt-br-vim.ogg",   "Pt-br-sim.ogg"],
    "on.ogg":  ["Pt-br-om.ogg",      "Pt-br-bom.ogg",   "Pt-br-som.ogg"],
    "un.ogg":  ["Pt-br-um.ogg",      "Pt-br-un.ogg",    "Pt-br-algum.ogg"],
    # ── Oclusivas ─────────────────────────────────────────────────────
    "p.ogg":   ["Pt-br-pai.ogg",     "Pt-br-pa.ogg",    "Pt-br-pão.ogg"],
    "b.ogg":   ["Pt-br-bo.ogg",      "Pt-br-ba.ogg",    "Pt-br-bola.ogg"],
    "t.ogg":   ["Pt-br-ta.ogg",      "Pt-br-te.ogg",    "Pt-br-tela.ogg"],
    "d.ogg":   ["Pt-br-da.ogg",      "Pt-br-de.ogg",    "Pt-br-dado.ogg"],
    "k.ogg":   ["Pt-br-ca.ogg",      "Pt-br-casa.ogg",  "Pt-br-como.ogg"],
    "g.ogg":   ["Pt-br-ga.ogg",      "Pt-br-gato.ogg"],
    # ── Fricativas ────────────────────────────────────────────────────
    "f.ogg":   ["Pt-br-fa.ogg",      "Pt-br-faca.ogg"],
    "v.ogg":   ["Pt-br-va.ogg",      "Pt-br-vida.ogg"],
    "s.ogg":   ["Pt-br-sa.ogg",      "Pt-br-saco.ogg"],
    "z.ogg":   ["Pt-br-za.ogg",      "Pt-br-zero.ogg"],
    "sh.ogg":  ["Pt-br-xa.ogg",      "Pt-br-chá.ogg",   "Pt-br-chuva.ogg"],
    "zh.ogg":  ["Pt-br-ja.ogg",      "Pt-br-já.ogg",    "Pt-br-jogo.ogg"],
    # ── Nasais ────────────────────────────────────────────────────────
    "m.ogg":   ["Pt-br-ma.ogg",      "Pt-br-mão.ogg",   "Pt-br-mala.ogg"],
    "n.ogg":   ["Pt-br-na.ogg",      "Pt-br-nota.ogg"],
    "nh.ogg":  ["Pt-br-nha.ogg",     "Pt-br-vinho.ogg", "Pt-br-inho.ogg"],
    # ── Laterais ──────────────────────────────────────────────────────
    "l.ogg":   ["Pt-br-la.ogg",      "Pt-br-lua.ogg",   "Pt-br-lado.ogg"],
    "lh.ogg":  ["Pt-br-lha.ogg",     "Pt-br-filho.ogg", "Pt-br-olho.ogg"],
    # ── Vibrantes ─────────────────────────────────────────────────────
    "r.ogg":   ["Pt-br-caro.ogg",    "Pt-br-cara.ogg",  "Pt-br-para.ogg"],
    "rr.ogg":  ["Pt-br-rato.ogg",    "Pt-br-ra.ogg",    "Pt-br-rua.ogg"],
}

# ════════════════════════════════════════════════════════════════════
# INSTALAR FFMPEG (se não estiver disponível)
# ════════════════════════════════════════════════════════════════════

def check_ffmpeg():
    return shutil.which("ffmpeg") is not None

def install_ffmpeg():
    system = platform.system().lower()
    print("\n📦 FFmpeg não encontrado. Instalando...\n")

    if system == "windows":
        print("  Baixando FFmpeg para Windows...")
        url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
        zip_path = os.path.join(os.environ.get("TEMP", "."), "ffmpeg.zip")
        extract_dir = os.path.join(os.environ.get("TEMP", "."), "ffmpeg_extracted")

        urllib.request.urlretrieve(url, zip_path)

        import zipfile
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(extract_dir)

        # Find ffmpeg.exe
        for root, dirs, files in os.walk(extract_dir):
            for f in files:
                if f == "ffmpeg.exe":
                    src = os.path.join(root, f)
                    dst = os.path.join(REPO_DIR, "ffmpeg.exe")
                    shutil.copy2(src, dst)
                    os.environ["PATH"] = REPO_DIR + os.pathsep + os.environ["PATH"]
                    print(f"  ✅ FFmpeg instalado em: {dst}")
                    return True

    elif system == "darwin":  # macOS
        print("  Instalando via Homebrew...")
        result = subprocess.run(["brew", "install", "ffmpeg"],
                                capture_output=True, text=True)
        if result.returncode == 0:
            print("  ✅ FFmpeg instalado via Homebrew")
            return True
        else:
            print("  ❌ Homebrew não encontrado.")
            print("  → Instale manualmente: https://ffmpeg.org/download.html")
            return False

    elif system == "linux":
        print("  Instalando via apt-get...")
        result = subprocess.run(
            ["sudo", "apt-get", "install", "-y", "ffmpeg"],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print("  ✅ FFmpeg instalado via apt-get")
            return True
        else:
            # Try without sudo (some environments)
            result2 = subprocess.run(
                ["apt-get", "install", "-y", "ffmpeg"],
                capture_output=True, text=True
            )
            if result2.returncode == 0:
                print("  ✅ FFmpeg instalado")
                return True
            print("  ❌ Não foi possível instalar automaticamente.")
            print("  → Execute: sudo apt-get install ffmpeg")
            return False

    return False

# ════════════════════════════════════════════════════════════════════
# DOWNLOAD DO WIKIMEDIA COMMONS
# ════════════════════════════════════════════════════════════════════

def download_wikimedia(filename, dest_path):
    """
    Tenta baixar um arquivo do Wikimedia Commons via Special:FilePath.
    Retorna True se bem-sucedido, False caso contrário.
    """
    url = WK_BASE + urllib.parse.quote(filename)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; PortuguesPhonemeDownloader/1.0; "
                      "ricardomarqueslima/ingles-instrumental on GitHub)"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            if len(data) < 1000:  # arquivo muito pequeno = provavelmente erro
                return False
            with open(dest_path, "wb") as f:
                f.write(data)
            return True
    except Exception:
        return False

# ════════════════════════════════════════════════════════════════════
# CONVERSÃO OGG (normalizar volume e formato)
# ════════════════════════════════════════════════════════════════════

def convert_to_ogg(src, dst):
    """
    Converte qualquer formato de áudio para OGG Vorbis mono 22050Hz.
    Aplica: remoção de silêncio inicial, normalização -16 LUFS (EBU R128).
    """
    cmd = [
        "ffmpeg", "-y", "-i", src,
        "-af", "silenceremove=1:0:-50dB,loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ac", "1",          # mono
        "-ar", "22050",      # 22 kHz
        "-c:a", "libvorbis",
        "-q:a", "4",         # qualidade OGG (~128 kbps)
        dst
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0

# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

def main():
    import urllib.parse

    print("=" * 65)
    print("  DOWNLOADER DE FONEMAS pt-BR — Português 1 / SPA")
    print("=" * 65)
    print(f"\n  Destino: {AUDIO_DIR}")
    print(f"  Fonemas: {len(PHONEME_MAP)} arquivos\n")

    # 1. Verificar/instalar FFmpeg
    if not check_ffmpeg():
        ok = install_ffmpeg()
        if not ok:
            print("\n❌ FFmpeg é obrigatório. Instale e execute novamente.")
            sys.exit(1)
    else:
        print(f"  FFmpeg: ✅ {shutil.which('ffmpeg')}")

    # 2. Criar diretório de destino
    os.makedirs(AUDIO_DIR, exist_ok=True)
    tmp_dir = os.path.join(AUDIO_DIR, "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    # 3. Download + conversão
    results = {"ok": [], "fallback": [], "failed": []}

    print(f"\n{'─'*65}")
    print(f"  {'Arquivo':<12} {'Status':<10} {'Fonte'}")
    print(f"{'─'*65}")

    for dest_name, candidates in PHONEME_MAP.items():
        dest_path = os.path.join(AUDIO_DIR, dest_name)
        downloaded = False
        used_candidate = None

        for candidate in candidates:
            tmp_path = os.path.join(tmp_dir, candidate)
            if download_wikimedia(candidate, tmp_path):
                # Converter para o formato padrão do sistema
                if convert_to_ogg(tmp_path, dest_path):
                    downloaded = True
                    used_candidate = candidate
                    os.remove(tmp_path)
                    break
                else:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
            time.sleep(0.3)  # respeitar rate limit do Wikimedia

        if downloaded:
            size = os.path.getsize(dest_path) // 1024
            is_primary = used_candidate == candidates[0]
            status = "✅ OK" if is_primary else "⚠️  alt"
            print(f"  {dest_name:<12} {status:<10} {used_candidate}  ({size} KB)")
            if is_primary:
                results["ok"].append(dest_name)
            else:
                results["fallback"].append(dest_name)
        else:
            print(f"  {dest_name:<12} ❌ falhou  (mantido arquivo atual)")
            results["failed"].append(dest_name)

    # 4. Limpar tmp
    shutil.rmtree(tmp_dir, ignore_errors=True)

    # 5. Relatório final
    print(f"\n{'═'*65}")
    print(f"  RESULTADO FINAL")
    print(f"{'─'*65}")
    print(f"  ✅ Baixados (1ª opção):  {len(results['ok'])}")
    print(f"  ⚠️  Baixados (alternativa): {len(results['fallback'])}")
    print(f"  ❌ Não encontrados:      {len(results['failed'])}")
    if results["failed"]:
        print(f"\n  Arquivos não encontrados (mantém espeak-ng):")
        for f in results["failed"]:
            print(f"    • {f}")

    total_real = len(results["ok"]) + len(results["fallback"])
    print(f"\n  {total_real}/{len(PHONEME_MAP)} fonemas com áudio real de falante nativo ✅")

    # 6. Git commit automático (opcional)
    if total_real > 0:
        print(f"\n{'─'*65}")
        ans = input("  Fazer git push automático para o GitHub? [s/N] ").strip().lower()
        if ans == "s":
            cmds = [
                ["git", "add", "audio/"],
                ["git", "commit", "-m",
                 f"Audio: {total_real} fonemas reais pt-BR (Wikimedia Commons CC BY-SA)"],
                ["git", "push", "origin", "main"],
            ]
            for cmd in cmds:
                r = subprocess.run(cmd, cwd=REPO_DIR, capture_output=True, text=True)
                if r.returncode == 0:
                    print(f"  ✅ {' '.join(cmd[:2])}")
                else:
                    print(f"  ❌ {' '.join(cmd[:2])}: {r.stderr.strip()[:80]}")

    print(f"\n{'═'*65}")
    print("  Pronto! Recarregue a plataforma para ouvir os novos áudios.")
    print(f"{'═'*65}\n")

    # 7. Créditos (obrigatório CC BY-SA)
    print("  ATRIBUIÇÃO (CC BY-SA 2.0 BR — obrigatória):")
    print("  Arquivos de áudio: Diego Santos, falante nativo brasileiro,")
    print("  Wikimedia Commons. Licença: CC BY-SA 2.0 BR")
    print("  https://creativecommons.org/licenses/by-sa/2.0/br/\n")

if __name__ == "__main__":
    main()
