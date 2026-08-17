# Protocolo de coleta de ground truth: classificador acústico embarcado

Instrumento de avaliação experimental (Hevner et al., 2004, Tabela 2, linha
*Experimental / Controlled experiment*) para o nó ESP32-S3 com o modelo
`ei-claro-kws-v84`. Produz os números que faltam para a seção Resultados do
resumo do 34º SIICUSP.

**Prazo:** executável em uma sessão de ~40 min. Análise em segundos.

---

## 1. Por que o banco de produção não serve

As 2.995 inferências em `readings` são o que passou pela política de publicação
do firmware, não a saída do modelo:

- `PUBLISH_THRESHOLD_CLARO = 0.30f`, com prioridade explícita sobre o argmax.
  O comentário no código diz o motivo: "deliberadamente baixo pra demo", "dá
  mais chance de disparar durante a apresentação ao vivo, ao custo de tolerar
  falso-positivo ocasional".
- A classe `noise` não tem caminho de publicação nenhum.
- `unknown` exige argmax + confiança ≥ 0,92 + estabilidade em 2 frames.
- `CLARO_REFRACTORY_MS = 3000` suprime re-detecções da mesma elocução.

Resultado no banco: 2.980 de 2.995 são `claro`, confiança média 0,439. Isso
mede a configuração da demo, não o classificador. Reportar essa distribuição
como desempenho seria um erro que qualquer avaliador atento pega ao pedir o
dado bruto.

Além disso, não há rótulo verdadeiro em lugar nenhum: sem saber o que foi dito,
acurácia e F1 são indefinidos.

## 2. O que o firmware já entrega de graça

Nenhuma modificação é necessária. A cada frame o firmware imprime no Serial:

```
[HH:MM:SS.mmm BRT] claro=0.88  noise=0.05  unknown=0.07  -> claro (0.88)
```

São as três probabilidades pré-decisão. Capturando isso com rótulo conhecido,
sai matriz de confusão, precision/recall e a curva de threshold.

**Alinhamento temporal.** O timestamp do device não é usado: o campo de
milissegundos é `millis() % 1000`, livre em relação à borda do segundo, então
não é confiável. O script carimba cada linha com o relógio do host na chegada e
emite os cues do mesmo relógio. Latência de USB CDC é de milissegundos,
desprezível frente à janela de 2 s.

## 3. Sessão

| Bloco | Tipo | Conteúdo | Duração |
|---|---|---|---|
| A | positivo | 30 elocuções de "claro", uma a cada 6 s | 3 min |
| B | confundível | 30 elocuções de palavras foneticamente próximas (carro, quadro, quatro, clima, prato, grito, cravo, claque) | 3 min |
| C | ambiente | silêncio e ruído de fundo, sem fala | 5 min |
| D | fala | fala contínua sem usar a palavra-alvo | 5 min |

O intervalo de 6 s respeita o `CLARO_REFRACTORY_MS` de 3 s com folga. Os blocos
C e D são o que dá a taxa de falso positivo por minuto, que é a métrica honesta
para keyword spotting, mais informativa que acurácia num problema com classes
tão desbalanceadas.

**Condições a registrar** (viram nota de método no resumo): locutor, ambiente,
distância boca-microfone, nível de ruído de fundo aproximado. O script pede
esses campos e os grava no cabeçalho da sessão.

**Validade.** Um locutor, um ambiente, uma sessão sustenta avaliação de
viabilidade, não generalização. Se houver tempo, repita com um segundo locutor:
duas sessões já permitem afirmar algo sobre variação entre falantes. Declare a
limitação no resumo de qualquer forma.

## 4. Execução

```bash
pip install pyserial --break-system-packages

python3 ground-truth.py record \
  --out sessao-01.jsonl \
  --operator "Vinício" \
  --room "Fábrica do Futuro, sala X" \
  --distance_m 1.0

python3 ground-truth.py analyze --in sessao-01.jsonl --md resultados-sessao-01.md
```

O `record` autodetecta a porta (`/dev/cu.usbmodem*`). Se houver mais de uma,
passe `--port`. Ele aquece 10 s, roda os quatro blocos e pede ENTER antes dos
blocos com cue. Ctrl-C a qualquer momento mantém analisável o que já foi gravado.

## 5. Saída

Três tabelas em markdown, prontas para o resumo:

1. **Desempenho por frame** — precision, recall e F1 sob a regra implantada
   (threshold 0,30 com prioridade), F1 máximo na varredura, recall por elocução
   e falsos positivos por minuto.
2. **Matriz de confusão por argmax** — rótulo verdadeiro contra a classe de
   maior probabilidade, sem a política de publicação no meio.
3. **Varredura de threshold** — precision/recall/F1 de 0,05 a 0,95, com o valor
   implantado marcado.

A terceira tabela é a mais valiosa cientificamente. Ela quantifica o trade-off
que o firmware assumiu por conveniência de demo e permite afirmar, com número,
por que a distribuição de classes em produção está degenerada. Isso transforma
um problema em achado.

## 6. Complemento de 10 minutos

No projeto do Edge Impulse, aba **Model testing**: acurácia e matriz de confusão
no split de teste retido, mais o footprint do modelo INT8 (flash e RAM de pico)
na aba de deployment. São números do modelo em condição de laboratório, e
complementam os de campo deste protocolo. Os dois juntos são mais fortes que
qualquer um sozinho.

## 7. O que este protocolo não resolve

O overhead da assinatura ECDSA no nó acústico permanece não mensurável: o
firmware roda com `#define UNSIGNED_DEV_BYPASS 1` e publica
`signature: "unsigned_dev"` (ADR-011/ADR-012). As 2.995 inferências no banco
não são assinadas. A latência de assinatura só existe medida no caminho do nó
ambiental, com ECDSA secp256k1 real de 128 hex em 81.320 leituras.

Consequência para o resumo: a demonstração de dois nós heterogêneos comprova
**envelope semântico comum entre modalidades**, não proveniência criptográfica
de inferências. As duas afirmações não podem ser feitas juntas até o port do
pipeline de assinatura para o ESP32-S3.
