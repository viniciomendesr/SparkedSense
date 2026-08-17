#!/usr/bin/env python3
"""
Bateria de verificacao por terceiro independente.

Avalia a ARQUITETURA, nao o classificador. Todas as metricas rodam sobre o
estado ja persistido; nenhuma exige coleta nova nem hardware ligado.

O verificador aqui simula um consumidor externo que possui apenas:
  (a) o envelope, tal como armazenado;
  (b) a chave publica do dispositivo, extraida do proprio campo `source`;
  (c) a raiz de Merkle ancorada on-chain.
Ele NAO chama nenhum endpoint do operador da plataforma. Essa e a condicao
que a arquitetura afirma satisfazer, entao e a condicao sob a qual ela deve
ser medida.

Uso:
    pip install psycopg[binary] ecdsa --break-system-packages
    python3 verificacao-terceiro.py --dsn "postgresql://..." --limit 5000 --md tabela1.md

O DSN sai de `supabase/.temp/pooler-url` mais a senha do projeto, ou do painel
do Supabase em Project Settings > Database > Connection string.
"""

import argparse
import hashlib
import json
import random
import sys
from collections import Counter

from ecdsa import VerifyingKey, SECP256k1
from ecdsa.util import sigdecode_string

UNSIGNED = "unsigned_dev"

# Ordem canonica documentada em index.ts para o hash por leitura que alimenta a
# arvore de Merkle. Duas formas coexistem no codigo:
#   envelope (readings)        -> {sensorId, timestamp, variable, value, unit}
#   legado  (sensor_readings)  -> {sensorId, timestamp, value, unit}
LEAF_FORM_ENVELOPE = ("sensorId", "timestamp", "variable", "value", "unit")
LEAF_FORM_LEGACY = ("sensorId", "timestamp", "value", "unit")


# --------------------------------------------------------------- primitivas

def canonical_json(obj) -> str:
    """Equivalente a JSON.stringify(sortObjectKeysDeep(x)) do ingest.ts."""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def vk_from_hex(pub_hex: str):
    b = bytes.fromhex(pub_hex)
    if len(b) == 65 and b[0] == 4:
        b = b[1:]
    return VerifyingKey.from_string(b, curve=SECP256k1)


def verify_envelope(env: dict, pub_hex: str) -> bool:
    """Reproduz verifyEnvelopeSignature do backend, do lado de fora."""
    sig = env.get("signature")
    if not sig or sig == UNSIGNED:
        return False
    rest = {k: v for k, v in env.items() if k != "signature"}
    digest = hashlib.sha256(canonical_json(rest).encode("utf-8")).digest()
    try:
        return vk_from_hex(pub_hex).verify_digest(
            bytes.fromhex(sig), digest, sigdecode=sigdecode_string)
    except Exception:
        return False


def build_tree(reading_hashes):
    """Reproduz buildTree do merkle.ts. Folha = SHA256(hex do hash da leitura)."""
    if not reading_hashes:
        return {"root": sha256_hex(""), "layers": [[sha256_hex("")]], "leaves": []}
    leaves = [sha256_hex(h) for h in reading_hashes]
    layers = [leaves]
    cur = leaves
    while len(cur) > 1:
        nxt = []
        for i in range(0, len(cur), 2):
            left = cur[i]
            right = cur[i + 1] if i + 1 < len(cur) else cur[i]  # duplica impar
            nxt.append(sha256_hex(left + right))
        layers.append(nxt)
        cur = nxt
    return {"root": cur[0], "layers": layers, "leaves": leaves}


def gen_proof(tree, idx):
    proof = []
    for layer in range(len(tree["layers"]) - 1):
        cl = tree["layers"][layer]
        is_right = idx % 2 == 1
        sib = idx - 1 if is_right else idx + 1
        h = cl[sib] if sib < len(cl) else cl[idx]
        proof.append({"hash": h, "position": "left" if is_right else "right"})
        idx //= 2
    return proof


def verify_proof(leaf_hash, proof, root) -> bool:
    cur = leaf_hash
    for st in proof:
        cur = sha256_hex(st["hash"] + cur) if st["position"] == "left" \
            else sha256_hex(cur + st["hash"])
    return cur == root


# --------------------------------------------------------------- compatibilidade

SQL_DATASET = """
select value->>'merkleRoot' root, (value->>'readingsCount')::int n,
       value->>'sensorId' sensor_id, value->>'startDate' t0, value->>'endDate' t1
from kv_store_4a89e1c9 where key like 'dataset:%%'
"""

