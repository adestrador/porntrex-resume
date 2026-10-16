# Porntrex Resume

Continue a navegação pelos vídeos de cada perfil de onde parou.

O Porntrex costuma trocar as páginas da lista sem mudar o endereço. Este userscript guarda a posição de cada perfil, coloca a paginação na URL e retoma a posição salva quando você volta. Tudo funciona em segundo plano, sem painel ou texto sobre a página.

## Instalar

1. Instale um gerenciador de userscripts no navegador. A combinação validada em uso é **Firefox + Greasemonkey**.
2. Clique em **[Instalar o script](https://raw.githubusercontent.com/adestrador/porntrex-resume/main/porntrex-resume.user.js)**.
3. Confirme a instalação no gerenciador e recarregue uma lista de vídeos de perfil.

Se o navegador apenas mostrar o código, abra o menu do gerenciador, crie um novo script, substitua todo o conteúdo pelo arquivo `porntrex-resume.user.js` e salve.

Não é preciso usar o F12, editar a URL ou instalar ferramentas no computador. Node.js só é necessário para executar os testes de desenvolvimento.

## Como usar

Navegue normalmente pela lista de vídeos. O script reconhece os botões de paginação e salva a posição antes de carregar a próxima página. Quando um botão não é reconhecido, ele também tenta acompanhar a requisição interna usada pelo site.

Ao retornar ao perfil, a posição mais recente guardada tem prioridade sobre a URL da aba restaurada. Cada perfil tem seu próprio registro.

No menu do gerenciador, abra o submenu do script para acessar:

| Comando | O que faz |
| --- | --- |
| Consultar posição salva | Mostra a posição registrada e o estado da gravação. |
| Ir para uma posição… | Permite escolher outra posição na paginação. |
| Voltar ao início | Guarda a posição inicial e abre a primeira página. |

Para conferir a instalação, avance algumas páginas, consulte a posição no menu e reabra o perfil. O endereço passa a conter `from_uploaded_videos`.

## Compatibilidade

- **Firefox + Greasemonkey:** validado em uso.
- O código usa APIs modernas de userscripts, também disponíveis em outros gerenciadores. Tampermonkey e Violentmonkey ainda precisam de validação no site; relatos de compatibilidade são bem-vindos.
- Atua somente em listas no formato `/members/ID/videos/` nos domínios `porntrex.com` e `www.porntrex.com`.

## Dados e privacidade

Não há telemetria, servidor próprio ou dependências externas no código. A posição, os filtros e a data da atualização ficam no armazenamento do gerenciador e em uma cópia local do próprio site. O script não envia esses registros para o GitHub ou para outro serviço.

A cópia local ajuda a recuperar uma mudança caso a gravação da extensão seja interrompida. Encerrar o processo do navegador durante uma gravação ainda pode perder as últimas alterações; aguarde a confirmação no menu para verificar um teste de retomada.

## Limitações

- Guarda a página da lista, não o último vídeo assistido. Novos envios e alterações de ordenação podem mudar quais vídeos aparecem em cada página.
- Os registros não são sincronizados entre navegadores ou computadores.
- Para abrir uma posição diferente da já salva, use o comando **Ir para uma posição…**. A posição guardada tem prioridade sobre parâmetros digitados manualmente na URL.
- Mudanças na estrutura do site podem exigir uma atualização do script.

## Atualizar

O cabeçalho aponta para o arquivo deste repositório para as verificações de atualização do gerenciador. Também é possível clicar novamente em **Instalar o script** e confirmar a atualização.

Se você já usa uma versão anterior com o nome **Porntrex — continuar por perfil**, atualize o script existente, em vez de manter duas cópias ativas. O nome, o namespace e as chaves de armazenamento foram mantidos nesta distribuição. Trocar de gerenciador pode não preservar o armazenamento da extensão.

## Relatar um problema

Abra uma [issue](https://github.com/adestrador/porntrex-resume/issues) com o navegador, o gerenciador, a versão do script e os passos para reproduzir. Informe se a posição muda na URL e o texto de **Consultar posição salva**. Não inclua cookies ou dados de conta.

## Desenvolvimento

O projeto não precisa de instalação de dependências. Com Node.js 20 ou superior:

```sh
npm run check
npm test
```

Os testes usam um ambiente simulado para conferir gravação por perfil, restauração com URL antiga, cópia local, cliques de paginação e comandos do menu. Eles não substituem a verificação no site real.

Contribuições são bem-vindas. Descreva o problema, a mudança proposta e como você verificou o resultado.

## Licença

[MIT](LICENSE).
