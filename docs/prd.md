# GMV AI Company 1.0 Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Formalizar a GMV AI Company como um sistema operacional AI-first executavel sobre `aiox-core` no Codex Desktop.
- Transformar a estrutura organizacional descrita na `.docs` em fluxos operacionais reais entre os fundadores, o CEO artificial, C-levels, specialists e workers.
- Padronizar handoffs, aprovacoes, validacoes e escalonamentos entre setores para reduzir caos operacional e dependencia de contexto implicito.
- Priorizar a operacao MVP dos setores de Marketing, Sales e Technology, com Brand e Quality atuando como camadas de governanca e validacao.
- Viabilizar fluxos centrais do negocio GMV nas frentes de conteudo organico, vendas e infraestrutura/automacoes para suportar a operacao comercial.
- Definir o Notion como sistema canonico de planejamento e controle de projetos, epics, stories e tasks da operacao.
- Garantir memoria organizacional modular, rastreabilidade e visibilidade operacional para que os fundadores, com Vitor Perin como lider tecnico e operador principal dos agentes, consigam escalar a empresa com apoio do OpenClaw.
- Preparar a base para expansao futura de Product, AgentOps avancado, BI e automacoes com maior autonomia.

### Background Context

Os documentos da pasta `.docs` descrevem uma visao clara da GMV como uma empresa AI-first operada por agentes, com o OpenClaw como CEO artificial e uma malha de C-levels, specialists e workers distribuida por departamentos. A direcao agora esta validada como GMV AI Company, com Isa Novaes e Vitor Perin como fundadores, e Vitor atuando como lider tecnico e operador principal dos agentes. Hoje, essa visao existe como organograma, mapa de processos, tipologia de processos e protocolo de handoff, mas ainda nao esta consolidada como um produto executavel com requisitos funcionais, prioridades de MVP e sequenciamento de entrega.

O objetivo deste PRD inicial e transformar essa arquitetura conceitual em um produto implementavel: um sistema operacional agent-first da GMV AI Company em que Vitor passa missoes ao OpenClaw, o OpenClaw cria e organiza projetos no Notion, os C-levels refinam epics, stories e tasks nesse workspace e os agentes autonomos/squads executam os fluxos com governanca, handoffs e validacoes. O mapa visual anexado em `.docs` reforca que o MVP precisa suportar, no minimo, tres trilhas operacionais de valor: marketing/conteudo, vendas e tecnologia como habilitadora de paginas, automacoes e infraestrutura operacional.

### Validated Direction for This Draft

- O nome canonico do produto e da operacao neste PRD e `GMV AI Company`.
- Isa Novaes e Vitor Perin sao tratados como fundadores, com Vitor assumindo o papel de lider tecnico e operador principal dos agentes.
- O MVP e agent-first: Vitor passa missoes ao OpenClaw, o OpenClaw cria os projetos no Notion, os C-levels desenvolvem epics, stories e tasks nesse ambiente, e os agentes/squads executam de forma autonoma sob governanca.
- Os setores prioritarios do MVP sao Marketing, Sales e Technology, com Brand e Quality atuando como camadas de apoio e validacao.
- O Notion e o sistema canonico de planejamento, controle e acompanhamento de projetos, epics, stories e tasks.
- Superficies web continuam valiosas para observabilidade e apoio operacional, mas nao sao a superficie primaria do MVP.

### Source Artifacts Used in This Draft

- `.docs/gmv-ai-company-organograma-1.0.md`
- `.docs/gmv-process-map.md`
- `.docs/gmv-process-types.md`
- `.docs/gmv-agent-handoffs.md`
- `.docs/WhatsApp Image 2026-03-03 at 14.42.09.jpeg`

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-03-08 | 0.1 | First PRD draft created from `.docs` source materials | Codex |
| 2026-03-08 | 0.2 | Draft refined with validated assumptions from the founders' operating model | Codex |
| 2026-03-08 | 0.3 | Notion defined as system of record for projects, epics, stories and tasks | Codex |

## Requirements

### Functional

