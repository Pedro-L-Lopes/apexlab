# SPEC — Catálogo de Impressão 3D

> Fonte da verdade do projeto. Leia este arquivo INTEIRO antes de qualquer ação e releia a seção da fase atual antes de começar cada fase. Se algo aqui conflitar com um prompt, pergunte antes de agir.

---

## 1. Visão geral

Catálogo para anunciar produtos de impressão 3D.

- **Área pública:** vitrine bonita, filtros por categoria, página de produto e pedido via WhatsApp (sem checkout, sem pagamento).
- **Área de gerência (admin):** cadastro manual, importação por link e importação em lote (a partir de sites de modelos como o MakerWorld), com link interno do STL que **nunca** aparece publicamente.
- **Uma única loja.** Sem multi-tenant.
- **Autenticação:** usuários são criados somente pelo painel do Supabase. Não existe tela de cadastro, nem "esqueci a senha".
- Idioma da interface: português (pt-BR). Moeda: BRL.

---

## 2. Stack e convenções

- Next.js (App Router), TypeScript em modo strict, Tailwind CSS, shadcn/ui, Framer Motion (pacote `motion`), lucide-react.
- Supabase: Postgres, Auth, Storage (`@supabase/ssr` para sessão no servidor).
- Zod + React Hook Form para formulários, dnd-kit para reordenar por arrastar, sharp para processar imagens.
- Server Components por padrão. Mutações do admin com Server Actions. Importação com Route Handlers.
- Nomes de tabelas e colunas em inglês, snake_case. Textos de interface em português.
- Proibido `any`. Toda entrada externa é validada com Zod.
- Componentes pequenos e reutilizáveis. Nada de código duplicado entre público e admin.
- Usar as versões já instaladas (Next.js 16, React 19, Tailwind v4): `params`, `searchParams` e `cookies()` são assíncronos; o tema do Tailwind é configurado via CSS (`@theme`), sem `tailwind.config`.
- Consultas públicas usam sempre `products_listing` ou colunas explícitas das tabelas públicas. Nunca `select *` com joins que alcancem `product_private`, mesmo que o admin esteja logado.

### Estrutura de pastas

```
app/
  (public)/
    layout.tsx
    page.tsx                 # Home
    catalogo/page.tsx
    produto/[slug]/page.tsx
  (admin)/admin/
    layout.tsx
    page.tsx                 # Dashboard
    produtos/                # lista, novo, [id]
    categorias/
    importar/
    configuracoes/
  login/page.tsx
  api/import/                # route handlers
components/
  ui/                        # shadcn
  public/
  admin/
  motion/
lib/
  supabase/                  # client.ts, server.ts, middleware.ts
  motion.ts                  # variantes e easings reutilizáveis
  whatsapp.ts
  import/                    # extração de metadados, fila
  utils.ts
supabase/
  migrations/
  seed.sql
types/
  database.ts                # gerado com supabase gen types
middleware.ts
SPEC.md
```

---

## 3. Regras de trabalho do agente

1. **Planeje antes de codar.** Na primeira interação, leia o projeto e este arquivo e responda apenas com um plano resumido por fase. Aguarde aprovação.
2. **Uma fase por vez** (seção 10). Ao terminar cada fase: rodar `build` e `lint`, corrigir erros, testar as telas no navegador e entregar um resumo (o que mudou, como testar, pendências). Só avance quando eu disser "ok".
3. **Banco só por migration.** Toda mudança de banco é um arquivo em `supabase/migrations` criado com `supabase migration new` e aplicado com `supabase db push`. Nunca alterar o banco manualmente. Depois de cada migration: `supabase gen types typescript --linked > types/database.ts`.
4. **Segredos.** Nunca commitar `.env.local`. Nunca usar prefixo `NEXT_PUBLIC_` em segredo. A service role key não é necessária: use sessão do usuário + RLS.
5. **Dados privados.** `product_private` (STL, custo, notas) não pode aparecer em nenhuma query, página, API ou payload público. Testar isso explicitamente.
6. **Não inventar escopo.** Não criar tabelas, rotas ou dependências fora deste documento sem avisar.
7. **Commits pequenos** ao final de cada fase, com mensagem clara (ex.: `feat(public): vitrine e página de produto`).
8. **Acessibilidade e movimento.** Contraste adequado, foco visível, `alt` nas imagens e `prefers-reduced-motion` respeitado em toda animação.

