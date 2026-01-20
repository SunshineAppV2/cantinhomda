# Planejamento: Habilitação de Input de Pontuação (Chamada)

## Objetivo
Permitir que usuários com os cargos de **Conselheiro**, **Instrutor** e **Diretor** realizem o input de pontuação (chamada) no sistema.
Garantir que a concessão dessa permissão **não isente** tais usuários da cobrança mensal do clube (todos os usuários cadastrados devem ser cobrados).

## Análise Atual

### 1. Permissões de Acesso (Frontend - Sidebar.tsx)
- **DIRECTOR (`Diretor`)**: Possui acesso total "Administrativo" no Frontend, incluindo o módulo de Chamada (`meetings`).
- **COUNSELOR (`Conselheiro`)**: Já possui permissão explícita para o módulo `ATTENDANCE` (Chamada) na configuração padrão da Sidebar.
- **INSTRUCTOR (`Instrutor`)**: Atualmente possui acesso apenas a `CLASSES`, `MEMBERS` e `EVENTS`. **Não** possui acesso ao módulo `ATTENDANCE`.

### 2. Restrições de Backend (API)
- O `MeetingsController` e `MeetingsService` não impõem restrições de cargo específicas além da autenticação (`JwtAuthGuard`) e verificação de pertencimento ao clube (`clubId`).
- Portanto, habilitar o acesso no menu (Frontend) é suficiente para permitir a operação.

### 3. Regra de Cobrança (Faturamento)
- O cálculo de faturamento (verificado em `club-payment.service.ts` e `PaymentManagement.tsx`) utiliza `_count: { users: true }`.
- Isso significa que o sistema conta **todos** os usuários vinculados ao clube na tabela `User`, independente do cargo (`role`).
- **Conclusão**: Adicionar ou manter usuários com cargos de Conselheiro, Instrutor ou Diretor **já os inclui** na fatura mensal automaticamente. Nenhuma alteração é necessária no motor de cobrança.

## Ações de Implementação

1.  **Atualizar `Sidebar.tsx`**:
    *   Adicionar a permissão `ATTENDANCE` ao array de permissões padrão do cargo `INSTRUCTOR`.
    *   Isso habilitará o menu "Chamada" para instrutores.

2.  **Validação**:
    *   Verificar se Conselheiros e Diretores continuam com acesso.
    *   Confirmar que a rota `/dashboard/meetings` carrega corretamente para Instrutores.

## Resumo
Apenas o cargo de **Instrutor** necessita de ajuste de permissão no Frontend. Os demais já possuem acesso. A cobrança já abrange todos os cargos conform solicitado.
