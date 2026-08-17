#!/usr/bin/env python3
"""
Coleta e analise de ground truth para o classificador acustico embarcado
(ESP32-S3, modelo ei-claro-kws-v84, classes claro/noise/unknown).

Motivacao: o banco de producao guarda apenas os eventos que passaram pela
politica de publicacao do firmware (PUBLISH_THRESHOLD_CLARO = 0.30 com
prioridade sobre o argmax, refractory de 3 s). Aquilo mede a configuracao da
demo, nao o desempenho do modelo. Este script captura a saida bruta por frame
do Serial, com rotulo conhecido, e produz matriz de confusao, precision/recall
e varredura de threshold.

Uso:
    pip install pyserial --break-system-packages
    python3 ground-truth.py record  --out sessao-01.jsonl
    python3 ground-truth.py analyze --in  sessao-01.jsonl --md tabela.md

O firmware NAO precisa ser modificado. Ele ja imprime, por frame:
    [HH:MM:SS.mmm BRT] claro=0.88  noise=0.05  unknown=0.07  -> claro (0.88)

O timestamp do device nao e usado para alinhamento: o campo de milissegundos e
`millis() % 1000`, livre em relacao a borda do segundo, entao nao e confiavel.
O alinhamento usa o relogio do host, que carimba cada linha na chegada e emite
os cues. Latencia de USB CDC e de ordem de milissegundos, desprezivel frente a
janela de 2 s.
"""

import argparse
import json
import re
import sys
import time
from collections import Counter

BAUD = 115200
LABELS = ["claro", "noise", "unknown"]

# Politica de publicacao vigente no firmware (esp32s3.ino, linhas 117-118).
DEPLOYED_THRESHOLD_CLARO = 0.30
DEPLOYED_THRESHOLD_UNKNOWN = 0.92

FRAME_RE = re.compile(
    r"claro=(?P<claro>[0-9.]+)\s+noise=(?P<noise>[0-9.]+)\s+unknown=(?P<unknown>[0-9.]+)"
)

# ---------------------------------------------------------------- protocolo

# Cada bloco: (nome, tipo, n_cues ou duracao_s, intervalo_s, prompt)
# tipo "positive"  -> janela apos o cue e rotulada claro
# tipo "negative"  -> janela apos o cue e rotulada nao-claro (confundivel)
# tipo "ambient"   -> bloco inteiro rotulado nao-claro, sem cue
PROTOCOL = [
    ("A-positivo", "positive", 30, 6.0, 'diga: "claro"'),
    ("B-confundivel", "negative", 30, 6.0, None),  # palavra sorteada da lista
    ("C-ambiente", "ambient", 300, None, "silencio / ruido ambiente, nao fale"),
    ("D-fala", "ambient", 300, None, "fale continuamente SEM usar a palavra claro"),
]

CONFUSABLES = ["carro", "quadro", "quatro", "clima", "prato", "grito", "cravo", "claque"]

CUE_WINDOW_S = 2.0   # janela apos o cue em que a elocucao e esperada
CUE_LEAD_S = 0.3     # atraso de reacao humana antes de comecar a falar


# ---------------------------------------------------------------- record

def autodetect_port():
    from serial.tools import list_ports
    cands = [p.device for p in list_ports.comports()
             if "usbmodem" in p.device or "usbserial" in p.device or "wchusb" in p.device]
    if not cands:
        sys.exit("Nenhuma porta serial encontrada. Passe --port explicitamente.\n"
                 "Liste com: python3 -m serial.tools.list_ports")
    if len(cands) > 1:
        sys.exit(f"Mais de uma porta candidata: {cands}. Passe --port.")
    return cands[0]


