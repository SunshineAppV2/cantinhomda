# Plano de Implementação: Gestão de Patrimônio (Almoxarifado)

Este módulo visa controlar os bens do clube, evitar perdas e responsabilizar as unidades pelo uso dos materiais.

## 1. Estrutura de Dados (Backend)

### Novas Entidades (Prisma Schema)
*   **`InventoryItem`**:
    *   `name`: Nome (Ex: Barraca Iglu 4 Pessoas).
    *   `sku`: Código de patrimônio (Ex: CBV-001).
    *   `category`: (Barraca, Cozinha, Ferramenta, Bandeira).
    *   `condition`: (Novo, Bom, Regular, Danificado).
    *   `status`: (DISPONIVEL, EMPRESTADO, MANUTENCAO).
    *   `photoUrl`: Foto do bem.
*   **`InventoryLoan` (Empréstimo)**:
    *   `itemId`: Item retirado.
    *   `targetUnitId` ou `targetUserId`: Quem retirou (Unidade ou Pessoa).
    *   `loanDate`: Data retirada.
    *   `expectedReturnDate`: Data prevista devolução.
    *   `returnDate`: Data real da devolução.
    *   `returnCondition`: Estado na devolução.
    *   `penaltyPoints`: Pontos retirados (multa) se houve dano.

## 2. Funcionalidades (Frontend)

### A. Catálogo (Almoxarife)
*   Galeria de fotos com todos os itens do clube.
*   Filtros: "Disponíveis", "Emprestados".
*   Cadastro rápido de novos itens com upload de foto pelo celular.

### B. Fluxo de Retirada (Check-out)
*   Almoxarife seleciona o item no sistema.
*   Seleciona a Unidade responsável (Ex: Unidade Águias).
*   Sistema registra: "Item X está com Unidade Águias".

### C. Fluxo de Devolução (Check-in)
*   Almoxarife recebe o item.
*   Avalia estado:
    *   **Inteiro**: Baixa normal.
    *   **Sujo/Danificado**:
        *   Sistema abre modal "Aplicar Penalidade".
        *   Opção: Lançar multa em Pontos no Ranking da Unidade (Ex: -50 pts por devolver barraca suja).
        *   Opção: Registrar valor financeiro a ressarcir.

## 3. Benefícios
*   Fim das "barracas misturadas".
*   Forte apelo disciplinar: A unidade cuida melhor sabendo que vale ponto no ranking.