1. FR1: O sistema deve permitir que os fundadores registrem missoes estrategicas e que Vitor Perin encaminhe essas missoes ao OpenClaw com objetivo, contexto, prioridade, setor impactado, criterios de sucesso e status.
2. FR2: O sistema deve representar explicitamente a estrutura organizacional da GMV, incluindo os dois fundadores, o CEO artificial, C-levels, specialists, workers e seus respectivos setores.
3. FR3: O sistema deve classificar cada processo operacional em um dos quatro tipos definidos na documentacao-base: Strategic, Operational, Optimization ou Governance.
4. FR4: O sistema deve usar o Notion como sistema canonico para criar e controlar projetos, epics, stories e tasks da operacao.
5. FR5: O OpenClaw deve conseguir criar projetos no Notion a partir das missoes recebidas de Vitor Perin, vinculando objetivo, contexto, setor, prioridade e status inicial.
6. FR6: Os C-levels devem conseguir desenvolver dentro do Notion a decomposicao de cada projeto em epics, stories e tasks antes da execucao dos squads.
7. FR7: O sistema deve exigir que toda task relevante, inclusive as tarefas pre-estabelecidas pelo OpenClaw, contenha no minimo objetivo, contexto, responsavel, input necessario, output esperado e criterio de aceite.
8. FR8: O modelo do Notion deve preservar relacionamento hierarquico entre projeto, epic, story e task, com rastreabilidade entre origem estrategica e execucao operacional.
9. FR9: O sistema deve implementar um contrato padrao de handoff entre agentes com os campos definidos em `.docs/gmv-agent-handoffs.md`, incluindo `task_id`, `origin_agent`, `target_agent`, `task_type`, `priority`, `context`, `input`, `expected_output`, `deadline` e `validation_rules`.
10. FR10: O sistema deve validar handoffs antes do envio, rejeitando payloads incompletos ou inconsistentes.
11. FR11: O sistema deve registrar a resposta de cada handoff com status, resultado, nivel de confianca, notas e indicador de necessidade de validacao.
12. FR12: O sistema deve suportar roteamento de tarefas entre setores, incluindo pelo menos os fluxos Marketing -> Brand, Marketing -> Sales, Sales -> Technology, Technology -> Quality e Quality -> CEO.
13. FR13: O sistema deve implementar a cadeia de escalonamento definida nos documentos-base: Specialist -> C-level, C-level -> CEO e CEO -> Founder.
14. FR14: O sistema deve suportar o fluxo MVP de estrategia e producao de conteudo para Marketing, incluindo manifesto/editorial, calendario, roteiros, copy, criativos e analise de metricas.
15. FR15: O sistema deve suportar o fluxo MVP de Sales, incluindo treinamento comercial, acompanhamento de leads, agendamentos, comparecimento e fechamento.
16. FR16: O sistema deve suportar o fluxo MVP de Technology, incluindo solicitacoes de landing pages, automacoes, integracoes e infraestrutura necessaria para habilitar Marketing e Sales.
17. FR17: O sistema deve incluir validacao intersetorial em entregas criticas, passando por revisao de specialist, consistencia de marca, validacao de qualidade e aprovacao final quando aplicavel.
18. FR18: O sistema deve manter memoria organizacional modular por dominio, contemplando no minimo marca, produtos/ofertas, vendas, tecnologia e operacao.
19. FR19: O sistema deve oferecer uma visao operacional consolidada de status, gargalos, aprovacoes pendentes, handoffs em aberto e KPIs por setor, seja em artefatos no Codex/AIOX, seja em superficies de apoio.
20. FR20: O sistema deve sincronizar status relevantes entre a execucao dos squads e os registros correspondentes no Notion, evitando divergencia entre planejamento e operacao.
21. FR21: O sistema deve registrar historico auditavel de decisoes, handoffs, aprovacoes, validacoes e escalonamentos.
22. FR22: O sistema deve permitir a habilitacao gradual de setores e squads por fase, distinguindo claramente o escopo MVP, Fase 2 e Fase 3.
23. FR23: O sistema deve permitir que novos agentes, setores e workflows sejam adicionados sem reestruturar os contratos centrais de tarefa, handoff e validacao.

### Non Functional