def cmd_record(args):
    import threading
    import serial

    port = args.port or autodetect_port()
    ser = serial.Serial(port, BAUD, timeout=0.2)
    out = open(args.out, "w", encoding="utf-8")
    stop = threading.Event()

    meta = {
        "kind": "meta",
        "t": time.time(),
        "port": port,
        "baud": BAUD,
        "operator": args.operator,
        "room": args.room,
        "distance_m": args.distance_m,
        "notes": args.notes,
        "protocol": [list(b) for b in PROTOCOL],
        "cue_window_s": CUE_WINDOW_S,
        "cue_lead_s": CUE_LEAD_S,
    }
    out.write(json.dumps(meta, ensure_ascii=False) + "\n")
    out.flush()

    def reader():
        buf = b""
        while not stop.is_set():
            chunk = ser.read(256)
            if not chunk:
                continue
            buf += chunk
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                t = time.time()
                s = line.decode("utf-8", "replace").strip()
                m = FRAME_RE.search(s)
                if m:
                    rec = {"kind": "frame", "t": t,
                           "claro": float(m["claro"]),
                           "noise": float(m["noise"]),
                           "unknown": float(m["unknown"])}
                else:
                    rec = {"kind": "line", "t": t, "raw": s}
                out.write(json.dumps(rec, ensure_ascii=False) + "\n")
                out.flush()

    th = threading.Thread(target=reader, daemon=True)
    th.start()

    print(f"Porta {port} @ {BAUD}. Gravando em {args.out}.")
    print("Aguardando 10 s de aquecimento (deixe o ambiente em silencio)...")
    time.sleep(10)

    try:
        for name, kind, n_or_dur, interval, prompt in PROTOCOL:
            print(f"\n=== BLOCO {name} ({kind}) ===")
            if kind == "ambient":
                dur = n_or_dur
                out.write(json.dumps({"kind": "block", "t": time.time(),
                                      "name": name, "type": kind,
                                      "duration_s": dur, "prompt": prompt},
                                     ensure_ascii=False) + "\n")
                out.flush()
                print(f"{prompt}  ({dur}s)")
                _countdown(dur)
                out.write(json.dumps({"kind": "block_end", "t": time.time(),
                                      "name": name}, ensure_ascii=False) + "\n")
                out.flush()
                continue

            out.write(json.dumps({"kind": "block", "t": time.time(),
                                  "name": name, "type": kind},
                                 ensure_ascii=False) + "\n")
            out.flush()
            input(f"{n_or_dur} elocucoes, uma a cada {interval}s. ENTER para comecar...")
            for i in range(n_or_dur):
                word = prompt if prompt else f'diga: "{CONFUSABLES[i % len(CONFUSABLES)]}"'
                t_cue = time.time()
                out.write(json.dumps({"kind": "cue", "t": t_cue, "block": name,
                                      "type": kind, "index": i,
                                      "word": word}, ensure_ascii=False) + "\n")
                out.flush()
                print(f"  [{i+1:>2}/{n_or_dur}] >>> {word}")
                time.sleep(interval)
            out.write(json.dumps({"kind": "block_end", "t": time.time(),
                                  "name": name}, ensure_ascii=False) + "\n")
            out.flush()
    except KeyboardInterrupt:
        print("\nInterrompido. O que foi gravado ate aqui e analisavel.")
    finally:
        stop.set()
        time.sleep(0.5)
        ser.close()
        out.close()
        print(f"\nGravado: {args.out}")


def _countdown(dur):
    t0 = time.time()
    while time.time() - t0 < dur:
        rem = int(dur - (time.time() - t0))
        print(f"\r  restam {rem:>4}s ", end="", flush=True)
        time.sleep(1)
    print()


# ---------------------------------------------------------------- analyze

def load(path):
    meta, frames, cues, blocks = None, [], [], []
    for line in open(path, encoding="utf-8"):
        r = json.loads(line)
        k = r["kind"]
        if k == "meta":
            meta = r
        elif k == "frame":
            frames.append(r)
        elif k == "cue":
            cues.append(r)
        elif k in ("block", "block_end"):
            blocks.append(r)
    return meta, frames, cues, blocks


def label_frames(meta, frames, cues, blocks):
    """Rotula cada frame como 'claro' ou 'nao-claro' pelo protocolo."""
    win = (meta or {}).get("cue_window_s", CUE_WINDOW_S)
    lead = (meta or {}).get("cue_lead_s", CUE_LEAD_S)

    # intervalos dos blocos ambient
    amb = []
    open_block = None
    for b in blocks:
        if b["kind"] == "block" and b.get("duration_s"):
            open_block = b
        elif b["kind"] == "block_end" and open_block:
            amb.append((open_block["t"], b["t"], open_block["name"]))
            open_block = None

    pos_windows = [(c["t"] + lead, c["t"] + lead + win, c["block"])
                   for c in cues if c["type"] == "positive"]
    neg_windows = [(c["t"] + lead, c["t"] + lead + win, c["block"])
                   for c in cues if c["type"] == "negative"]

    out = []
    for f in frames:
        t = f["t"]
        lab, ctx = None, None
        for a, b, name in pos_windows:
            if a <= t <= b:
                lab, ctx = "claro", name
                break
        if lab is None:
            for a, b, name in neg_windows:
                if a <= t <= b:
                    lab, ctx = "nao-claro", name
                    break
        if lab is None:
            for a, b, name in amb:
                if a <= t <= b:
                    lab, ctx = "nao-claro", name
                    break
        if lab is not None:
            out.append({**f, "label": lab, "block": ctx})
    return out, pos_windows, neg_windows, amb


def deployed_decision(f):
    """Reproduz a regra do firmware, sem cooldown/refractory (por frame)."""
    if f["claro"] >= DEPLOYED_THRESHOLD_CLARO:
        return "claro"
    argmax = max(LABELS, key=lambda k: f[k])
    if argmax == "unknown" and f["unknown"] >= DEPLOYED_THRESHOLD_UNKNOWN:
        return "unknown"
    return None


def prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else 0.0
    r = tp / (tp + fn) if tp + fn else 0.0
    f = 2 * p * r / (p + r) if p + r else 0.0
    return p, r, f


