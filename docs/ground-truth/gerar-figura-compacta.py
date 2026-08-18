#!/usr/bin/env python3
"""
Figura 1 do resumo, versao compacta para caber em duas paginas.

Mantem a gramatica de Lin et al. (2025): faixas enviesadas, uma por camada,
com icone por componente. O que muda em relacao a versao poster e a densidade,
nao o vocabulario visual.

Duas decisoes de escala, ambas forcadas pelo limite de duas paginas:

1. Rotulo AO LADO do icone, nao embaixo. Uma faixa passa a precisar de uma
   altura de linha em vez de duas, o que e o que permite 3,6 cm no total.
2. Os rotulos de propriedade por camada saem. Em 3,6 cm eles cairiam para
   4,5 pt de corpo, abaixo do legivel em impressao.

A largura em pixels e deliberadamente baixa: os mesmos 15,80 cm de papel
divididos por menos pixels dao corpo maior no impresso. 1100 px sobre
15,80 cm da 69,6 px/cm, entao um rotulo de 18 px sai a 7,3 pt.
"""

W, H = 1100, 240
SKEW = 9
BAND_H = 40
PITCH = 46
TOP = 10
BAND_X, BAND_W = 46, 1010
NAME_W = 132               # coluna do nome da camada, dentro da faixa
COL0, COLSTEP = 232, 205   # inicio de cada componente, em x

INK, MUTE, LINE = "#1F2328", "#5B646E", "#A8B0B8"

CAMADAS = [
    ("Aplicação",   "#EFE4E8", [("chart", "Painel"), ("lens", "Auditoria"),
                                ("plug", "Integração"), ("user", "Terceiro")]),
    ("Verificação", "#F2E9DA", [("key", "Chave pública"), ("pen", "Assinatura"),
                                ("shield", "Prova de inclusão"), ("badge", "Identidade")]),
    ("Dados",       "#E2EBE3", [("mail", "Envelope"), ("braces", "Schemas"),
                                ("grid", "SenML"), ("disc", "Persistência")]),
    ("Ancoragem",   "#E6E3EE", [("doc", "Projeção"), ("tree", "Merkle"),
                                ("hash", "Raiz 32 B"), ("link", "On-chain")]),
    ("Borda",       "#DFE7EE", [("mic", "Sensor"), ("wave", "Pré-processo"),
                                ("chip", "Modelo embarcado"), ("arrow", "Inferência")]),
]