---

## 4. Direção visual

### Referências
Em `docs/referencias/` há 3 imagens (`ref-1-listagem.png`, `ref-2-dashboard.png`, `ref-3-componentes.png`). **Veja todas antes da Fase 2.** Use como referência de linguagem visual (espaçamento, hierarquia, tipo de componente e movimento). Não copiar textos, marcas ou conteúdo delas.

### O que as referências mostram (e que deve guiar o projeto)
- **Luminoso e arejado:** fundo azul-acinzentado muito claro com um brilho suave de gradiente em um dos cantos. Nada de preto puro nem de bordas pesadas.
- **Cartões brancos grandes** com cantos bem arredondados e sombra quase imperceptível, com aspecto de vidro leve.
- **Título de página enorme:** peso forte, `letter-spacing` negativo, com o ponto final e/ou uma palavra-chave na cor de destaque (ex.: "Catálogo." ou "Boa noite, Fulano.").
- **Eyebrow** acima do título: rótulo pequeno em caixa alta, com um traço curto antes, na cor de destaque.
- **Subtítulo discreto** com contagem e contexto (ex.: "12 peças · da mais nova para a mais antiga").
- **Abas em pílula com contagem** (ex.: Todos 12, Ativos 8, Rascunhos 4) com indicador deslizante; campo de busca branco arredondado com ícone; **seletor de densidade** da grade (3, 4 ou 5 colunas).
- **Selos em pílula**, caixa alta, `letter-spacing` aberto (status, "3 OPÇÕES").
- **Efeito de pilha:** itens com várias versões/opções mostram cartões atrás, levemente deslocados.
- **Bento grid** no dashboard: mistura de cartões brancos, 1 cartão sólido na cor de destaque com texto branco, 1 cartão escuro azul-marinho, números grandes e mini-gráficos simples.
- **Sidebar do admin** na cor de destaque saturada, com ícones, item ativo em pílula translúcida, rótulos de seção em caixa alta pequena e contadores à direita.
- **Controles:** toggles, chips selecionáveis com preenchimento na cor de destaque, steppers (− 2 +), barras de progresso finas, campos de busca com contador de resultados.

### Tokens (CSS variables, mapeadas no tema do Tailwind v4 via `@theme`)

| Token | Valor |
|---|---|
| `--bg` | `#F3F6FC` |
| `--bg-glow` | gradiente radial no canto superior direito: `--accent` a ~12% de opacidade, esmaecendo para transparente |
| `--surface` | `#FFFFFF` |
| `--surface-glass` | `rgba(255,255,255,.72)` + `backdrop-blur(12px)`, só em elementos flutuantes (header, barra fixa de WhatsApp) |
| `--ink` | `#0E1630` |
| `--ink-deep` | `#0B1230` (cartão escuro do bento) |
| `--muted` | `#6B7488` |
| `--line` | `#E3E8F2` |
| `--accent` | vem de `site_settings.primary_color`, padrão `#1F4FFF` |
| `--accent-strong` | `color-mix` do accent com preto (hover e sidebar) |
| `--accent-soft` | accent a ~10% sobre branco (fundo de chips e selos) |
| Raios | pílula total (chips, abas, botões, selos), 14px (inputs), 24px (cartões), 28px (blocos grandes) |
| Sombra | `0 1px 2px rgba(16,24,40,.04), 0 12px 32px rgba(31,79,255,.06)` |

- Selos de status: **ativo** verde suave, **rascunho** lavanda, **oculto** cinza. Sempre fundo suave + texto escuro do mesmo matiz.
- Admin e público usam o mesmo `--accent`. Se a cor escolhida em Configurações não passar contraste AA com texto branco, usar texto escuro sobre ela.

