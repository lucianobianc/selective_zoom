# Selective Zoom

Extensão para **Firefox desktop 140+** que ajusta o tamanho de grupos de textos por site, sem alterar o zoom global. JavaScript, HTML e CSS sem framework; dados guardados apenas no navegador.

## Instalar e usar

1. Abra `about:debugging#/runtime/this-firefox` no Firefox.
2. Clique em **Carregar extensão temporária** e escolha `manifest.json`.
3. Abra uma página HTTP(S), recarregue-a se já estava aberta e clique no botão **Selective Zoom** da extensão. Você também pode clicar com o botão direito sobre um texto e escolher **Selective Zoom** para abrir a edição diretamente nele. Se necessário, fixe-o na barra pelo menu de extensões.
4. Passe o mouse sobre um texto e clique para selecioná-lo. O clique não abre o link da página.
5. Confira os elementos destacados, a quantidade e as amostras no painel. Ajuste o tamanho entre **6 e 128 px** e clique em **Salvar**.
6. Para rejeitar a proposta, use **Selecionar outro texto**, **Cancelar** ou **Escape**. Cancelar restaura a apresentação anterior.
7. Abra **Regras deste site** para remover regras e desfazer seus efeitos imediatamente, inclusive em outras abas abertas.

Em janelas de replies sobre o feed, o painel e o destaque ficam dentro da janela ativa; novas regras criadas ali se limitam aos comentários de janelas desse tipo, sem atingir o feed ao fundo.

O botão da extensão também fecha o painel e cancela a prévia. O atalho sugerido é **Ctrl+Shift+Y** (personalizável em Gerenciar atalhos das extensões). No modo de seleção, **↑/↓** percorrem os textos e **Enter** escolhe; **Tab** navega nos controles do painel e **Escape** cancela. O foco volta ao elemento anterior ao fechar.

Se você já salvou uma regra ampla demais no YouTube, remova-a em **Regras deste site** antes de selecionar o comentário novamente. As regras antigas são preservadas; a atualização melhora a criação das próximas regras.

As regras se aplicam a toda a **origem** (protocolo, host e porta), em todas as suas páginas. Salvar o mesmo seletor atualiza sua regra; remover uma regra mantém as demais. Conteúdo novo que corresponda a um seletor recebe o estilo pela cascata CSS, sem varrer continuamente a página.

A instalação temporária dura até fechar o Firefox. O ZIP gerado em desenvolvimento não é assinado; instalação permanente e publicação na loja exigem assinatura pela Mozilla.

## Desenvolver

Node.js 22+ (validado com 24.19.0), npm e Python 3 para servir a fixture. A extensão instalada não depende de Node.js, Python ou pacotes npm.

```sh
npm ci
npm test
npm run lint:extension
npm run build
```

`npm run build` cria `web-ext-artifacts/selective_zoom-0.1.0.zip`, contendo somente o manifesto, scripts e licença. `npm run dev` inicia um perfil temporário do Firefox com recarga da extensão; use `npm run dev -- --firefox /caminho/para/firefox` para informar o executável.

Para testar visualmente a fixture, execute na raiz:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `/tests/fixtures/comments.html` na porta 8000. `/tests/fixtures/social-text.html` oferece estruturas representativas de comentários, classes compartilhadas e camadas de texto; não é uma captura dos sites. A página tem comentários, uma legenda independente, link, campo de entrada e botão para inserir novos comentários.

### Testes automatizados

```sh
# Testes da interface com Chromium e API de extensão simulada:
npx playwright install chromium
npm run test:browser
```

Se `/usr/bin/chromium` existir, o teste usa esse executável; `CHROMIUM_PATH` permite escolher outro. O servidor da fixture é iniciado e encerrado pelo runner, na porta 8000.

Para testar **o ZIP instalado no Firefox real**, com `browser.storage.local`, mensagens e botão reais, instale Firefox e geckodriver no PATH:

```sh
python3 -m venv /tmp/selective-zoom-tests
/tmp/selective-zoom-tests/bin/pip install -r tests/requirements-firefox.txt
npm run build
/tmp/selective-zoom-tests/bin/python tests/firefox_smoke.py
```

`FIREFOX_BINARY` e `GECKODRIVER` permitem informar caminhos absolutos. Os testes criam um perfil descartável e servidores locais em portas livres, fechando-os ao terminar. Não acessam dados do perfil pessoal. Veja [VALIDATION.md](VALIDATION.md) para os resultados e a limitação de acesso ao YouTube.

## Privacidade e permissões

- `menus`: adiciona a opção ao menu do botão direito e identifica o elemento clicado. Se o alvo não puder ser selecionado com segurança, abre o modo normal de seleção.
- `storage`: guarda versão do esquema, origem e regras (ID, seletor e tamanho) em `browser.storage.local`, sem sincronização.
- Acesso a páginas `http://*/*` e `https://*/*`: necessário para reaplicar regras automaticamente em novas visitas. O script roda somente no documento principal, sem iframes.
- Não há permissões de histórico, cookies, requisições de rede ou leitura global de abas. Não há telemetria, envio de textos ou serviço externo; o manifesto declara que não coleta dados.
- O background deriva a origem da aba remetente e serializa as gravações entre abas. Seletores e tamanhos são validados antes de persistir e gerar CSS. Dados de versão desconhecida ou inválidos são preservados e exibem erro, em vez de serem sobrescritos.

## Limitações conhecidas

- Páginas internas do Firefox, páginas restritas pela Mozilla e PDFs do visualizador embutido não aceitam os scripts. Nesses casos, o título do botão informa a indisponibilidade. Recarregue abas antigas após instalar a extensão.
- Iframes e Shadow DOM de terceiros ficam fora do MVP. Campos, botões e conteúdo editável não podem ser selecionados.
- Os seletores priorizam IDs, marcadores de texto e a estrutura de contêineres de comentários/artigos. Classes geradas podem ser usadas em combinações ou dentro de um escopo estrutural; uma classe instável isolada continua insuficiente. Não há fallback amplo por nome de tag. Confira os destaques antes de salvar, pois o DOM não garante equivalência semântica.
- A proposta aceita até 500 correspondências e o modo de seleção por teclado percorre até 500 textos. Há no máximo 100 regras por origem.
- Se o conjunto de elementos mudar antes de salvar, o primeiro clique atualiza a prévia; confira os novos destaques e clique em Salvar novamente. Depois de salva, uma regra acompanha o seletor: mudanças futuras no site podem invalidá-la ou mudar sua abrangência.
- Regras sobrepostas obedecem à especificidade e à ordem da cascata CSS. Estilos inline com `!important` podem impedir o ajuste; mudanças de fonte também podem alterar quebras de linha e alturas.
- O painel usa Shadow DOM para isolar seus estilos. O site ainda pode remover elementos inseridos no documento. Diálogos nativos, popovers e janelas identificadas por `role="dialog"`/`alertdialog` são reconhecidos; janelas sem esses marcadores podem exigir um ajuste adicional.
- Há reconhecimento de estruturas de comentários do YouTube e de marcadores de texto/contêineres usados em variantes do Facebook. Isso não garante funcionamento em todas as versões desses sites; os testes locais usam DOM representativo. Não há sincronização, exportação ou suporte móvel.

Veja [SPEC.md](SPEC.md) e [ROADMAP.md](ROADMAP.md) para o escopo original.
