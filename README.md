# Casa em dia

Aplicação de finanças domésticas recuperada da implantação ativa do Cloudflare em 4 de novembro de 2026.

## O que foi recuperado

- `worker/index.js`: bundle do Worker, sem alterações no código recuperado.
- `public/`: HTML, JavaScript e CSS compilados, manifesto, ícones, service worker e página offline servidos pela aplicação.
- `recovery-sha256.json`: hashes SHA-256 dos arquivos recuperados.
- `wrangler.jsonc`: configuração reconstruída a partir dos bindings consultados na API.

Os fontes originais do frontend, testes, histórico Git e mapas de código-fonte não foram recuperados. Os bundles permitem executar a versão publicada, mas não reconstituem o projeto original de desenvolvimento. A publicação no Cloudflare foi feita pelo Wrangler; ela não identifica o repositório de origem.

## Desenvolvimento local

Requer Node.js 22 ou superior e npm.

```sh
npm ci
npm run db:local
npm run dev
```

O Wrangler usa um D1 local separado. `local/schema.sql` foi reconstruído a partir das consultas do Worker porque o token disponível não permite consultar o esquema D1. Não é uma cópia verificada do esquema de produção. O script é repetível e não apaga dados locais. Nunca o execute com `--remote`.

Verificação de sintaxe: `npm run check`. A aplicação oferece `GET /api/health`, cadastro, login e `GET`/`PUT /api/data`.

## Publicação manual

`npm run deploy` publica o Worker e os arquivos estáticos no projeto existente `casa-em-dia`. Execute apenas quando quiser atualizar produção, depois de revisar a configuração e testar. Não há deploy automático neste repositório.

Credenciais devem ser fornecidas pelo ambiente seguro, nunca adicionadas ao Git. Os identificadores do banco e do Worker não são credenciais. Nenhum dado financeiro, senha, sessão ou token de produção foi copiado para este repositório.

## Validação da recuperação

Com `npm run dev` ativo, execute `python3 scripts/smoke.py` (Python 3). O teste usa somente o servidor local na porta 8787 e cria uma conta fictícia no D1 local. Confere os 10 arquivos estáticos byte a byte e testa saúde, cadastro, login, proteção de origem, leitura, gravação, conflito de revisão e logout.

A recuperação passou nesses testes e em `npx wrangler deploy --dry-run`. Nenhum deploy de produção foi realizado. A interface foi validada por requisições HTTP; não foi feita validação visual em navegador.

## Filtros dos lançamentos

Cada coluna de dados tem seu filtro abaixo do título. Lançamento busca nome, categoria, pessoa, benefício e caixinha sem distinguir acentos; Dia permite um intervalo; Tipo, Banco e Situação têm seletores; Planejado, Real e Diferença aceitam limites em reais. Real e Diferença também permitem selecionar registros com ou sem valor informado. Os filtros são combinados com as abas, busca e ordenação existentes. “Limpar filtros” limpa os filtros das colunas.

A implementação editável fica em `public/transaction-filters.js` e `public/transaction-filters.css`, integrada ao componente da tabela no bundle recuperado. O nome do bundle foi atualizado para invalidar cache. `recovery-sha256.json` registra a recuperação original, antes destas alterações; não é um manifesto da versão atual.

Testes: `npm test`. Com o servidor local ativo na porta 8787 e Chromium instalado, `npm run test:browser` testa a tela com uma conta fictícia local (use `CHROMIUM_PATH` para indicar outro caminho do Chromium).
