# Selective Zoom

Extensão Firefox para ajustar o tamanho de tipos de texto por site, sem alterar o zoom global. JavaScript, HTML e CSS, sem framework e sem serviço externo.

## Instalação temporária no Firefox

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária** e escolha `manifest.json`.
3. Abra uma página HTTP(S), recarregue-a se já estava aberta e clique no botão da extensão.

Para uma página de teste, execute na raiz do projeto:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra o caminho `/tests/fixtures/comments.html` na porta 8000. Na primeira etapa, o botão ativa/desativa uma indicação discreta.

Páginas internas do Firefox e sites protegidos pelo navegador não aceitam a extensão. A instalação temporária dura até fechar o Firefox.

Veja [SPEC.md](SPEC.md) e [ROADMAP.md](ROADMAP.md) para o escopo e os estágios de implementação.