### Tipografia
- Títulos: **Plus Jakarta Sans** (700–800, `letter-spacing` -0.03em, `line-height` 1.0–1.05). Texto: **Inter**. Ambas via `next/font`.
- Escala: display 56–72px (desktop) e 40px (celular); h2 32; h3 20; corpo 16; legenda 13; eyebrow 12 em caixa alta com `letter-spacing` .12em.

### Padrão de cabeçalho de página (público e admin)
`eyebrow` + título grande com ponto/palavra em destaque + subtítulo com contagem + à direita as ações (abas, busca, densidade). Reutilizar como componente `PageHeader`.

### Movimento (suave e discreto)
- Envolver o app em `MotionConfig reducedMotion="user"`.
- Easing padrão: `[0.22, 1, 0.36, 1]`. Durações entre 200ms e 450ms.
- **Entrada:** fade + subida de 12px, com stagger de 60ms em grades e listas (variantes em `lib/motion.ts`).
- **Filtros e abas:** indicador deslizante com `layoutId`; os cards reordenam e entram/saem com `layout` + `AnimatePresence`, sem salto.
- **Seletor de densidade:** a grade reflui com animação de layout ao trocar o número de colunas.
- **Cards:** elevação leve no hover, imagem com zoom de 1.03; nos cards em pilha, as camadas de trás se abrem levemente no hover.
- **Números do dashboard:** contagem animada de 0 até o valor (uma vez, ao entrar na tela).
- **Toggles e chips:** transição com mola curta (spring suave, sem balançar).
- **Galeria do produto:** crossfade entre imagens. **Transição de página:** fade curto (150–250ms).
- **Carregamento:** skeletons com shimmer sutil. Nada de spinners gigantes.
- Proibido: animações que piscam, giram sem propósito, ou duram mais de 600ms.

---

## 5. Banco de dados (Supabase / Postgres)

Oito tabelas. Tudo criado via migrations.

### `site_settings` (uma única linha)
`id`, `name`, `description`, `logo_url`, `banner_url`, `primary_color`, `whatsapp` (somente dígitos, com DDI), `whatsapp_message_template`, `instagram`, `hero_mode` (`text` | `image` | `none`, padrão `text`), `home_category_id` (fk para `categories`, nullable, `on delete set null`; nulo = usar produtos em destaque), `updated_at`. Garantir por constraint que só exista 1 linha.

### `categories`
`id`, `parent_id` (fk para si mesma, nullable), `slug` (único), `name`, `position`, `active`, `show_on_home`, `created_at`.

### `products`
`id`, `slug` (único), `name`, `description`, `category_id` (fk, nullable), `status` (enum: `draft` | `active` | `hidden`, padrão `draft`), `featured`, `position`, `price` numeric(10,2) (nullable; vazio = "sob consulta"), `material`, `print_time_min`, `width_mm`, `height_mm`, `depth_mm`, `weight_g`, `tags` text[] (padrão `{}`), `colors` text[] (padrão `{}`, cores disponíveis exibidas na ficha técnica), `created_at`, `updated_at` (trigger).

### `product_images`
`id`, `product_id` (fk, cascade), `url`, `position`, `is_cover`. Índice único parcial: no máximo 1 capa por produto.

### `product_variants` (opcional por produto)
`id`, `product_id` (fk, cascade), `name`, `price` (nullable, herda do produto), `width_mm`, `height_mm`, `depth_mm`, `weight_g` (todos nullable, herdam do produto), `attributes` jsonb (padrão `{}`, ex.: `{"tamanho":"P","cor":"Preto"}`), `active`, `position`.

### `product_private`
`product_id` (pk, fk, cascade), `stl_url`, `source_url` (link de origem do modelo), `license`, `cost` numeric(10,2), `notes`. Tudo que é interno fica aqui: nada disso é exibido nem consultável publicamente.