# Icones centrados em (0,0), extensao util de -7 a 7 nesta escala.
ICON = {
 "chart":  '<path d="M-6 4.5V-.5M-2 4.5V-4.5M2 4.5V-2.5M6 4.5V-5.5"/>',
 "lens":   '<circle cx="-1.5" cy="-1.5" r="4.6"/><path d="M2 2 6 6"/>',
 "plug":   '<path d="M-4-5.5v4a4 4 0 0 0 8 0v-4M-2-5.5v-1.5M2-5.5v-1.5M0 2.5v4"/>',
 "user":   '<circle cx="0" cy="-2.6" r="3"/><path d="M-5.4 6a5.4 5.4 0 0 1 10.8 0"/>',
 "key":    '<circle cx="-3.4" cy="0" r="3"/><path d="M-.4 0H6M4 0v2.6M6 0v3.2"/>',
 "pen":    '<path d="M-5.4 5.4 -4 1.4 2.6-5.4l2.8 2.8L-1.4 4z"/>',
 "shield": '<path d="M0-6 5.4-4v4c0 3.4-2.7 5.4-5.4 6-2.7-.6-5.4-2.6-5.4-6v-4z"/><path d="M-2.4 0-.7 2 2.7-2"/>',
 "badge":  '<rect x="-6" y="-4.6" width="12" height="9.2" rx="1.4"/><circle cx="-2.4" cy="-.6" r="1.7"/><path d="M1.4-2h3.2M1.4.8h3.2"/>',
 "mail":   '<rect x="-6" y="-4.4" width="12" height="8.8" rx="1"/><path d="M-6-4 0 .7 6-4"/>',
 "braces": '<path d="M-2-6c-2 0-2 2-2 3.4s0 2.6-2 2.6c2 0 2 1.4 2 2.6S-6 6-2 6"/>'
           '<path d="M2-6c2 0 2 2 2 3.4S4 0 6 0C4 0 4 1.4 4 2.6S6 6 2 6"/>',
 "grid":   '<rect x="-6" y="-4.6" width="12" height="9.2" rx="1"/><path d="M-6-1.4h12M-6 1.6h12M-1.6-4.6v9.2M1.6-4.6v9.2"/>',
 "disc":   '<ellipse cx="0" cy="-3.6" rx="5.4" ry="2.1"/><path d="M-5.4-3.6v7.2c0 1.2 2.4 2.1 5.4 2.1s5.4-.9 5.4-2.1v-7.2"/><path d="M-5.4 0c0 1.2 2.4 2.1 5.4 2.1S5.4 1.2 5.4 0"/>',
 "doc":    '<path d="M-4.6-6h6l3.2 3.2V6h-9.2z"/><path d="M1.4-6v3.2h3.2"/>',
 "tree":   '<circle cx="0" cy="-4.6" r="1.6"/><circle cx="-3.4" cy="0" r="1.6"/><circle cx="3.4" cy="0" r="1.6"/>'
           '<circle cx="-5.4" cy="4.6" r="1.4"/><circle cx="-1.4" cy="4.6" r="1.4"/><circle cx="1.4" cy="4.6" r="1.4"/><circle cx="5.4" cy="4.6" r="1.4"/>'
           '<path d="M-.9-3.4-2.5-1.4M.9-3.4 2.5-1.4M-4-1.3-4.8 3.2M-2.7-1.3-1.9 3.2M2.7-1.3 1.9 3.2M4-1.3 4.8 3.2"/>',
 "hash":   '<path d="M-2.6-6-4 6M2.6-6 1.2 6M-5.4-2H5.4M-6 2H4.8"/>',
 "link":   '<rect x="-6.6" y="-2.6" width="7.4" height="5.2" rx="2.6"/><rect x="-.8" y="-2.6" width="7.4" height="5.2" rx="2.6"/>',
 "mic":    '<rect x="-2.2" y="-6" width="4.4" height="7.6" rx="2.2"/><path d="M-4.6 0a4.6 4.6 0 0 0 9.2 0M0 4.4v2M-2.6 6.4h5.2"/>',
 "wave":   '<path d="M-6-2v4M-4-4v8M-2-6v12M0-4v8M2-5.4v10.8M4-3.4v6.8M6-1.4v2.8"/>',
 "chip":   '<rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="1"/><rect x="-1.6" y="-1.6" width="3.2" height="3.2"/>'
           '<path d="M-2-6v1.6M0-6v1.6M2-6v1.6M-2 4.4V6M0 4.4V6M2 4.4V6M-6-2h1.6M-6 0h1.6M-6 2h1.6M4.4-2H6M4.4 0H6M4.4 2H6"/>',
 "arrow":  '<circle cx="-3.4" cy="0" r="3"/><path d="M0 0h5.4M3.4-2l2 2-2 2"/>',
}


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build():
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
         f'role="img" aria-label="Arquitetura de referencia em cinco camadas: Aplicacao, Verificacao, '
         f'Dados, Ancoragem e Borda, cada uma com os componentes que a instanciam." '
         f'font-family="Arial, sans-serif">',
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>']

    for i, (nome, cor, comps) in enumerate(CAMADAS):
        y = TOP + i * PITCH
        off = (len(CAMADAS) - 1 - i) * SKEW
        x0, x1 = BAND_X + off, BAND_X + off + BAND_W
        o.append(f'<polygon points="{x0+SKEW},{y} {x1+SKEW},{y} {x1},{y+BAND_H} {x0},{y+BAND_H}" '
                 f'fill="{cor}" stroke="{LINE}" stroke-width="0.9"/>')
        cy = y + BAND_H / 2
        o.append(f'<text x="{x0+18:.0f}" y="{cy+7:.0f}" font-size="20" font-weight="bold" '
                 f'fill="{INK}" font-family="Charter, Georgia, serif">{esc(nome)}</text>')
        for j, (ic, lab) in enumerate(comps):
            ix = COL0 + off + j * COLSTEP
            o.append(f'<g transform="translate({ix:.0f},{cy:.0f})" fill="none" stroke="{INK}" '
                     f'stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">{ICON[ic]}</g>')
            o.append(f'<text x="{ix+12:.0f}" y="{cy+6:.0f}" font-size="18" fill="{INK}">{esc(lab)}</text>')

    o.append("</svg>")
    return "\n".join(o)


if __name__ == "__main__":
    open("arquitetura-compacta.svg", "w").write(build())
    print("arquitetura-compacta.svg gerado")