1. NFR1: O produto deve operar de forma compativel com `aiox-core` e Codex Desktop, sem depender de contexto oculto fora dos artefatos do projeto.
2. NFR2: Nenhum agente ou workflow pode depender de contexto implicito; todo dado necessario para execucao deve estar presente no payload, memoria modular ou artefatos explicitamente referenciados.
3. NFR3: Acoes com impacto estrategico, publicacao externa, alteracao irreversivel ou risco operacional elevado devem exigir aprovacao humana explicita.
4. NFR4: Todas as entradas estruturadas devem ser validadas e sanitizadas antes de persistencia ou roteamento.
5. NFR5: A arquitetura deve preservar separacao modular entre dominios de negocio, evitando acoplamento excessivo entre Marketing, Sales, Technology, Operations, Brand, Quality e Support.
6. NFR6: O sistema deve expor erros de roteamento, validacao e execucao de forma clara, com contexto suficiente para correcao e reprocessamento.
7. NFR7: O sistema deve manter trilha de auditoria completa para suportar revisao operacional, aprendizado e governanca.
8. NFR8: Os fluxos MVP devem ser testaveis localmente, incluindo validacao de contratos, roteamento, aprovacoes e estados principais dos processos.
9. NFR9: A base MVP deve suportar expansao para Product, AgentOps e BI avancado sem exigir reescrita completa da arquitetura.
10. NFR10: A experiencia inicial deve ser pensada para operacao em portugues do Brasil, com terminologia alinhada ao contexto da GMV.
11. NFR11: Qualquer superficie web de apoio operacional, quando presente, deve atender no minimo o nivel WCAG AA.
12. NFR12: O produto deve privilegiar simplicidade arquitetural no MVP, reduzindo complexidade operacional desnecessaria para uma empresa de uma pessoa com apoio de agentes.
13. NFR13: O Notion deve funcionar como fonte de verdade para planejamento e acompanhamento, com sincronizacao confiavel entre o estado operacional e o estado registrado no workspace.
14. NFR14: A integracao com o Notion deve ser resiliente a falhas transitorias, com retry, observabilidade e tratamento de divergencia de estado.

## User Interface Design Goals

### Overall UX Vision

Uma camada de apoio operacional premium, clara e orientada a decisao, onde Vitor Perin, os fundadores e o CEO artificial consigam entender rapidamente o estado da empresa, iniciar missoes, aprovar entregas e identificar gargalos sem navegar por camadas confusas de configuracao. A UX nao e a superficie primaria do MVP, mas quando existir deve ampliar a capacidade de comando e observabilidade da operacao agent-first.

### Key Interaction Paradigms

- Missao passada por Vitor -> OpenClaw -> projeto criado no Notion -> C-levels refinam epics/stories/tasks -> squads executam -> handoff -> validacao -> resumo operacional
- Operacao agent-first com superficies de apoio para observabilidade, e nao o contrario
- Filas operacionais, aprovacoes e estados de agentes como objetos de primeira classe
- KPIs e status sempre conectados a agentes, workflows, entregas reais e objetos do Notion
- Memoria e contexto acessiveis sem exigir leitura manual de varios arquivos

### Core Screens and Views

- Mission Intake and OpenClaw Routing View
- Notion Project and Epic Control View
- Agent Status and Sector Health Board
- Mission Detail and Execution Timeline
- Handoff Queue and Approval Review
- Marketing Operations View
- Sales Funnel and Training View
- Technology Requests and Delivery View
- Quality and Brand Validation View
- Knowledge and Memory Workspace

### Accessibility: WCAG AA

O produto deve buscar contraste adequado, navegacao clara, hierarquia visual consistente e componentes utilizaveis em desktop e mobile sem depender exclusivamente de cor para indicar status.

### Branding

O visual deve refletir posicionamento premium, estrategico e operacional. A linguagem visual precisa parecer uma "empresa AI de verdade", e nao uma colecao de cards genericos. O tom deve equilibrar inteligencia executiva, confianca e clareza. Assumimos, por enquanto, que a identidade final da GMV ainda sera consolidada em documentos especificos de marca.

### Target Device and Platforms: Cross-Platform (Codex Desktop First)

Assumimos operacao principal no Codex Desktop com `aiox-core`, com o Notion como sistema de controle de projetos e superficies web responsivas opcionais de apoio para observabilidade, aprovacao e leitura executiva quando isso agregar valor ao fluxo.

