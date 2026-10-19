# Plano incremental de implementação

## Princípios
- Executar uma etapa por vez, com validação antes da seguinte.
- Não implementar funcionalidades futuras por antecipação.
- Manter o projeto executável após cada etapa.
- Cada tarefa do Codex deve ter escopo pequeno e critérios de aceitação explícitos.

## Etapa 1 — Esqueleto carregável
**Implementar:** `manifest.json`, script de conteúdo mínimo, ação do botão da extensão e README com instalação temporária no Firefox.

**Verificar:** a extensão carrega em `about:debugging`, e o botão ativa/desativa uma indicação discreta em uma página HTML de teste.

**Não implementar:** seleção, persistência ou edição.

## Etapa 2 — Seleção visual
**Implementar:** realce sob o cursor, seleção por clique, Escape para cancelar e proteção contra cliques acidentais na página.

**Verificar:** o usuário escolhe um bloco de texto sem ativar o link subjacente; cancelar remove o realce.

**Não implementar:** CSS persistente nem painel de tamanho.

## Etapa 3 — Edição temporária
**Implementar:** painel flutuante com controle de `font-size`, prévia imediata, Salvar ainda desabilitado e Cancelar funcional.

**Verificar:** o tamanho muda somente durante a prévia; cancelar restaura a apresentação original.

**Não implementar:** armazenamento nem detecção de elementos semelhantes.

## Etapa 4 — Seletores para elementos semelhantes
**Implementar:** geração de candidatos CSS, visualização dos elementos atingidos, confirmação da correspondência e falha segura quando não houver seletor adequado.

**Verificar:** em uma fixture com vários comentários, selecionar um comentário permite ajustar todos sem afetar cabeçalhos e botões.

**Não implementar:** heurísticas específicas para redes sociais nem aprendizado automático.

## Etapa 5 — Salvar e reaplicar
**Implementar:** esquema de dados versionado em `browser.storage.local`, aplicação automática por origem e folha de estilos gerenciada.

**Verificar:** salvar, recarregar e abrir nova aba mantém a regra; conteúdo novo que corresponda ao seletor recebe o estilo.

**Não implementar:** sincronização ou exportação.

## Etapa 6 — Gerenciamento mínimo
**Implementar:** listar regras da origem atual e remover uma regra com efeito imediato.

**Verificar:** duas regras independentes podem coexistir; excluir uma não altera a outra.

**Não implementar:** editor completo de regras nem perfis.

## Etapa 7 — Validação em site real e acabamento
**Implementar:** testar no YouTube, corrigir defeitos comprovados, documentar limitações, revisar permissões e acessibilidade básica.

**Verificar:** selecionar e ajustar texto de comentários quando o DOM permitir; registrar falhas de seletor sem aplicar regras indevidas.

**Não implementar:** suporte especial ao Facebook, controles adicionais de tipografia ou funcionalidades não previstas no MVP.

## Instrução inicial para o Codex
Leia `SPEC.md` e `ROADMAP.md`. Execute **somente a Etapa 1**. Crie a menor extensão Firefox funcional que atenda aos critérios dessa etapa. Documente como carregá-la temporariamente no Firefox e como testar a ativação/desativação. Não antecipe seleção de elementos, painel de edição, persistência ou recursos das etapas seguintes. Ao terminar, informe os arquivos criados, o procedimento de teste e quaisquer limitações.