### `admins`
`user_id` (pk, fk `auth.users`, cascade).

### `import_jobs`
`id`, `source_url`, `stl_url`, `status` (`pending` | `processing` | `done` | `error`), `error_message`, `product_id` (nullable), `extracted_data` jsonb (título, descrição e URLs de imagens extraídos, para a pré-visualização sobreviver a um recarregamento), `created_at`.

### View
`products_listing` (`security_invoker = true`): produtos ativos com o preço "a partir de" (menor preço entre o produto e suas variantes ativas) e a imagem de capa.

### Índices
`products(status, category_id, position)`, `products(slug)`, GIN em `products.tags`, `product_images(product_id, position)`, `categories(parent_id, position)`.

### Storage
Bucket público `products` (5 MB, WebP/JPEG/PNG). As imagens são servidas pela URL pública do bucket; **não** criar policy de SELECT para anônimos em `storage.objects` (evita listar arquivos de produtos em rascunho). SELECT, INSERT, UPDATE e DELETE em `storage.objects` apenas para `is_admin()`.

### Dados iniciais
A linha única de `site_settings` (com valores padrão, `whatsapp` e `instagram` vazios, sem placeholders) é inserida **na própria migration**, pois o app depende dela. O `supabase db push` não executa `seed.sql`: as 5 categorias e os 3 produtos de exemplo em `draft` ficam em `supabase/seed.sql` e só são aplicados no banco remoto se eu pedir.

---

## 6. Segurança (RLS)

- Função `is_admin()` (`security definer`) consulta a tabela `admins` com `auth.uid()`.
- **RLS ligado em todas as tabelas.**
- Leitura pública somente de: `site_settings`; `categories` ativas; `products` com `status = 'active'`; `product_images` e `product_variants` (ativas) desses produtos.
- Escrita em qualquer tabela, e qualquer acesso a `product_private`, `import_jobs` e `admins`: somente `is_admin()`.
- Estar logado **não** basta para ser admin. O middleware de `/admin` exige sessão **e** `is_admin()`.
- Testes obrigatórios na Fase 1 (usuário anônimo): não lê `product_private`; não lê produtos em `draft`/`hidden`; não insere, atualiza nem apaga nada.
- O desativamento de signup é feito por mim no painel do Supabase. Mesmo assim, o código não deve depender disso.
- **Grants explícitos em toda migration:** neste projeto o Supabase não concede privilégios automaticamente às roles `anon` e `authenticated`, e o Postgres checa o privilégio da tabela **antes** do RLS. Toda tabela ou view nova precisa de `GRANT` explícito na própria migration, com o mínimo necessário: `anon` apenas SELECT nas tabelas públicas; nada para `anon` em `product_private`, `import_jobs` e `admins`; `authenticated` com DML onde o admin precisa (o RLS com `is_admin()` decide). Nunca usar `alter default privileges` para conceder acesso automático.

---

## 7. Telas públicas

### 7.1 Home — `/`
- **Hero compacto** (altura máxima ~280px no desktop e ~220px no celular; pouco texto: título, uma linha de subtítulo, botão do catálogo e botão de WhatsApp; sem cartões de estatística). Modo definido por `site_settings.hero_mode`: `text` (hero compacto de texto), `image` (exibe a imagem `banner_url` enviada pelo admin como banner, proporção ~3:1 no desktop e ~2:1 no celular, cantos arredondados) ou `none` (sem hero: a home começa nas categorias). Se o modo for `image` e não houver `banner_url`, usar `text`.
- Categorias em destaque (`show_on_home`) em **cartões compactos** (altura ~96px: ícone, nome e contagem). No celular, carrossel horizontal com *scroll snap*, mostrando cerca de 2,3 cartões por vez para indicar que dá para rolar; no desktop, grade de até 6 cartões. Exibir apenas categorias com pelo menos 1 produto ativo. Nunca cartões altos que ocupem a tela inteira.
- Os números do hero são reais e coerentes com o rótulo: produtos ativos e categorias com produtos ativos.
- Seção de produtos da home: mostra os produtos da categoria definida em `site_settings.home_category_id` (até 8, por posição) e usa o nome da categoria como título, com link "Ver todos (N)" para `/catalogo?categoria=<slug>`. Se `home_category_id` for nulo, mostra os produtos com `featured = true` sob o título "Peças selecionadas".
- Bloco "Como pedir" em 3 passos (escolha, chame no WhatsApp, receba).
- Rodapé com logo, Instagram e WhatsApp.

