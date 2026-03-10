# GMV AI COMPANY

## Agent Handoff Protocol v1.0

Founder: Isa Novaes\
CEO Artificial: OpenClaw\
Framework alvo: aiox-core (Codex Desktop)

------------------------------------------------------------------------

# 1. Objetivo

Este documento define **como agentes da GMV AI Company se comunicam
entre si**.

Sem um protocolo de handoff estruturado, sistemas multi‑agente tornam‑se
caóticos.

------------------------------------------------------------------------

# 2. Estrutura de Handoff

Todo pedido entre agentes deve seguir este modelo.

{ "task_id": "","origin_agent": "","target_agent": "","task_type":
"","priority": "","context": {}, "input": {}, "expected_output":
"","deadline": "","validation_rules": \[\] }

------------------------------------------------------------------------

# 3. Estrutura de Resposta

Quando a tarefa é concluída:

{ "task_id": "","agent": "","status": "completed", "result": {},
"confidence": "","notes": "","needs_validation": true }

------------------------------------------------------------------------

# 4. Handoff entre setores

## Marketing → Brand

Objetivo: validar consistência de marca

CMO cria conteúdo → Brand Guardian revisa narrativa → retorna aprovação
ou ajustes

------------------------------------------------------------------------

## Marketing → Sales

Objetivo: alinhar campanha com funil

CMO cria campanha → CRO cria sequência de vendas → scripts são
integrados à campanha

------------------------------------------------------------------------

## Sales → Technology

Objetivo: criar infraestrutura

CRO define funil → CTO cria landing page → automação de leads é
implementada

------------------------------------------------------------------------

## Technology → Quality

Objetivo: validar sistema

CTO entrega automação → Quality testa fluxos → aprovação ou correção

------------------------------------------------------------------------

## Quality → CEO

Objetivo: validação final

Quality envia relatório → OpenClaw decide aprovação ou ajustes

------------------------------------------------------------------------

# 5. Escalonamento

Quando um agente não consegue decidir:

Specialist → C-level\
C-level → CEO\
CEO → Founder

------------------------------------------------------------------------

# 6. Boas práticas

Todo handoff deve incluir:

• objetivo claro\
• contexto suficiente\
• resultado esperado\
• critérios de validação

Isso garante interoperabilidade no sistema de agentes.

------------------------------------------------------------------------

# 7. Integração com aiox-core

Cada handoff será implementado como:

-   task message
-   queue event
-   agent trigger

Isso permitirá que o Codex Desktop orquestre os agentes da empresa
artificial.
