#!/usr/bin/env python3
"""
Gera a Figura 1 do resumo: arquitetura de referencia em camadas.

Gramatica visual de Lin et al. (2025): faixas enviesadas, propriedades a
esquerda, componentes com icone ao centro, painel de principios a direita.

Layout calculado, nao digitado: cada icone e desenhado num sistema local
centrado em (0,0) e posicionado por translate no mesmo x do rotulo, entao
alinhamento icone/texto e consequencia da construcao, nao ajuste manual.
"""

W, H = 1700, 880
SKEW = 22          # deslocamento horizontal por faixa, de baixo para cima
BAND_H = 138
PITCH = 158
TOP = 40
BAND_X, BAND_W = 286, 900
COL0, COLSTEP = 520, 152   # centro da primeira coluna de componente

INK, MUTE, LINE = "#1F2328", "#5A626B", "#A8B0B8"

CAMADAS = [
    ("Aplicação",   "#EFE4E8", ["Interoperável", "Multi-operador", "Agnóstica de modalidade"],
     [("chart", "Painel"), ("lens", "Auditoria"), ("plug", "Integração"), ("user", "Terceiro")]),
    ("Verificação", "#F2E9DA", ["Integridade", "Autenticidade", "Não repúdio", "Verificável por terceiro"],
     [("key", "Chave pública"), ("pen", "Assinatura"), ("shield", "Prova de inclusão"), ("badge", "Identidade")]),
    ("Dados",       "#E2EBE3", ["Tipado", "Canônico", "Reconstruível"],
     [("mail", "Envelope"), ("braces", "Schemas"), ("grid", "SenML"), ("disc", "Persistência")]),
    ("Ancoragem",   "#E6E3EE", ["Imutável", "Público", "Custo desprezível"],
     [("doc", "Projeção"), ("tree", "Merkle"), ("hash", "Raiz 32 B"), ("link", "On-chain")]),
    ("Borda",       "#DFE7EE", ["Privado por projeto", "Baixo custo", "Independente"],
     [("mic", "Microfone"), ("wave", "Pré-processo"), ("chip", "Modelo INT8"), ("arrow", "Inferência")]),
]

PRINCIPIOS = [
    ("Verificabilidade sem", "confiar no operador", "0 chamadas ao operador"),
    ("Interoperabilidade",   "semântica",           "2 modalidades, 8 tipos"),
    ("Privacidade",          "por projeto",         "nenhum byte de áudio sai do nó"),
    ("Custo de verificação", "desprezível",         "38.780 leituras em 32 bytes"),
    ("Independência",        "entre operadores",    "a chave pública é a identidade"),
]