## Technical Assumptions

### Repository Structure: Monorepo

Assumimos um monorepo para manter em um unico projeto a camada de orquestracao agent-first, a integracao com o Notion, contratos, workflows, memoria, configuracoes do AIOX, workers de apoio e eventuais superficies web. Isso reduz friccao operacional e combina com o momento MVP.

### Service Architecture

Assumimos uma arquitetura de monolito modular agent-first com fronteiras claras por dominio, combinando:

- uma camada principal de orquestracao em TypeScript para missoes, handoffs, aprovacoes, memoria e processos;
- uma camada de integracao com o Notion para projetos, epics, stories e tasks;
- mecanismos assincronos internos para filas, roteamento e execucao de workflows;
- persistencia transacional para entidades operacionais, historico e estado dos agentes;
- superficies web opcionais para observabilidade e apoio gerencial;
- integracoes externas isoladas por adaptadores.

Essa escolha privilegia entrega rapida, menor custo de coordenacao e menor complexidade de deploy no MVP, sem bloquear evolucao futura para componentes mais distribuidos.

### Testing Requirements

Assumimos a necessidade de:

- testes unitarios para regras de dominio e validadores;
- testes de integracao para contratos de handoff, roteamento, aprovacoes, persistencia e sincronizacao com o Notion;
- validacao de fluxos criticos ponta a ponta para os processos MVP;
- checks automatizados para drift de agentes, skills e integracoes do Codex/AIOX.

### Additional Technical Assumptions and Requests

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

## Epic List

1. Epic 1: Foundation, Notion Model and Agent Operating System: Estabelecer a base do produto, o modelo organizacional e a primeira espinha dorsal operacional agent-first integrada ao Notion.
2. Epic 2: Structured Handoffs, Routing and Governance: Implementar contratos, roteamento, aprovacoes e validacoes que conectam os setores da empresa artificial.
3. Epic 3: Marketing, Sales and Technology MVP Workflows: Entregar os fluxos operacionais prioritarios dos tres setores centrais do MVP e sua colaboracao intersetorial.
4. Epic 4: Memory, Optimization and Scalable Expansion: Consolidar memoria, KPIs, loops de melhoria e base para expansao de novos setores e automacoes.

## Epic 1 Foundation, Notion Model and Agent Operating System

Objetivo expandido: Criar a espinha dorsal do produto e entregar um primeiro incremento deployavel que permita receber missoes dos fundadores, transformar essas missoes em trabalho orquestrado pelo OpenClaw, refletir isso no Notion e acompanhar o estado basico da empresa artificial. Ao final deste epic, a GMV ja deve possuir um "canary" funcional do seu sistema operacional agent-first, mesmo com workflows ainda simplificados.

### Story 1.1 Bootstrap the project and publish the agent operating shell

As Vitor Perin or a founder,  
I want a deployable agent operating shell,  
so that the project has a real operational entry point from the first increment.

#### Acceptance Criteria

1. A base da aplicacao deve subir localmente e identificar claramente o produto como sistema operacional da GMV AI Company.
2. O primeiro incremento deve permitir ao menos registrar uma missao inicial, exibir o status do ambiente e indicar quando nao houver missoes ativas.
3. O incremento deve incluir pipeline minima de execucao local e convencoes basicas do projeto para permitir continuidade do desenvolvimento.
4. O operating shell deve ser compativel com o uso conjunto de artefatos do AIOX/Codex no mesmo repositorio.

### Story 1.2 Register the organizational model and sector structure

*Prerequisite:* Story 1.1

As a founder or technical lead,  
I want to cadastrar a estrutura da empresa e seus agentes-chave,  
so that every mission and handoff can reference valid sectors and roles.

#### Acceptance Criteria

1. O sistema deve permitir registrar Isa Novaes e Vitor Perin como fundadores, o OpenClaw como CEO artificial, e os demais C-levels, specialists e workers com nome, papel, setor e fase de habilitacao.
2. O sistema deve refletir no minimo os setores MVP definidos neste PRD: Marketing, Sales e Technology, com Brand e Quality como camadas de apoio e validacao.
3. O sistema deve diferenciar agentes executivos, specialists e workers deterministicos.
4. A estrutura cadastrada deve poder ser consultada em visao organizacional e reutilizada por missoes e handoffs.

