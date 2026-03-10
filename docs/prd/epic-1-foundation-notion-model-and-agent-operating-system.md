# Epic 1 Foundation, Notion Model and Agent Operating System

Objetivo expandido: Criar a espinha dorsal do produto e entregar um primeiro incremento deployavel que permita receber missoes dos fundadores, transformar essas missoes em trabalho orquestrado pelo OpenClaw, refletir isso no Notion e acompanhar o estado basico da empresa artificial. Ao final deste epic, a GMV ja deve possuir um "canary" funcional do seu sistema operacional agent-first, mesmo com workflows ainda simplificados.

## Story 1.1 Bootstrap the project and publish the agent operating shell

As Vitor Perin or a founder,  
I want a deployable agent operating shell,  
so that the project has a real operational entry point from the first increment.

### Acceptance Criteria

1. A base da aplicacao deve subir localmente e identificar claramente o produto como sistema operacional da GMV AI Company.
2. O primeiro incremento deve permitir ao menos registrar uma missao inicial, exibir o status do ambiente e indicar quando nao houver missoes ativas.
3. O incremento deve incluir pipeline minima de execucao local e convencoes basicas do projeto para permitir continuidade do desenvolvimento.
4. O operating shell deve ser compativel com o uso conjunto de artefatos do AIOX/Codex no mesmo repositorio.

## Story 1.2 Register the organizational model and sector structure

*Prerequisite:* Story 1.1

As a founder or technical lead,  
I want to cadastrar a estrutura da empresa e seus agentes-chave,  
so that every mission and handoff can reference valid sectors and roles.

### Acceptance Criteria

1. O sistema deve permitir registrar Isa Novaes e Vitor Perin como fundadores, o OpenClaw como CEO artificial, e os demais C-levels, specialists e workers com nome, papel, setor e fase de habilitacao.
2. O sistema deve refletir no minimo os setores MVP definidos neste PRD: Marketing, Sales e Technology, com Brand e Quality como camadas de apoio e validacao.
3. O sistema deve diferenciar agentes executivos, specialists e workers deterministicos.
4. A estrutura cadastrada deve poder ser consultada em visao organizacional e reutilizada por missoes e handoffs.

## Story 1.3 Create the mission-to-Notion project model

*Prerequisite:* Story 1.2

As a CEO artificial,  
I want to criar projetos no Notion a partir das missoes recebidas,  
so that strategy can become executable work with clear ownership.

### Acceptance Criteria

1. O sistema deve permitir ao OpenClaw criar no Notion um projeto a partir de cada missao com objetivo, contexto, prioridade, status, responsavel e metricas de sucesso.
2. O modelo do Notion deve suportar decomposicao em epics, stories e tasks relacionadas ao projeto de origem.
3. Cada projeto e seus itens descendentes devem ser classificados como Strategic, Operational, Optimization ou Governance quando aplicavel.
4. O sistema deve impedir a persistencia de projetos e tasks no Notion sem os campos obrigatorios definidos no PRD.

## Story 1.4 Enable C-level planning flow inside Notion

*Prerequisite:* Story 1.3

As a C-level owner,  
I want to refinar projetos do Notion em epics, stories e tasks,  
so that squads receive work that is already structured for execution.

### Acceptance Criteria

1. Cada C-level deve conseguir assumir ownership de projetos criados pelo OpenClaw dentro do Notion.
2. O refinamento deve permitir quebrar o projeto em epics, stories e tasks com owner, setor, prioridade e dependencias.
3. O fluxo deve tornar visivel quando um projeto ainda nao esta pronto para execucao pelos squads.
4. O sistema deve registrar o status de planejamento e readiness de cada conjunto de trabalho.

## Story 1.5 Visualize executive status across missions and sectors

*Prerequisite:* Story 1.4

As Vitor Perin or OpenClaw,  
I want a consolidated operational view,  
so that I can understand the current status of missions and sectors without depender de acompanhamento manual disperso.

### Acceptance Criteria

1. O sistema deve expor status por setor, projetos ativos no Notion, pendencias de aprovacao e principais gargalos em artefatos ou superficies de apoio.
2. A visao operacional deve permitir navegar da visao geral para o detalhe de uma missao e seu projeto correspondente no Notion.
3. O sistema deve destacar itens bloqueados, atrasados ou aguardando validacao.
4. O acompanhamento operacional deve funcionar com dados iniciais gerados no proprio ambiente de desenvolvimento e refletidos no Notion.