# Icones num sistema local centrado em (0,0), extensao util de -11 a 11.
ICON = {
 "chart":  '<path d="M-9 7V-1M-3 7V-7M3 7V-4M9 7V-8"/>',
 "lens":   '<circle cx="-2" cy="-2" r="7"/><path d="M3.2 3.2 9 9"/>',
 "plug":   '<path d="M-6-8v6a6 6 0 0 0 12 0v-6M-3-8v-2M3-8v-2M0 4v6"/>',
 "user":   '<circle cx="0" cy="-4" r="4.5"/><path d="M-8 9a8 8 0 0 1 16 0"/>',
 "key":    '<circle cx="-5" cy="0" r="4.5"/><path d="M-0.5 0H9M6 0v4M9 0v5"/>',
 "pen":    '<path d="M-8 8 -6 2 4-8l4 4L-2 6z"/><path d="M-6 2 -2 6"/>',
 "shield": '<path d="M0-9 8-6v6c0 5-4 8-8 9-4-1-8-4-8-9v-6z"/><path d="M-3.5 0 -1 3 4-3"/>',
 "badge":  '<rect x="-9" y="-7" width="18" height="14" rx="2"/><circle cx="-3.5" cy="-1" r="2.6"/><path d="M2 -3h5M2 1h5"/>',
 "mail":   '<rect x="-9" y="-6.5" width="18" height="13" rx="1.5"/><path d="M-9-6 0 1 9-6"/>',
 "braces": '<path d="M-3-9c-3 0-3 3-3 5s0 4-3 4c3 0 3 2 3 4s0 5 3 5"/><path d="M3-9c3 0 3 3 3 5s0 4 3 4c-3 0-3 2-3 4s0 5-3 5"/>',
 "grid":   '<rect x="-9" y="-7" width="18" height="14" rx="1.5"/><path d="M-9-2h18M-9 2.5h18M-2.5-7v14M3-7v14"/>',
 "disc":   '<ellipse cx="0" cy="-5.5" rx="8" ry="3.2"/><path d="M-8-5.5v11c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2v-11"/><path d="M-8 0c0 1.8 3.6 3.2 8 3.2S8 1.8 8 0"/>',
 "doc":    '<path d="M-7-9h9l5 5v13h-14z"/><path d="M2-9v5h5"/><path d="M-4 2h8M-4 5.5h8"/>',
 "tree":   '<circle cx="0" cy="-7" r="2.4"/><circle cx="-5" cy="0" r="2.4"/><circle cx="5" cy="0" r="2.4"/>'
           '<circle cx="-8" cy="7" r="2.2"/><circle cx="-2" cy="7" r="2.2"/><circle cx="2" cy="7" r="2.2"/><circle cx="8" cy="7" r="2.2"/>'
           '<path d="M-1.4-5.2 -3.8-2M1.4-5.2 3.8-2M-6-2 -7.2 4.8M-4-2 -2.8 4.8M4-2 2.8 4.8M6-2 7.2 4.8"/>',
 "hash":   '<path d="M-4-9-6 9M4-9 2 9M-8-3H8M-9 3H7"/>',
 "link":   '<rect x="-10" y="-4" width="11" height="8" rx="4"/><rect x="-1" y="-4" width="11" height="8" rx="4"/>',
 "mic":    '<rect x="-3.5" y="-9" width="7" height="12" rx="3.5"/><path d="M-7 0a7 7 0 0 0 14 0M0 7v3M-4 10h8"/>',
 "wave":   '<path d="M-9-3v6M-6-6v12M-3-9v18M0-6v12M3-8v16M6-5v10M9-2v4"/>',
 "chip":   '<rect x="-6.5" y="-6.5" width="13" height="13" rx="1.5"/><rect x="-2.5" y="-2.5" width="5" height="5"/>'
           '<path d="M-3-9v2.5M0-9v2.5M3-9v2.5M-3 6.5V9M0 6.5V9M3 6.5V9M-9-3h2.5M-9 0h2.5M-9 3h2.5M6.5-3H9M6.5 0H9M6.5 3H9"/>',
 "arrow":  '<circle cx="-5" cy="0" r="4.5"/><path d="M0 0h8M5 -3l3 3-3 3"/>',
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build():
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
         f'role="img" aria-label="Arquitetura de referencia em cinco camadas: Aplicacao, Verificacao, '
         f'Dados, Ancoragem e Borda. Cada camada lista as propriedades que garante e os componentes que a '
         f'instanciam. A direita, os principios sustentados com os valores medidos." '
         f'font-family="Arial, sans-serif">',
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>']

    band_y, anchors = [], []
    for i, (nome, cor, props, comps) in enumerate(CAMADAS):
        y = TOP + i * PITCH
        band_y.append(y)
        off = (len(CAMADAS) - 1 - i) * SKEW          # topo mais deslocado a direita
        x0, x1 = BAND_X + off, BAND_X + off + BAND_W
        o.append(f'<polygon points="{x0+SKEW},{y} {x1+SKEW},{y} {x1},{y+BAND_H} {x0},{y+BAND_H}" '
                 f'fill="{cor}" stroke="{LINE}" stroke-width="1.2"/>')

        cy = y + BAND_H / 2
        n = len(props)
        for j, p in enumerate(props):
            py = cy - (n - 1) * 11 + j * 22 + 5
            o.append(f'<text x="{BAND_X+off-26:.0f}" y="{py:.0f}" text-anchor="end" class="prop"'
                     f' >{esc(p)}</text>')

        o.append(f'<text x="{x0+34:.0f}" y="{cy+9:.0f}" class="layer" fill="{INK}" font-size="30" font-weight="bold" font-family="Charter, Georgia, serif">{esc(nome)}</text>')

        for j, (ic, lab) in enumerate(comps):
            cxp = COL0 + off + j * COLSTEP           # mesmo x para icone e rotulo
            o.append(f'<g transform="translate({cxp:.0f},{cy-12:.0f})" fill="none" stroke="{INK}" '
                     f'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICON[ic]}</g>')
            o.append(f'<text x="{cxp:.0f}" y="{cy+34:.0f}" text-anchor="middle" class="comp" fill="{INK}" font-size="17.5">{esc(lab)}</text>')
            anchors.append((x1, cy))

    # painel de principios
    px, pw = 1372, 300
    ptop, pbot = TOP - 12, TOP + 4 * PITCH + BAND_H + 12
    o.append(f'<rect x="{px}" y="{ptop}" width="{pw}" height="{pbot-ptop}" fill="#F7F8FA" stroke="{LINE}"/>')
    o.append(f'<text x="{px+pw/2:.0f}" y="{ptop+30:.0f}" text-anchor="middle" class="phead" fill="{INK}" font-size="13" font-weight="bold" letter-spacing="2.1">PRINCÍPIOS SUSTENTADOS</text>')
    bh, gap = 118, 22
    for i, (l1, l2, val) in enumerate(PRINCIPIOS):
        by = ptop + 48 + i * (bh + gap)
        o.append(f'<rect x="{px+18}" y="{by}" width="{pw-36}" height="{bh}" fill="#ffffff" stroke="{LINE}"/>')
        o.append(f'<text x="{px+pw/2:.0f}" y="{by+34:.0f}" text-anchor="middle" class="pname" fill="{INK}" font-size="18" font-family="Charter, Georgia, serif">{esc(l1)}</text>')
        o.append(f'<text x="{px+pw/2:.0f}" y="{by+57:.0f}" text-anchor="middle" class="pname" fill="{INK}" font-size="18" font-family="Charter, Georgia, serif">{esc(l2)}</text>')
        o.append(f'<line x1="{px+50}" y1="{by+72}" x2="{px+pw-50}" y2="{by+72}" stroke="{LINE}"/>')
        o.append(f'<text x="{px+pw/2:.0f}" y="{by+95:.0f}" text-anchor="middle" class="pval" fill="{MUTE}" font-size="14">{esc(val)}</text>')
        # conector da camada correspondente ate a caixa
        ly = band_y[i] + BAND_H / 2
        lx = BAND_X + (len(CAMADAS) - 1 - i) * SKEW + BAND_W
        my = by + bh / 2
        o.append(f'<path d="M{lx:.0f} {ly:.0f} C{lx+40:.0f} {ly:.0f} {px-40} {my:.0f} {px+18} {my:.0f}" '
                 f'fill="none" stroke="{LINE}" stroke-width="1.4"/>')

    o.append("</svg>")
    return "\n".join(o)


if __name__ == "__main__":
    open("arquitetura-resumo.svg", "w").write(build())
    print("arquitetura-resumo.svg gerado")