### Story 1.3 Create the mission-to-Notion project model

*Prerequisite:* Story 1.2

As a CEO artificial,  
I want to criar projetos no Notion a partir das missoes recebidas,  
so that strategy can become executable work with clear ownership.

#### Acceptance Criteria

1. O sistema deve permitir ao OpenClaw criar no Notion um projeto a partir de cada missao com objetivo, contexto, prioridade, status, responsavel e metricas de sucesso.
2. O modelo do Notion deve suportar decomposicao em epics, stories e tasks relacionadas ao projeto de origem.
3. Cada projeto e seus itens descendentes devem ser classificados como Strategic, Operational, Optimization ou Governance quando aplicavel.
4. O sistema deve impedir a persistencia de projetos e tasks no Notion sem os campos obrigatorios definidos no PRD.

### Story 1.4 Enable C-level planning flow inside Notion

*Prerequisite:* Story 1.3

As a C-level owner,  
I want to refinar projetos do Notion em epics, stories e tasks,  
so that squads receive work that is already structured for execution.

#### Acceptance Criteria

1. Cada C-level deve conseguir assumir ownership de projetos criados pelo OpenClaw dentro do Notion.
2. O refinamento deve permitir quebrar o projeto em epics, stories e tasks com owner, setor, prioridade e dependencias.
3. O fluxo deve tornar visivel quando um projeto ainda nao esta pronto para execucao pelos squads.
4. O sistema deve registrar o status de planejamento e readiness de cada conjunto de trabalho.

### Story 1.5 Visualize executive status across missions and sectors

*Prerequisite:* Story 1.4

As Vitor Perin or OpenClaw,  
I want a consolidated operational view,  
so that I can understand the current status of missions and sectors without depender de acompanhamento manual disperso.

#### Acceptance Criteria

1. O sistema deve expor status por setor, projetos ativos no Notion, pendencias de aprovacao e principais gargalos em artefatos ou superficies de apoio.
2. A visao operacional deve permitir navegar da visao geral para o detalhe de uma missao e seu projeto correspondente no Notion.
3. O sistema deve destacar itens bloqueados, atrasados ou aguardando validacao.
4. O acompanhamento operacional deve funcionar com dados iniciais gerados no proprio ambiente de desenvolvimento e refletidos no Notion.

## Epic 2 Structured Handoffs, Routing and Governance

Objetivo expandido: Transformar a comunicacao entre agentes em fluxo controlado e auditavel, garantindo que a empresa artificial nao opere como uma troca caotica de prompts. Ao final deste epic, handoffs, aprovacoes e escalonamentos devem operar como mecanismos centrais do sistema.

### Story 2.1 Validate the standard handoff contract

*Prerequisite:* Story 1.5

As a specialist or C-level,  
I want to enviar handoffs usando um contrato padrao validado,  
so that downstream agents always receive complete and usable context.

#### Acceptance Criteria

1. O sistema deve gerar e validar handoffs com todos os campos obrigatorios definidos neste PRD.
2. Handoffs invalidos devem ser rejeitados com mensagem clara indicando os campos faltantes ou inconsistentes.
3. O contrato validado deve ser persistido para rastreabilidade.
4. O sistema deve permitir registrar tambem a resposta padrao do handoff apos sua conclusao.

### Story 2.2 Route handoffs between sectors through a managed queue

*Prerequisite:* Story 2.1

As the orchestration layer,  
I want to rotear handoffs entre setores por uma fila gerenciada,  
so that work can move predictably across the company.

#### Acceptance Criteria

1. O sistema deve permitir encaminhar handoffs pelos fluxos intersetoriais MVP definidos no mapa de processos.
2. Cada handoff deve ter status rastreavel, incluindo ao menos queued, in_progress, completed, rejected e escalated.
3. A fila deve registrar origem, destino, prioridade e timestamps principais.
4. O sistema deve impedir envio para agentes ou setores nao habilitados.

### Story 2.3 Apply approval and escalation rules to critical deliveries

*Prerequisite:* Story 2.2

As a CEO or founders,  
I want critical deliveries to follow approval and escalation rules,  
so that strategic and risky actions remain under control.

