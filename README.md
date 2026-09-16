# Shape Simples

> **Lightweight Computer Vision Lab** — projeto pessoal e enxuto para estudo de visão computacional no navegador.

O **Shape Simples** foi criado para reconhecer formas construídas com as mãos e estados visuais dos olhos em tempo real pela webcam, mantendo a arquitetura pequena, direta e fácil de executar.

A prioridade é experimentação prática: abrir no navegador, autorizar a câmera e observar o comportamento do processamento visual com feedback imediato.

## Recursos

### Formas reconhecidas com as mãos

- Triângulo
- Quadrado
- Retângulo
- Losango
- Trapézio
- Quadrilátero
- Círculo
- Oval

### Estados visuais dos olhos

- Acordado
- Piscando
- Piscou
- Dormindo
- Ausente

## Execução

1. Abra a pasta do projeto no Visual Studio Code.
2. Instale a extensão **Live Server**.
3. Abra `index.html`.
4. Selecione **Open with Live Server**.
5. Autorize o acesso à câmera.

## Como os gestos são interpretados

O projeto usa pontos de referência das mãos para compor formas geométricas. Indicadores e polegares das duas mãos funcionam como pontos principais da geometria, permitindo experimentar diferentes configurações visuais.

## Requisitos

- Google Chrome ou Microsoft Edge atualizado
- Câmera disponível
- Conexão com a internet para carregar MediaPipe e modelos utilizados
- Live Server em `localhost` ou `127.0.0.1`

## Arquitetura técnica

O processamento ocorre diretamente no navegador. A lógica foi mantida leve para reduzir dependências, facilitar testes visuais e permitir execução local sem backend dedicado.

### Conceitos praticados

- Processamento de vídeo no browser
- Landmarks das mãos
- Lógica geométrica
- Sinais faciais e oculares aparentes
- Feedback visual em tempo real
- Processamento local e privacidade por padrão

## Privacidade e limitações

O projeto não grava nem envia imagens para um servidor próprio no fluxo padrão. Resultados dependem de fatores como iluminação, enquadramento, câmera e visibilidade dos pontos analisados.

Classificações visuais são experimentais e não devem ser usadas para diagnóstico, vigilância ou tomada automatizada de decisão sobre pessoas.

---

**Categoria:** Computer Vision • Browser • MediaPipe • Technical Lab

**Status:** laboratório pessoal de estudo e experimentação.