### 7.2 Catálogo — `/catalogo`
- Cabeçalho no padrão da seção 4 (eyebrow, título com ponto em destaque, subtítulo com contagem).
- **Barra de filtros compacta** (mesmo desenho no celular e no desktop):
  - Linha 1: busca + botão "Filtros" com contador de filtros ativos.
  - Linha 2: categorias em **uma única linha rolável na horizontal** (scroll snap, sem quebra de linha, esmaecimento nas bordas, categoria ativa centralizada), com contagem e indicador deslizante. Item "Todos" fixo no início. Só aparecem categorias com produtos ativos.
  - Subcategorias: linha secundária menor, só quando a categoria selecionada tem filhas.
  - **Tags não ficam soltas na página.** Ficam no painel "Filtros" (bottom sheet no celular, popover no desktop), com campo de busca de tag e as mais usadas primeiro. A ordenação (destaque, menor preço, maior preço, mais recentes) fica no mesmo painel ou em um select compacto ao lado da contagem de resultados.
  - Filtros ativos aparecem como chips removíveis abaixo da barra, com "Limpar tudo" e a contagem de resultados ("4 peças").
  - Sem containers com fundo ao redor das abas: elas ficam direto sobre o fundo da página.
- Estado dos filtros na URL (`searchParams`) para link compartilhável.
- Grade responsiva: 2 colunas no celular, 3 no tablet, 4 no desktop. No desktop, seletor de densidade (3, 4 ou 5 colunas).
- Produtos com variantes ativas usam o efeito de cards empilhados e o selo "N OPÇÕES".
- Ao filtrar: cards animam com `layout`, sem recarregar a página.
- Botão "Carregar mais" (paginação de 24 itens).
- Estado vazio ilustrado com botão "Limpar filtros".

### 7.3 Produto — `/produto/[slug]`
- Galeria: imagem principal grande + miniaturas, crossfade, navegação por teclado e swipe no celular.
- Título, categoria (link), preço ("a partir de" quando há variantes), descrição.
- Seletor de variantes em chips; ao escolher, atualiza preço e dimensões.
- Ficha técnica: material, tempo estimado, dimensões, peso e cores (de `products.colors`).
- Preço vazio exibe "Sob consulta". Botão fixo "Pedir no WhatsApp" (oculto se `site_settings.whatsapp` estiver vazio) (fixo na base no celular), usando `whatsapp_message_template` com os campos `{produto}`, `{variante}` e `{link}`.
- Produtos relacionados (mesma categoria).
- Metadados SEO e Open Graph por produto.

### 7.4 Outros
- Página 404 bonita, `sitemap.xml`, `robots.txt`, favicon da marca.

### 7.5 Navegação (header)
- Header em formato de **cápsula**: barra flutuante, centralizada, afastada ~12px do topo, com a largura máxima do conteúdo, totalmente arredondada, fundo `--surface-glass` com `backdrop-blur`, borda `--line` e sombra suave. Logo à esquerda, menu (Início, Catálogo) e botão de WhatsApp à direita (oculto se `whatsapp` estiver vazio). No celular, a mesma cápsula compacta. Fica fixa no topo e a página tem `padding-top` para o conteúdo não ficar embaixo dela.
- Menu em pílula (Início, Catálogo) com **indicador deslizante** (`layoutId`) que anima entre os itens ao trocar de rota, com mola curta (250–350ms) e `prefers-reduced-motion` respeitado.
- Clicar em "Início" (ou no logo) com a rota já em `/` rola suavemente até o topo, de qualquer ponto da página (`scrollTo({ top: 0, behavior: 'smooth' })`, sem animação se reduced-motion), sem recarregar. Em outra rota, navega para `/` já no topo.
- Ao trocar de rota, a página nova abre no topo.
- Texto pequeno na cor de destaque (eyebrow, links) usa `--accent-strong` ou outra variação que passe contraste AA; a cor de destaque pura fica para preenchimentos (botões, selos, indicadores).