SQL_LEGACY_READINGS = """
select sr.id::text, sr.timestamp, sr.data
from sensor_readings sr
where sr.nft_address = %s and sr.timestamp >= %s and sr.timestamp < %s
order by sr.timestamp asc, sr.id asc
"""


def check_anchored_root(dsn):
    """Teste de compatibilidade: reconstroi a arvore do dataset ancorado e
    compara com a raiz que foi gravada on-chain.

    Este e o unico teste que prova que a reimplementacao local da arvore
    corresponde a implementacao que rodou em producao. A verificacao de
    assinatura ja se prova sozinha (uma assinatura so confere se o canonico
    for byte-identico), mas a arvore nao: ela so se prova contra a raiz real.
    """
    import psycopg
    out = []
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(SQL_DATASET)
        datasets = cur.fetchall()
        for root, n, sensor_id, t0, t1 in datasets:
            cur.execute(SQL_LEGACY_READINGS, (sensor_id, t0, t1))
            rows = cur.fetchall()
            hashes = []
            for rid, ts, data in rows:
                # forma canonica legada documentada em index.ts linha 169
                value = None
                for k in ("temperature", "humidity", "ph_level", "value"):
                    if isinstance(data, dict) and k in data:
                        value = data[k]
                        break
                canonical = canonical_json_ordered(
                    [("sensorId", sensor_id),
                     ("timestamp", ts.isoformat().replace("+00:00", "Z")),
                     ("value", value),
                     ("unit", "")])
                hashes.append(sha256_hex(canonical))
            tree = build_tree(hashes)
            out.append({"dataset_root_gravada": root,
                        "raiz_reconstruida": tree["root"],
                        "confere": tree["root"] == root,
                        "n_gravado": n, "n_lido": len(rows)})
    return out


def canonical_json_ordered(pairs):
    """JSON.stringify de objeto literal: ordem de insercao, sem espacos.
    A forma legada NAO ordena chaves; ela depende da ordem do literal."""
    body = ",".join(json.dumps(k) + ":" + json.dumps(v, ensure_ascii=False)
                    for k, v in pairs)
    return "{" + body + "}"


# --------------------------------------------------------------- carga

SQL_ENVELOPES = """
select r.id::text as id,
       r.spec_version,
       r.event_type,
       r.source,
       r.datacontenttype,
       to_char(r.time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as tstr,
       r.data,
       r.signature
from readings r
order by r.time desc
limit %s
"""

SQL_TYPES = """
select event_type, count(*) n,
       count(*) filter (where signature <> 'unsigned_dev') signed_n,
       count(distinct source) sources
from readings group by 1 order by n desc
"""

SQL_ONBOARDING = """
select d.id::text, d.created_at, min(r.time) first_reading,
       extract(epoch from (min(r.time) - d.created_at)) delay_s
from devices d join readings r on r.device_id = d.id
group by 1,2
"""


def load_from_db(dsn, limit):
    import psycopg
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(SQL_ENVELOPES, (limit,))
        cols = [c.name for c in cur.description]
        rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        cur.execute(SQL_TYPES)
        types = cur.fetchall()
        cur.execute(SQL_ONBOARDING)
        onboarding = cur.fetchall()
    return rows, types, onboarding


def row_to_envelope(row):
    """Reconstroi o envelope assinado a partir da linha persistida."""
    src = row["source"]
    pub = src.split("spark:device:", 1)[1] if "spark:device:" in src else None
    env = {
        "specversion": row["spec_version"],
        "id": row["id"],
        "source": src,
        "type": row["event_type"],
        "time": row["tstr"],
        "datacontenttype": row["datacontenttype"],
        "data": row["data"],
        "signature": row["signature"],
    }
    return env, pub


# --------------------------------------------------------------- mutacoes

def mutations(env):
    """Adulteracoes plausiveis. Cada uma deve ser rejeitada."""
    out = []

    e = json.loads(json.dumps(env))
    d = e["data"]
    if isinstance(d, list) and d and isinstance(d[0], dict) and isinstance(d[0].get("v"), (int, float)):
        d[0]["v"] = d[0]["v"] + 0.1
        out.append(("valor da medicao", e))
    elif isinstance(d, dict) and isinstance(d.get("confidence"), (int, float)):
        d["confidence"] = min(1.0, d["confidence"] + 0.01)
        out.append(("confianca da inferencia", e))

    e = json.loads(json.dumps(env))
    e["time"] = e["time"][:-4] + "9" + e["time"][-3:]
    out.append(("timestamp", e))

    e = json.loads(json.dumps(env))
    e["id"] = e["id"][:-1] + ("0" if e["id"][-1] != "0" else "1")
    out.append(("id do evento", e))

    e = json.loads(json.dumps(env))
    e["type"] = e["type"] + ".x"
    out.append(("tipo do evento", e))

    e = json.loads(json.dumps(env))
    if isinstance(e["data"], dict) and "model_id" in e["data"]:
        e["data"]["model_id"] = e["data"]["model_id"] + "x"
        out.append(("identificador do modelo", e))

    return out