#### Acceptance Criteria

1. O sistema deve suportar a cadeia de escalonamento Specialist -> C-level -> CEO -> Founder.
2. Entregas marcadas como estrategicas, externas ou de alto risco devem exigir aprovacao explicita antes de serem consideradas concluidas.
3. O sistema deve registrar quem aprovou, quando aprovou e com qual justificativa.
4. O sistema deve permitir rejeicao com feedback estruturado para reprocessamento.

### Story 2.4 Validate deliveries with brand and quality gates

*Prerequisite:* Story 2.3

As a quality or brand owner,  
I want to validar entregas antes da aprovacao final,  
so that outputs maintain brand consistency and real execution quality.

#### Acceptance Criteria

1. O sistema deve permitir configurar gates de validacao por tipo de entrega e por setor.
2. Entregas relevantes de marketing e comunicacao devem passar por validacao de Brand quando aplicavel.
3. Entregas operacionais e tecnicas devem passar por validacao de Quality quando aplicavel.
4. O resultado da validacao deve ficar associado a task, handoff, missao e item correspondente no Notion.

## Epic 3 Marketing, Sales and Technology MVP Workflows

Objetivo expandido: Entregar os fluxos de negocio dos tres setores mais prioritarios para o MVP: Marketing, Sales e Technology. Ao final deste epic, a empresa artificial ja deve conseguir conduzir um ciclo principal de criacao de demanda, conversao e habilitacao tecnica sob o modelo agent-first.

### Story 3.1 Run the social content workflow end to end

*Prerequisite:* Story 2.4

As the marketing team,  
I want to executar o fluxo de estrategia e producao de conteudo,  
so that the company can produce and govern recurring social media output.

#### Acceptance Criteria

1. O fluxo deve cobrir pelo menos manifesto/editorial, calendario, roteiro, copy, criativo e aprovacao final.
2. O sistema deve permitir relacionar cada entrega de conteudo a campanha, objetivo e canal.
3. O fluxo deve registrar revisoes e validacoes de Brand e, quando aplicavel, indicadores de desempenho.
4. O output final deve ficar disponivel para consulta, aprovacao ou reuso e vinculado ao projeto/story/task correspondente no Notion.

### Story 3.2 Operate the sales enablement and funnel workflow

*Prerequisite:* Story 3.1

As the sales team,  
I want to acompanhar treinamento e etapas do funil comercial,  
so that leads can progress from qualification to closing with visibility.

#### Acceptance Criteria

1. O sistema deve suportar ao menos os estados de lead/agendamento, comparecimento e fechamento.
2. O fluxo deve permitir relacionar materiais de vendas, scripts e treinamentos aos resultados do funil.
3. O sistema deve registrar handoffs entre Marketing, Sales e Technology quando o fluxo exigir suporte de infraestrutura ou ativos.
4. A equipe executiva deve conseguir visualizar taxas basicas de avancamento do funil e o andamento correspondente no Notion.

### Story 3.3 Run the technology enablement workflow for business demands

*Prerequisite:* Story 3.2

As the technology team,  
I want to receber demandas de Marketing e Sales e converte-las em entregas tecnicas,  
so that the company can operar landing pages, automacoes e infraestrutura sem depender de execucao ad hoc.

#### Acceptance Criteria

1. O sistema deve permitir abrir demandas tecnicas com origem, objetivo, contexto, dependencia e output esperado.
2. O fluxo deve cobrir pelo menos paginas/landing pages, automacoes e entregas de infraestrutura operacional.
3. O sistema deve registrar handoffs entre Marketing, Sales, Technology e Quality quando a entrega exigir validacao ou suporte cruzado.
4. O fluxo deve gerar visibilidade clara de backlog, status de entrega e bloqueios tecnicos, com reflexo nos registros do Notion.

### Story 3.4 Approve an end-to-end marketing-to-sales-to-technology flow

*Prerequisite:* Story 3.3

As a CEO artificial,  
I want to acompanhar um fluxo completo entre marketing, vendas e tecnologia ate validacao final,  
so that the MVP proves the company can operate across sectors in sequence.

#### Acceptance Criteria

