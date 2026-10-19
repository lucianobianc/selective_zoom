# Validação do MVP

Execução em 18/10/2026, com Node.js 24.19.0, Chromium do ambiente e **Firefox ESR 140.15.0** no Linux. O Firefox instalou temporariamente o ZIP produzido por `npm run build`, em um perfil novo e descartável. A automação acionou o botão real da barra de ferramentas; não houve mocks de APIs na suíte Firefox.

| Verificação | Resultado |
| --- | --- |
| Instalação reproduzível com `npm ci` | Passou |
| `npm test` | 7 testes passaram |
| `npm run test:browser` | 9 testes passaram, interface com Chromium e APIs simuladas |
| `tests/firefox_smoke.py` | 4 testes passaram, extensão real no Firefox |
| `npm run lint:extension` | 0 erros, 0 notices e 1 aviso de compatibilidade Android |
| `npm run build` | ZIP gerado; contém somente scripts, manifesto e licença |
| YouTube real | Bloqueado pelo proxy do ambiente: CONNECT retornou HTTP 403 |

O aviso `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` refere-se à declaração `data_collection_permissions` e ao mínimo 142 no Android. O alvo deste MVP é Firefox **desktop 140+**; a declaração é aceita no Firefox ESR 140 testado. Não foi declarada ou validada compatibilidade móvel. O verificador de atualização do web-ext também emitiu um aviso por não conseguir escrever em `~/.config`; isso não impediu lint ou empacotamento.

## Critérios de aceitação exercitados no Firefox

- Carregamento do pacote e abertura pelo botão da extensão.
- Seleção de texto sem ativar o link subjacente.
- Proposta de seletor, destaque e contagem dos três comentários.
- Ajuste de fonte com prévia; Salvar desabilitado antes da confirmação.
- Cancelamento sem persistência e sem modificar estilos inline da página.
- Gravação em `browser.storage.local`, recarga e aplicação em outra aba.
- Estilo aplicado a comentário inserido dinamicamente, preservando o cabeçalho.
- Duas regras independentes; remoção de uma preserva a outra e atualiza outra aba aberta.
- Isolamento entre duas origens com o mesmo host e portas diferentes.
- Seleção por teclado, Escape e exclusão de controles sensíveis.
- Falha segura para classes instáveis; tamanho fora do intervalo bloqueado.
- Prévia, gravação, recarga e remoção em página com CSP restritiva.

Os testes de lógica e de interface também cobrem validação de seletores contra injeção de CSS, dados incompatíveis preservados, falhas de armazenamento, origem derivada do remetente, fila de gravações concorrentes e nova confirmação quando as correspondências mudam antes de salvar.

## Limitação da validação em site real

A tentativa de acesso a `https://www.youtube.com/` recebeu HTTP 403 do proxy antes de alcançar o site. Por isso, **o fluxo em comentários reais do YouTube permanece sem validação**. Não foi substituído por uma alegação de compatibilidade nem por heurísticas específicas para esse site.

Para concluir a etapa em uma máquina com acesso ao YouTube: carregar a extensão, abrir um vídeo com comentários, selecionar um texto de comentário, conferir os destaques, ajustar/salvar, recarregar e remover a regra. Registrar qualquer falha de seletor ou limitação do DOM antes de propor uma correção específica. Consentimento, autenticação, estrutura dinâmica e disponibilidade dos comentários podem afetar esse teste.

A implementação está organizada em sete commits conforme os estágios do roadmap. A etapa 7 tem validação local concluída e essa pendência externa explícita. Não houve assinatura, publicação na loja ou teste manual com leitor de tela.
