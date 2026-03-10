# Technical Assumptions

## Repository Structure: Monorepo

Assumimos um monorepo para manter em um unico projeto a camada de orquestracao agent-first, a integracao com o Notion, contratos, workflows, memoria, configuracoes do AIOX, workers de apoio e eventuais superficies web. Isso reduz friccao operacional e combina com o momento MVP.

## Service Architecture

Assumimos uma arquitetura de monolito modular agent-first com fronteiras claras por dominio, combinando:

- uma camada principal de orquestracao em TypeScript para missoes, handoffs, aprovacoes, memoria e processos;
- uma camada de integracao com o Notion para projetos, epics, stories e tasks;
- mecanismos assincronos internos para filas, roteamento e execucao de workflows;
- persistencia transacional para entidades operacionais, historico e estado dos agentes;
- superficies web opcionais para observabilidade e apoio gerencial;
- integracoes externas isoladas por adaptadores.

Essa escolha privilegia entrega rapida, menor custo de coordenacao e menor complexidade de deploy no MVP, sem bloquear evolucao futura para componentes mais distribuidos.

## Testing Requirements

Assumimos a necessidade de:

- testes unitarios para regras de dominio e validadores;
- testes de integracao para contratos de handoff, roteamento, aprovacoes, persistencia e sincronizacao com o Notion;
- validacao de fluxos criticos ponta a ponta para os processos MVP;
- checks automatizados para drift de agentes, skills e integracoes do Codex/AIOX.

## Additional Technical Assumptions and Requests

- Stack inicial recomendada: monorepo TypeScript com `Node.js` para a camada principal de orquestracao, integracao oficial com a API do Notion para controle de projetos, `PostgreSQL` via Supabase para persistencia operacional e `Next.js 16 + React + Tailwind` para superficies de apoio.
- Linguagem principal recomendada: TypeScript, para reduzir ambiguidade entre contratos de handoff, modelos de processo, estados de workflow e integracoes.
- O uso de `Next.js` nao implica uma UI-heavy first strategy; ele entra como melhor opcao para dashboards e apoio operacional futuros, mantendo alinhamento com o preset ativo do AIOX.
- Banco inicial sugerido: PostgreSQL, potencialmente via Supabase, para suportar entidades operacionais, historico, filas, memoria e superficies de observabilidade.
- O Notion deve ser modelado com, no minimo, niveis de projeto, epic, story e task, com propriedades suficientes para setor, owner, prioridade, status, dependencia e link com execucao.
- O OpenClaw deve ter permissao e fluxo claro para criar projetos no Notion antes do refinamento pelos C-levels.
- Contratos de handoff e tarefa devem ser persistidos em formato estruturado e validados por schema.
- Autenticacao e autorizacao devem existir desde o inicio ao menos para diferenciar fundadores, CEO/orchestrator e operadores/aprovadores.
- Integracoes com canais externos, CRMs, anuncios ou comunicacao devem ficar atras de adapters para nao acoplar o nucleo do produto a fornecedores especificos.
- O produto deve nascer com observabilidade basica para acompanhar falhas de roteamento, timeouts, rejeicoes em validacao e gargalos de aprovacao.
- O modelo de fases do organograma deve ser refletido em feature flags ou habilitacao gradual de capacidades por setor.