1. O sistema deve suportar um fluxo completo envolvendo founders, OpenClaw, Marketing, Sales, Technology e Quality, com Brand quando aplicavel.
2. O fluxo deve registrar todas as trocas de handoff, validacoes e aprovacoes principais.
3. O sistema deve evidenciar onde cada setor entrou, qual output produziu e qual decisao tomou.
4. Ao final do fluxo, a missao deve poder ser marcada como aprovada, rejeitada ou em iteracao.

## Epic 4 Memory, Optimization and Scalable Expansion

Objetivo expandido: Consolidar a empresa artificial como sistema adaptativo, conectando memoria, KPI, melhoria continua e readiness para novos setores. Ao final deste epic, o produto ja deve sustentar aprendizado operacional e expansao estruturada sem perder governanca.

### Story 4.1 Store and query modular business memory by domain

*Prerequisite:* Story 3.4

As a sector leader or agent,  
I want to consultar memoria modular por dominio,  
so that decisions and workflows can reuse reliable organizational context.

#### Acceptance Criteria

1. O sistema deve separar memoria ao menos em marca, ofertas/produto, vendas, tecnologia e operacao.
2. Cada item de memoria deve manter origem, data, contexto e relacionamento com processos ou entregas.
3. O sistema deve permitir consulta por dominio, setor, missao ou agente relacionado.
4. O produto deve evitar que workflows dependam de memoria informal fora da estrutura definida.

### Story 4.2 Surface KPI dashboards and recurring executive reports

*Prerequisite:* Story 4.1

As Vitor Perin or chief of staff,  
I want recurring KPI views and executive summaries,  
so that I can monitor business health and make decisions faster.

#### Acceptance Criteria

1. O sistema deve consolidar KPIs operacionais por setor e por tipo de processo.
2. O produto deve permitir gerar uma visao executiva recorrente com principais resultados, bloqueios e riscos.
3. O dashboard deve ligar cada KPI a processos, campanhas, missoes, entregas relevantes e objetos de planejamento no Notion.
4. O sistema deve tornar visivel quando faltarem dados para leitura confiavel.

### Story 4.3 Close the optimization loop with experiments and recommendations

*Prerequisite:* Story 4.2

As a marketing, sales or quality lead,  
I want to transformar analises em experimentos rastreaveis,  
so that performance improvements become part of the operating system.

#### Acceptance Criteria

1. O sistema deve permitir abrir iniciativas de otimizacao a partir de problemas detectados em metricas ou validacoes.
2. Cada iniciativa deve registrar hipotese, responsavel, periodo de teste, criterio de sucesso e resultado.
3. O produto deve ligar experimentos aos fluxos de marketing, vendas ou tecnologia que lhes deram origem.
4. O sistema deve registrar aprendizados e decidir se a mudanca sera adotada, revertida ou iterada.

### Story 4.4 Enable phased expansion for new sectors and squads

*Prerequisite:* Story 4.3

As the platform owner,  
I want to habilitar novos setores e squads de forma incremental,  
so that the company can grow without rework or loss of control.

#### Acceptance Criteria

1. O sistema deve permitir marcar setores e capacidades como MVP, Fase 2 ou Fase 3.
2. A adicao de novos setores nao deve exigir alteracao nos contratos centrais de tarefa, handoff e validacao.
3. O produto deve suportar onboarding estruturado para novos agentes, workflows e memorias de dominio.
4. O sistema deve manter visibilidade executiva consistente mesmo com a expansao do organograma.

## Checklist Results Report

Checklist ainda nao executado nesta versao 0.3. Recomenda-se revisar este PRD refinado e somente depois rodar a checklist formal do PM.

## Next Steps

### UX Expert Prompt

Use `docs/prd.md` para propor superficies de apoio operacional da GMV AI Company focadas em intake de missoes, controle de projetos no Notion, status de agentes, filas de handoff, aprovacoes e leitura executiva. Priorize clareza, premium feel e apoio a uma operacao agent-first no Codex Desktop.

### Architect Prompt

Use `docs/prd.md` para propor a arquitetura inicial do produto como monolito modular agent-first orientado a processos, handoffs e governanca, implementavel em `aiox-core`, com Codex Desktop como superficie principal, Notion como sistema de planejamento e controle, memoria modular e superficies web opcionais de apoio.
