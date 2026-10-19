# Especificação técnica — Extensão Firefox de tipografia visual

## 1. Objetivo
Permitir que uma pessoa selecione visualmente um tipo de texto em uma página e ajuste seu tamanho sem escrever código. As alterações devem ser reaplicadas automaticamente em visitas posteriores ao mesmo site.

## 2. Plataforma e tecnologias
- Firefox desktop, WebExtensions.
- JavaScript, HTML e CSS sem framework na primeira versão.
- `manifest.json`, script de conteúdo e `browser.storage.local`.
- Testes automatizados para a lógica de seletores e armazenamento; teste manual no Firefox para a interação visual.

## 3. Escopo do MVP
1. Ativar o modo de seleção por meio do botão da extensão.
2. Destacar visualmente o elemento de texto sob o ponteiro, sem modificar permanentemente a página.
3. Selecionar o elemento com um clique; permitir cancelar com Escape.
4. Exibir um painel flutuante simples com controle de tamanho da fonte em pixels, prévia imediata, Salvar e Cancelar.
5. Propor um seletor CSS para atingir elementos equivalentes; destacar os elementos atingidos antes de salvar.
6. Permitir confirmar ou rejeitar a seleção proposta; se inadequada, informar que não foi possível criar uma regra segura, sem salvar uma regra errada.
7. Salvar a regra localmente, associada à origem do site, e reaplicá-la em visitas posteriores.
8. Oferecer uma lista simples das regras do site atual com opção de remover cada regra.

## 4. Comportamento esperado
### 4.1 Seleção
- O modo de seleção deve impedir que o clique de escolha acione links ou botões subjacentes.
- O realce não pode bloquear a leitura nem interferir permanentemente no layout.
- Não selecionar elementos internos da própria interface da extensão.
- Priorizar elementos que contenham texto; não permitir selecionar `script`, `style` ou controles sensíveis.

### 4.2 Regras de correspondência
- Construir candidatos a seletores com base em atributos e estrutura observáveis.
- Evitar classes com aparência instável e seletores excessivamente específicos quando possível.
- Antes de salvar, mostrar visualmente quais elementos correspondem à regra.
- Não prometer reconhecimento semântico perfeito: páginas podem alterar sua estrutura.
- Se nenhum seletor aceitável for encontrado, não salvar silenciosamente uma regra aplicável ao elemento errado.

### 4.3 Aplicação do estilo
- Aplicar apenas `font-size` no MVP.
- Restringir a aplicação ao domínio/origem para o qual a regra foi criada.
- Não alterar o zoom global.
- Usar uma folha de estilos gerenciada pelo script de conteúdo, evitando mudanças irreversíveis nos estilos originais.
- Reaplicar o estilo em conteúdo inserido dinamicamente quando o seletor continuar válido, preferencialmente pela própria cascata CSS.

### 4.4 Persistência
- Salvar com `browser.storage.local`.
- Modelo lógico: versão do esquema, origem do site e regras contendo identificador, seletor CSS e tamanho em pixels.
- Ao carregar uma página compatível, recuperar e aplicar suas regras.
- A remoção de uma regra deve retirar seu efeito imediatamente.
- Regras não devem ser enviadas a servidores externos.

## 5. Interface
- Painel flutuante discreto dentro da página, isolado dos estilos do site quando viável (por exemplo, Shadow DOM).
- Estados: inativo, selecionando, prévia/edição e lista de regras.
- Ações principais: selecionar, ajustar tamanho, salvar, cancelar e remover regra.
- Indicar claramente a quantidade ou o conjunto de elementos afetados na prévia.
- Usar controles legíveis e acessíveis via teclado.

## 6. Arquitetura sugerida
- `manifest.json`: declaração da extensão e permissões mínimas.
- `background.js`: comando do botão da extensão e comunicação necessária.
- `content/selection.js`: detecção do elemento, destaque e cancelamento.
- `content/panel.js`: interface de edição.
- `content/selectors.js`: geração e validação de candidatos CSS.
- `content/styles.js`: aplicação e remoção das regras.
- `shared/storage.js`: leitura, validação e gravação das configurações.
- `tests/`: testes da lógica independente do DOM real e fixtures HTML.

Essa estrutura é uma orientação; só criar os módulos conforme forem necessários em cada etapa.

## 7. Restrições e riscos
- O Firefox não garante que páginas internas e páginas restritas aceitem scripts de extensão.
- Sites como YouTube e Facebook mudam a estrutura do DOM, podendo invalidar seletores salvos.
- Elementos dentro de iframes e Shadow DOM de terceiros ficam fora do MVP.
- Alterações de fonte podem provocar quebra de linha e mudanças de altura, mas não devem afetar elementos não correspondentes à regra.
- Evitar permissões excessivas; documentar e justificar cada permissão necessária.
- Não coletar nem transmitir conteúdo de comentários ou dados de navegação.

## 8. Critérios de aceitação do MVP
1. Instalar temporariamente a extensão no Firefox e ativar a seleção em uma página de teste.
2. Selecionar um comentário de uma lista e visualizar todos os comentários que seriam atingidos.
3. Ajustar o tamanho e observar a prévia sem recarregar a página.
4. Cancelar e confirmar que nenhuma alteração persistente foi criada.
5. Salvar, recarregar a página e verificar que a alteração reaparece.
6. Adicionar novos comentários à página via JavaScript e verificar que recebem o estilo.
7. Remover a regra e confirmar que a página volta ao tamanho original.
8. Confirmar que a regra não modifica outra origem.
9. Verificar a operação básica no YouTube; registrar eventuais limitações sem contorná-las por soluções específicas prematuras.

## 9. Definição de pronto
O MVP está concluído quando todos os critérios de aceitação aplicáveis à página de teste passam, o fluxo básico funciona no Firefox, e limitações encontradas no YouTube estão documentadas. Não ampliar o escopo para resolver problemas não demonstrados.
