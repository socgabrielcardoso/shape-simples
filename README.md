# DETECTOR DE FORMAS

Projeto web leve de visão computacional criado para reconhecer formas construídas com as mãos e estados visuais dos olhos em tempo real pela webcam.

A proposta é manter a experiência simples e direta: abrir no navegador, autorizar a câmera e obter feedback visual imediato, com processamento local e uma arquitetura pequena o suficiente para servir como laboratório e referência para projetos maiores.

Projeto web com interface simples para detecção visual em tempo real.

## Recursos

Formas reconhecidas com as mãos:

* TRIÂNGULO
* QUADRADO
* RETÂNGULO
* LOSANGO
* TRAPÉZIO
* QUADRILÁTERO
* CÍRCULO
* OVAL

Estados reconhecidos pelos olhos:

* ACORDADO
* PISCANDO
* PISCOU
* DORMINDO
* AUSENTE

## Execução

1. Abra a pasta `vision-shape-detector` no Visual Studio Code.
2. Instale a extensão `Live Server`.
3. Abra o arquivo `index.html`.
4. Clique com o botão direito no editor.
5. Escolha `Open with Live Server`.
6. Autorize o acesso à câmera.

## Gestos

Use os dedos indicador e polegar das duas mãos como pontos da forma.

Para um triângulo, aproxime dois pontos e mantenha os outros dois separados.

Para quadrado, retângulo, losango ou trapézio, mantenha quatro pontos visíveis.

Para círculo ou oval, aproxime os indicadores no alto e os polegares embaixo.

Também é possível formar um círculo pequeno encostando indicador e polegar de uma mão.

## Requisitos

* Google Chrome ou Microsoft Edge atualizado
* Câmera disponível
* Conexão com a internet para carregar MediaPipe e os modelos
* Live Server executando em `localhost` ou `127.0.0.1`

## Privacidade

O vídeo é processado no navegador. O projeto não grava nem envia imagens para um servidor próprio.