def cmd_analyze(args):
    meta, frames, cues, blocks = load(args.infile)
    lab, pos_w, neg_w, amb = label_frames(meta, frames, cues, blocks)
    if not lab:
        sys.exit("Nenhum frame rotulavel. A sessao tem cues e blocos?")

    n_pos = sum(1 for f in lab if f["label"] == "claro")
    n_neg = len(lab) - n_pos

    # --- 1. matriz de confusao por argmax (3 classes preditas x 2 rotulos)
    conf = Counter()
    for f in lab:
        pred = max(LABELS, key=lambda k: f[k])
        conf[(f["label"], pred)] += 1

    # --- 2. regra implantada (threshold 0.30 com prioridade)
    tp = sum(1 for f in lab if f["label"] == "claro" and deployed_decision(f) == "claro")
    fp = sum(1 for f in lab if f["label"] == "nao-claro" and deployed_decision(f) == "claro")
    fn = n_pos - tp
    p_dep, r_dep, f_dep = prf(tp, fp, fn)

    # --- 3. varredura de threshold sobre a probabilidade de claro
    sweep = []
    for th in [i / 20 for i in range(1, 20)]:
        t_ = sum(1 for f in lab if f["label"] == "claro" and f["claro"] >= th)
        f_ = sum(1 for f in lab if f["label"] == "nao-claro" and f["claro"] >= th)
        n_ = n_pos - t_
        sweep.append((th, *prf(t_, f_, n_)))
    best = max(sweep, key=lambda r: r[3])

    # --- 4. deteccao por elocucao (o que importa para a aplicacao)
    det = 0
    for a, b, _ in pos_w:
        if any(a <= f["t"] <= b and f["claro"] >= DEPLOYED_THRESHOLD_CLARO for f in lab):
            det += 1
    recall_utt = det / len(pos_w) if pos_w else 0.0

    amb_s = sum(b - a for a, b, _ in amb)
    amb_fp = sum(1 for f in lab
                 if f["block"] in {n for _, _, n in amb}
                 and f["claro"] >= DEPLOYED_THRESHOLD_CLARO)
    fa_per_min = amb_fp / (amb_s / 60) if amb_s else float("nan")

    md = []
    md.append("## Avaliacao experimental do classificador acustico embarcado\n")
    md.append(f"Sessao: {args.infile}. Frames rotulados: {len(lab)} "
              f"({n_pos} em janela de elocucao, {n_neg} fora). "
              f"Elocucoes-alvo: {len(pos_w)}. "
              f"Ruido/fala sem keyword: {amb_s/60:.1f} min.\n")

    md.append("\n### Tabela 1. Desempenho por frame\n")
    md.append("| Metrica | Valor |")
    md.append("|---|---|")
    md.append(f"| Precision (regra implantada, claro >= {DEPLOYED_THRESHOLD_CLARO:.2f}) | {p_dep:.3f} |")
    md.append(f"| Recall (regra implantada) | {r_dep:.3f} |")
    md.append(f"| F1 (regra implantada) | {f_dep:.3f} |")
    md.append(f"| F1 maximo na varredura (threshold {best[0]:.2f}) | {best[3]:.3f} |")
    md.append(f"| Recall por elocucao | {recall_utt:.3f} ({det}/{len(pos_w)}) |")
    md.append(f"| Falsos positivos por minuto (ruido e fala sem keyword) | {fa_per_min:.2f} |")

    md.append("\n### Tabela 2. Matriz de confusao por argmax\n")
    md.append("| Rotulo \\ Predito | claro | noise | unknown |")
    md.append("|---|---|---|---|")
    for real in ("claro", "nao-claro"):
        row = " | ".join(str(conf[(real, p)]) for p in LABELS)
        md.append(f"| {real} | {row} |")

    md.append("\n### Tabela 3. Varredura de threshold de `claro`\n")
    md.append("| Threshold | Precision | Recall | F1 |")
    md.append("|---|---|---|---|")
    for th, p, r, f in sweep:
        mark = "  <-- implantado" if abs(th - DEPLOYED_THRESHOLD_CLARO) < 1e-9 else ""
        md.append(f"| {th:.2f} | {p:.3f} | {r:.3f} | {f:.3f}{mark} |")

    text = "\n".join(md)
    print(text)
    if args.md:
        open(args.md, "w", encoding="utf-8").write(text + "\n")
        print(f"\n[escrito] {args.md}", file=sys.stderr)


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("record", help="captura serial + emite cues do protocolo")
    r.add_argument("--port", help="ex: /dev/cu.usbmodem101 (autodetecta se omitido)")
    r.add_argument("--out", required=True, help="arquivo .jsonl de saida")
    r.add_argument("--operator", default="", help="quem falou (locutor)")
    r.add_argument("--room", default="", help="ambiente da coleta")
    r.add_argument("--distance_m", type=float, default=1.0, help="distancia boca-microfone")
    r.add_argument("--notes", default="")
    r.set_defaults(func=cmd_record)

    a = sub.add_parser("analyze", help="matriz de confusao, PRF e varredura")
    a.add_argument("--in", dest="infile", required=True)
    a.add_argument("--md", help="escreve as tabelas em markdown neste arquivo")
    a.set_defaults(func=cmd_analyze)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