---

## 8. Telas de gerência

### 8.1 Login — `/login`
E-mail e senha. Sem cadastro, sem recuperação de senha. Mensagens de erro claras. Se já logado e admin, redireciona para `/admin`.

### 8.2 Dashboard — `/admin`
Bento grid no estilo das referências: 1 cartão sólido na cor de destaque com o total de produtos ativos (número grande, contagem animada), cartões brancos com rascunhos, ocultos e categorias, lista dos últimos produtos editados e 1 cartão escuro com o atalho "Importar produtos". Atalho "Novo produto" no cabeçalho. Sem métricas inventadas: apenas contagens reais do banco.

### 8.3 Produtos — `/admin/produtos`
- **Listagem sem rolagem horizontal** em telas a partir de 1024px, com a sidebar expandida ou recolhida. Colunas: seleção, produto (miniatura, nome em 1 linha com truncamento e slug pequeno), categoria, preço, status (selo), destaque (ícone de estrela) e **ações sempre visíveis** em coluna fixa à direita (editar + menu "⋯" com publicar/ocultar, destacar, duplicar e excluir). Alertas como "sem licença" viram um ícone pequeno com tooltip, não texto na linha. Linhas compactas (~56–64px). No celular, a lista vira cartões empilhados (miniatura, nome, preço, status e botão de ações), sem tabela.
- Busca, filtro por status e categoria.
- Ações rápidas: publicar/ocultar, destacar, duplicar, excluir (com confirmação).
- Seleção múltipla para ações em lote (publicar, ocultar, mudar categoria).

### 8.4 Formulário de produto — `/admin/produtos/novo` e `/admin/produtos/[id]`
- Campos: nome, slug (automático, editável), descrição, categoria, tags, preço (opcional), material, tempo, dimensões, peso, cores, status e destaque.
- Imagens: upload múltiplo com arrastar para reordenar, definir capa e remover. No servidor, converter para WebP e limitar a 1600px de largura (máx. 5 MB por arquivo).
- Variantes: lista editável (nome, preço, dimensões opcionais, atributos chave/valor).
- Bloco "Interno" (grava em `product_private`): link do STL, origem (`source_url`), licença, custo e notas, com aviso visual de que não é público.
- Pré-visualização de como o card e a página ficarão na vitrine.
- Aviso (não bloqueio) se a licença estiver vazia ao publicar.
- Salvar como rascunho ou publicar. Botões: "Salvar" (volta para a lista com aviso de sucesso) e "Salvar e adicionar outro", que **limpa o formulário por completo** (campos, imagens e pré-visualizações, variantes, bloco interno, slug automático e qualquer rascunho local), mantém apenas a categoria escolhida e foca o campo nome. Em criação nova, o formulário nunca reaparece preenchido com dados do produto anterior.

### 8.5 Categorias — `/admin/categorias`
CRUD com subcategorias, reordenação por arrastar, alternar `active` e `show_on_home`.

### 8.6 Importar — `/admin/importar`
Duas abas: **Por links** (seções 9.1 a 9.3) e **Planilha manual** (seção 9.4).

### 8.7 Configurações — `/admin/configuracoes`
Editar `site_settings`: nome, descrição, logo, banner (upload de imagem), **modo do hero** (texto, imagem ou nenhum), **categoria da home** (select de categorias ativas ou "Produtos em destaque"), cor de destaque (com preview), WhatsApp, Instagram e modelo da mensagem do WhatsApp.