# --------------------------------------------------------------- bateria

def run(rows, types, onboarding, sample_tamper):
    res = {}

    # ---- M1: verificacao por terceiro
    stats = Counter()
    verified = []
    for row in rows:
        env, pub = row_to_envelope(row)
        if env["signature"] == UNSIGNED:
            stats["marcador_unsigned_dev"] += 1
            continue
        if not pub:
            stats["source_sem_chave"] += 1
            continue
        if verify_envelope(env, pub):
            stats["verificado"] += 1
            verified.append((env, pub))
        else:
            stats["assinatura_invalida"] += 1
    signed_total = stats["verificado"] + stats["assinatura_invalida"]
    res["m1"] = {
        "total": len(rows),
        "assinados": signed_total,
        "verificados": stats["verificado"],
        "taxa": stats["verificado"] / signed_total if signed_total else 0.0,
        "detalhe": dict(stats),
    }

    # ---- M2: deteccao de adulteracao
    pool = verified[:sample_tamper]
    by_kind = Counter()
    tot = Counter()
    for env, pub in pool:
        for kind, mut in mutations(env):
            tot[kind] += 1
            if not verify_envelope(mut, pub):
                by_kind[kind] += 1
    res["m2"] = {"por_tipo": {k: (by_kind[k], tot[k]) for k in tot},
                 "total": (sum(by_kind.values()), sum(tot.values()))}

    # ---- M3: independencia do operador
    res["m3"] = {
        "chamadas_ao_operador_para_assinatura": 0,
        "insumos": ["envelope armazenado", "chave publica embutida em source"],
        "chamadas_ao_operador_para_inclusao": 1,
        "motivo_inclusao": (
            "a raiz esta on-chain, mas o conjunto de folhas nao. Reconstruir a "
            "arvore exige obter as leituras do dataset, hoje so pela API do "
            "operador ou por replicacao previa do conjunto."),
    }

    # ---- M4: heterogeneidade
    registrados = 8
    exercitados = len({t[0] for t in types})
    res["m4"] = {
        "schemas_registrados": registrados,
        "tipos_exercitados_por_hardware": exercitados,
        "por_tipo": [{"tipo": t[0], "n": t[1], "assinados": t[2], "fontes": t[3]} for t in types],
    }

    # ---- M5: custo
    sizes = []
    for row in rows:
        env, _ = row_to_envelope(row)
        sizes.append(len(canonical_json(env).encode("utf-8")))
    n_leaves = 38780  # dataset ancorado em 2026-04-23
    import math
    depth = math.ceil(math.log2(n_leaves))
    res["m5"] = {
        "envelope_bytes_medio": round(sum(sizes) / len(sizes)) if sizes else 0,
        "folhas_no_dataset_ancorado": n_leaves,
        "profundidade": depth,
        "prova_bytes": depth * 32,
        "raiz_bytes": 32,
        "bytes_permanentes_por_leitura": 32 / n_leaves,
    }

    # ---- M6: onboarding
    delays = sorted(float(o[3]) for o in onboarding if o[3] is not None)
    res["m6"] = {"n": len(delays),
                 "mediana_s": delays[len(delays) // 2] if delays else None,
                 "min_s": delays[0] if delays else None,
                 "max_s": delays[-1] if delays else None}

    # ---- M7: composicao das provas
    res["m7"] = {
        "assinatura_cobre": "envelope CloudEvents integral, menos o campo signature",
        "raiz_cobre": "projecao canonica {sensorId, timestamp, variable, value, unit}",
        "campos_assinados_fora_da_raiz": ["specversion", "id", "datacontenttype",
                                          "signature", "model_id", "dsp_ms", "nn_ms"],
        "compoem": False,
    }
    return res


def to_markdown(res):
    m = []
    m.append("## Tabela 1. Avaliacao da arquitetura por verificacao independente\n")
    m.append("| Metrica | Valor |")
    m.append("|---|---|")
    m1 = res["m1"]
    m.append(f"| Envelopes verificaveis por terceiro sem chamar o operador | "
             f"{m1['verificados']}/{m1['assinados']} ({m1['taxa']*100:.1f}%) |")
    tp = res["m2"]["total"]
    m.append(f"| Adulteracoes detectadas | {tp[0]}/{tp[1]} "
             f"({(tp[0]/tp[1]*100 if tp[1] else 0):.1f}%) |")
    m.append(f"| Chamadas ao operador exigidas pela verificacao de assinatura | "
             f"{res['m3']['chamadas_ao_operador_para_assinatura']} |")
    m.append(f"| Chamadas ao operador exigidas pela prova de inclusao | "
             f"{res['m3']['chamadas_ao_operador_para_inclusao']} |")
    m4 = res["m4"]
    m.append(f"| Tipos de evento aceitos sem alteracao no backend | "
             f"{m4['schemas_registrados']} registrados, "
             f"{m4['tipos_exercitados_por_hardware']} exercitados |")
    m5 = res["m5"]
    m.append(f"| Envelope canonico | {m5['envelope_bytes_medio']} bytes |")
    m.append(f"| Prova de inclusao | {m5['profundidade']} passos, {m5['prova_bytes']} bytes |")
    m.append(f"| Custo permanente por leitura verificavel | "
             f"{m5['bytes_permanentes_por_leitura']:.2e} bytes |")
    m6 = res["m6"]
    if m6["mediana_s"] is not None:
        m.append(f"| Latencia de onboarding de um no novo (mediana, n={m6['n']}) | "
                 f"{m6['mediana_s']:.0f} s |")

    m.append("\n### Detalhe da deteccao de adulteracao\n")
    m.append("| Campo adulterado | Rejeitados |")
    m.append("|---|---|")
    for k, (a, b) in sorted(res["m2"]["por_tipo"].items()):
        m.append(f"| {k} | {a}/{b} |")

    m.append("\n### Detalhe por tipo de evento\n")
    m.append("| Tipo | Eventos | Assinados | Fontes |")
    m.append("|---|---|---|---|")
    for t in res["m4"]["por_tipo"]:
        m.append(f"| `{t['tipo']}` | {t['n']} | {t['assinados']} | {t['fontes']} |")

    m.append("\n### Composicao das provas (limitacao arquitetural)\n")
    m7 = res["m7"]
    m.append(f"- A assinatura cobre: {m7['assinatura_cobre']}.")
    m.append(f"- A raiz ancorada cobre: {m7['raiz_cobre']}.")
    m.append(f"- Campos assinados que a raiz nao cobre: "
             f"{', '.join('`'+c+'`' for c in m7['campos_assinados_fora_da_raiz'])}.")
    m.append("- Consequencia: as duas provas nao compoem. Nao e possivel demonstrar, "
             "em uma cadeia unica, que um envelope assinado especifico pertence ao "
             "conjunto ancorado, porque a raiz nao se compromete com os bytes assinados.")
    return "\n".join(m)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dsn", required=True, help="postgresql://...")
    ap.add_argument("--limit", type=int, default=5000, help="envelopes a verificar")
    ap.add_argument("--tamper-sample", type=int, default=200,
                    help="envelopes usados no teste de adulteracao")
    ap.add_argument("--md", help="escreve as tabelas neste arquivo")
    ap.add_argument("--json", dest="jsonout", help="despeja o resultado bruto")
    ap.add_argument("--check-root", action="store_true",
                    help="reconstroi a arvore do dataset ancorado e compara com a raiz on-chain")
    a = ap.parse_args()

    random.seed(0)
    rows, types, onboarding = load_from_db(a.dsn, a.limit)
    if not rows:
        sys.exit("Nenhuma linha retornada.")
    res = run(rows, types, onboarding, a.tamper_sample)
    if a.check_root:
        res["compat"] = check_anchored_root(a.dsn)
        print("\n### Compatibilidade da arvore com a raiz ancorada\n")
        for c in res["compat"]:
            print(f"- gravada {c['dataset_root_gravada'][:16]}... | "
                  f"reconstruida {c['raiz_reconstruida'][:16]}... | "
                  f"confere: {c['confere']} | n {c['n_lido']}/{c['n_gravado']}")
    md = to_markdown(res)
    print(md)
    if a.md:
        open(a.md, "w", encoding="utf-8").write(md + "\n")
    if a.jsonout:
        json.dump(res, open(a.jsonout, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
