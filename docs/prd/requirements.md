# Requirements

## Functional

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

## Non Functional

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