### Layout do admin
Sidebar enxuta (Dashboard, Produtos, Categorias, Importar, Configurações), **recolhível no desktop** (botão que alterna entre expandida, só ícones com tooltip e oculta; o estado é lembrado no navegador), item ativo em pílula translúcida, rótulos de seção em caixa alta pequena e contadores à direita. **Contraste:** a cor da sidebar é derivada da cor de destaque, escurecida até o texto branco passar contraste AA (4.5:1); nunca texto preto sobre laranja vivo. Texto secundário em branco a ~72% e ícones nítidos. No celular, a sidebar vira gaveta (drawer); topo com botão "Ver site" e "Sair". Mesma linguagem visual do site público.

---

## 9. Importação

### 9.1 Importar por link (individual)
Botão em `/admin/produtos`. O admin cola a URL do modelo. Um Route Handler no servidor busca a página e extrai título, descrição e imagens via Open Graph e JSON-LD. Abre o formulário de novo produto pré-preenchido (status `draft`) e salva a URL em `product_private.source_url`.

### 9.2 Importar em lote — `/admin/importar`
1. Caixa de texto: uma linha por item no formato `link_do_modelo, link_do_stl` (o STL é opcional).
2. "Processar" cria registros em `import_jobs` (`pending`) e processa em fila: no máximo 3 simultâneos, com pequeno intervalo entre requisições. O resultado da extração é gravado em `import_jobs.extracted_data`, para a pré-visualização sobreviver a recarregar a página.
3. Cada linha mostra progresso: pendente, processando, ok ou erro (com mensagem).
4. Tabela de pré-visualização editável: título, categoria, preço, imagem de capa e STL, com opção de enviar a imagem manualmente por linha.
5. Detectar duplicados por `source_url` já existente e sinalizar.
6. "Salvar selecionados": cria produtos em `draft`, baixa e processa as imagens para o Storage, grava o STL em `product_private.stl_url` e liga `import_jobs.product_id`.
7. Linhas com erro permitem "tentar de novo" ou "completar manualmente" (abre o formulário).

