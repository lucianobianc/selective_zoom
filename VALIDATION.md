# Validação do MVP

Atualizado em 19/10/2026, com Node.js 24.19.0, Chromium do ambiente e **Firefox ESR 140.15.0** no Linux. O Firefox instalou temporariamente o ZIP produzido por `npm run build`, em um perfil novo e descartável. A automação acionou o botão real da barra de ferramentas; não houve mocks de APIs na suíte Firefox.

| Verificação | Resultado |
| --- | --- |
| Instalação reproduzível com `npm ci` | Passou |
| `npm test` | 10 testes passaram |
| `npm run test:browser` | 20 testes passaram, interface com Chromium e APIs simuladas |
| `tests/firefox_smoke.py` | 8 testes passaram, extensão real no Firefox |
| `npm run lint:extension` | 0 erros, 0 notices e 1 aviso de compatibilidade Android |
| `npm run build` | ZIP gerado; contém somente scripts, manifesto e licença |
| YouTube real | Bloqueado pelo proxy do ambiente: CONNECT retornou HTTP 403 |

O aviso `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` refere-se à declaração `data_collection_permissions` e ao mínimo 142 no Android. O alvo deste MVP é Firefox **desktop 140+**; a declaração é aceita no Firefox ESR 140 testado. Não foi declarada ou validada compatibilidade móvel. O verificador de atualização do web-ext também emitiu um aviso por não conseguir escrever em `~/.config`; isso não impediu lint ou empacotamento.

## Critérios de aceitação exercitados no Firefox

- Carregamento do pacote e abertura pelo botão da extensão.
- Abertura da edição pelo menu nativo do botão direito, inclusive com o modo de seleção ativo.
- Cores e tipografia legíveis no painel em uma página com tema escuro.
- Seleção de texto sem ativar o link subjacente.
- Proposta de seletor, destaque e contagem dos três comentários.
- Ajuste de fonte com prévia e gravação direta em Salvar, sem checkbox.
- Cancelamento sem persistência e sem modificar estilos inline da página.
- Gravação em `browser.storage.local`, recarga e aplicação em outra aba.
- Estilo aplicado a comentário inserido dinamicamente, preservando o cabeçalho.
- Duas regras independentes; remoção de uma preserva a outra e atualiza outra aba aberta.
- Isolamento entre duas origens com o mesmo host e portas diferentes.
- Seleção por teclado, Escape e exclusão de controles sensíveis.
- Falha segura para classe instável isolada sem contexto; tamanho fora do intervalo bloqueado.
- Prévia, gravação, recarga e remoção em página com CSP restritiva.
- Replies em diálogo modal nativo e janela com foco restrito: seleção, edição, persistência, novos replies, remoção e retorno ao feed.
- Destaque alinhado em janela com transformação CSS e regra limitada à janela, preservando o feed ao fundo.
- Em DOM representativo: comentários do YouTube separados de títulos e autores que compartilham classes.
- Em DOM representativo: marcadores de mensagens e caminhos dentro de artigos para textos com classes geradas.
- Seleção por coordenadas em texto com `pointer-events:none` e `display:contents`, sem atingir o botão adjacente.

Os testes de lógica e de interface também cobrem validação de seletores contra injeção de CSS, dados incompatíveis preservados, falhas de armazenamento, origem derivada do remetente, fila de gravações concorrentes e atualização da prévia no primeiro clique em Salvar quando as correspondências mudam. O segundo clique grava o conjunto revisado.

## Limitação da validação em site real

A tentativa de acesso a `https://www.youtube.com/` recebeu HTTP 403 do proxy antes de alcançar o site. A validação automatizada no site real continua pendente. O usuário relatou funcionamento no YouTube, mas com agrupamento indevido de outras categorias de texto; a mudança passa a usar o corpo do comentário dentro do contêiner de comentário. Os testes dessa mudança usam DOM representativo, não uma captura autenticada do site.

No Facebook, o usuário relatou que nenhum texto era selecionado e que aparecia a mensagem de impossibilidade de criar uma regra segura. Foram ampliadas a detecção do texto sob o ponteiro e as alternativas de seletor em classes geradas/contêineres semânticos. O usuário confirmou funcionamento nos comentários normais do Facebook e no YouTube após essa alteração. Depois relatou outra falha em replies abertos em uma janela sobre o feed. A correção para janelas modais foi validada no Firefox com fixtures representativas, incluindo foco restrito; os replies na página real do usuário ainda precisam ser conferidos. Não houve sessão autenticada de validação automatizada no Facebook. As fixtures de `social-text.html` são exemplos estruturais explicitamente identificados, não evidência de compatibilidade com todo o DOM atual dos sites.

Para concluir a etapa em uma máquina com acesso ao YouTube: carregar a extensão, abrir um vídeo com comentários, selecionar um texto de comentário, conferir os destaques, ajustar/salvar, recarregar e remover a regra. Registrar qualquer falha de seletor ou limitação do DOM antes de propor uma correção específica. Consentimento, autenticação, estrutura dinâmica e disponibilidade dos comentários podem afetar esse teste.

A implementação inicial está organizada em sete commits conforme os estágios do roadmap. As correções de contraste, menu contextual, simplificação da confirmação e seleção em DOMs complexos têm commits adicionais. A etapa 7 tem validação local concluída e essa pendência externa explícita. Não houve assinatura, publicação na loja ou teste manual com leitor de tela.
