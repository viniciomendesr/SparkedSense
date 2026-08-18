# Figuras superadas

Versões anteriores da Figura 1 do resumo do 34º SIICUSP, guardadas porque
documentam decisões de desenho que o histórico do repositório não explica
sozinho. Nenhuma está em uso.

| Arquivo | O que era | Por que saiu |
|---|---|---|
| `arquitetura.svg` / `.png` | primeira versão em camadas | superada por `arquitetura-v2.svg`, que acrescentou o painel de princípios e as linhas explicativas por camada |
| `artefato1.png` | a que ficou embutida no `.docx` até 2026-08-17 | tipo interno a 3,87 pt no impresso, ilegível, e 8,18 cm de altura num resumo de duas páginas |
| `artefato1-resumo.png` | variante condensada, só texto | sem ícones, perdia a gramática de Lin et al. (2025) |
| `arquitetura-resumo.svg` / `.png` | recorte da v2 para o resumo | mantinha 8,18 cm; o painel de princípios sozinho valia mais espaço que a Tabela 1 inteira |
| `gerar-figura.py` | gerador da versão acima | substituído por `gerar-figura-compacta.py` |

O que ficou em uso, um nível acima:

- `arquitetura-compacta.svg` / `.png` e a variante `-en`: a Figura 1 do resumo,
  15,80 × 3,45 cm, rótulo ao lado do ícone e sem os rótulos de propriedade.
  Ambas saem de `gerar-figura-compacta.py`.
- `arquitetura-v2.svg` / `.png`: a versão poster, com painel de princípios,
  linhas por camada e o bloco de lacuna aberta. Não cabe num resumo de duas
  páginas, mas é a que serve ao relatório final.

**A escala manda na tipografia, não o contrário.** A compacta tem menos pixels
de largura que as anteriores, e por isso o corpo no impresso é maior: os mesmos
15,80 cm de papel divididos por 1.100 px dão 69,6 px/cm, e um rótulo de 18 px
sai a 7,3 pt. A `artefato1.png`, com 5.440 px na mesma largura, punha o mesmo
rótulo a 3,87 pt.