### 9.3 Segurança e robustez do importador
- Aceitar apenas `http` e `https`. **Bloquear SSRF:** recusar hosts que resolvam para IPs privados, locais ou de metadata (`localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, IPv6 local).
- Timeout de 10s por requisição, limite de tamanho de resposta e de imagem (5 MB), `User-Agent` identificável, sem seguir redirecionamentos infinitos.
- Todas as rotas de importação exigem sessão + `is_admin()`.
- Se a extração falhar, **nunca travar**: o fluxo manual sempre funciona.
- Sites com proteção anti-bot (ex.: Cloudflare) podem devolver 403 ou um desafio em vez dos metadados. Tratar como erro daquela linha (sem tentar contornar a proteção) e oferecer preenchimento manual, inclusive upload de imagem.
- A validação SSRF vale também para cada redirecionamento (`redirect: 'manual'`, validando cada salto), para DNS resolvido antes do `fetch` e para as URLs de imagem (`og:image`) baixadas para o `sharp`.
- Conteúdo de terceiros é tratado como dado, nunca como instrução ou HTML confiável (sanitizar descrição).
- Lembrete na interface: só publicar o que for criação própria ou tiver licença que permita uso comercial.

### 9.4 Cadastro manual em lote (aba "Planilha manual")
Para cadastrar vários produtos de uma vez, sem links.
- **Grade editável estilo planilha**, uma linha por produto. Colunas: imagem de capa (miniatura, upload por clique ou arrastar), nome, categoria (select), preço, tags (separadas por vírgula), cores, link do STL (interno) e status.
- **Arrastar várias fotos de uma vez** cria uma linha por foto, com o nome sugerido a partir do nome do arquivo (sem extensão, hífens e underscores viram espaços, primeira letra maiúscula). Fotos extras do mesmo produto são adicionadas depois, na edição.
- **Colar da planilha:** dados copiados do Excel ou Google Sheets (TSV) criam linhas na ordem das colunas exibidas. Cabeçalho opcional é detectado e ignorado.
- Ações rápidas: adicionar, duplicar e remover linha; "preencher coluna" para as linhas selecionadas (ex.: mesma categoria ou mesmo preço); navegação com Tab e Enter como em planilha.
- Validação por linha antes de salvar (nome obrigatório, preço numérico, slug único gerado automaticamente, com sufixo se já existir). Linhas inválidas ficam destacadas e não impedem salvar as demais.
- "Salvar tudo": cria como `draft` (padrão) ou `active`, conforme escolha no topo. Imagens processadas como na seção 8.4 (WebP, 1600px, máx. 5 MB). STL gravado em `product_private.stl_url`. Limite de 50 linhas por envio. No fim, resumo (criados e com erro) e link para a lista de produtos filtrada pelos recém-criados.
- O conteúdo da grade sobrevive a recarregar a página (armazenamento local do navegador).
- Mesmas regras de segurança do restante do admin: Server Action com sessão + `is_admin()`, validação Zod e invalidação do cache público após salvar.

---

## 10. Fases e critérios de aceite

Em cada fase: build e lint passando, telas testadas no navegador, resumo entregue e commit feito.

### Fase 0 — Preparação
- Projeto Next.js já criado. Instalar dependências (seção 2), inicializar shadcn/ui, configurar fontes e Tailwind, criar a estrutura de pastas.
- Confirmar que `.env.local` existe com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sem imprimir valores).
- **Aceite:** `npm run dev` abre uma página inicial vazia sem erros.

### Fase 1 — Banco e migrations
- Criar as migrations da seção 5 e as políticas da seção 6. Aplicar com `supabase db push`, gerar `types/database.ts`.
- Rodar os testes de anônimo e mostrar a evidência.
- Entregar o SQL para eu inserir meu usuário em `admins`.
- **Aceite:** testes de segurança passando; seed aplicado.

### Fase 2 — Fundação e design system
- Clientes Supabase (browser, server, middleware), tokens da seção 4, componentes base (button, input, select, dialog, table, toast, skeleton, badge), `lib/motion.ts`, `MotionConfig`.
- Página `/styleguide` (apenas em desenvolvimento) mostrando tokens, tipografia, componentes e animações.
- **Aceite:** o `/styleguide` precisa parecer da mesma família visual das imagens em `docs/referencias/` (compare lado a lado e liste as diferenças). Eu aprovo antes de seguir.

### Fase 3 — Área pública
- Seção 7 completa, lendo dados reais do Supabase.
- **Aceite:** navegação fluida no celular e no desktop; filtros animados; botão de WhatsApp correto; nenhum dado privado em nenhuma resposta de rede.

### Fase 4 — Autenticação e gerência
- Seção 8 completa (login, dashboard, produtos, formulário, categorias, configurações), middleware de proteção.
- **Aceite:** usuário não admin não acessa `/admin`; CRUD completo funcionando; upload e reordenação de imagens funcionando.

### Fase 5 — Importação
- Seção 9 completa.
- **Aceite:** importar 1 link e um lote de 5 links (incluindo 1 inválido e 1 duplicado) sem travar; STL salvo apenas em `product_private`.

### Fase 6 — Acabamento e deploy
- Revisão visual geral, acessibilidade, performance (imagens, cache, revalidação), skeletons, estados vazios, SEO, favicon.
- README curto: como rodar, como criar migration, como adicionar admin, variáveis de ambiente.
- Checklist final de segurança (tentativas anônimas de ler dados privados e de escrever).
- Preparar deploy na Vercel (variáveis de ambiente listadas na seção 12).
- **Aceite:** build de produção limpo e checklist de segurança passando.

---

## 11. Fora de escopo (por enquanto)

Checkout e pagamento, carrinho, estoque, cadastro de clientes, multi-loja, recuperação de senha, comentários e avaliações, integração com o app de gestão de impressoras.

---

## 12. Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Nenhuma outra chave é necessária. Não usar a service role key.
