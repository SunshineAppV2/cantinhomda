# Plano de Implementação: Sistema de Ranking Categorizado e Híbrido

## 1. Visão Geral
Implementar um sistema de pontuação que permita distinguir entre **mérito individual** e **mérito coletivo**, além de permitir **rankings por categoria** (ex: Melhor em Ordem Unida, Melhor em Classe Bíblica).

## 2. Mudanças no Banco de Dados (Backend)

Precisamos alterar como registramos os pontos. Atualmente, provavelmente registramos apenas quantidade e descrição.

### Nova Estrutura de `PointLog` (Sugestão)
Adicionar campos na tabela de logs de pontos ou criar uma relação:

*   **`type` (Enum)**:
    *   `INDIVIDUAL` (Pontua para o membro e soma para a média da unidade)
    *   `UNIT_ONLY` (Pontua APENAS para a unidade, ex: Ordem Unida, Limpeza)
*   **`category` (Enum ou String)**:
    *   `ATTENDANCE` (Presença/Uniforme)
    *   `BIBLE_CLASS` (Classe Bíblica)
    *   `DRILL` (Ordem Unida)
    *   `CLASSES` (Classes Regulares)
    *   `EVENTS` (Eventos Gerais)
    *   `DISCIPLINE` (Disciplina)

## 3. Funcionalidades no Frontend

### A. Para a Diretoria (Lançamento de Notas de Unidade)
Criar uma nova tela: **"Avaliação de Unidades"**.
*   O diretor seleciona o critério (Ex: "Ordem Unida").
*   O sistema lista as Unidades (não os membros).
*   O diretor lança a nota de 0 a 10 ou pontos fixos para cada unidade.
*   *Lógica*: Esses pontos vão direto para o saldo da Unidade, sem afetar o ranking individual dos membros.

### B. Na Chamada e Requisitos (Membros)
*   Ao lançar um requisito ou atividade, o sistema já deve classificar automaticamente.
    *   Chamada -> Categoria `ATTENDANCE`.
    *   Prova de Classe -> Categoria `CLASSES`.

### C. Dashboard de Ranking (A Grande Mudança)
A página de Ranking (`/ranking`) precisará de abas ou filtros:

1.  **Ranking Geral (Excelência)**: A soma de tudo (já existe).
2.  **Por Categoria (Destaques)**:
    *   Um seletor: "Ver ranking de: [Ordem Unida]" -> Reordena a lista baseada apenas pontos dessa categoria.
3.  **Premiação Anual**:
    *   Uma visualização especial mostrando os líderes acumulados de cada categoria.

## 4. Regras de Negócio (Cálculo)

*   **Pontuação do Membro**: Soma de todos os registros `type: INDIVIDUAL`.
*   **Pontuação da Unidade**:
    *   Soma dos registros `type: UNIT_ONLY` (Ganhos pela equipe).
    *   **MAIS** (+) a média (ou soma) dos pontos `INDIVIDUAL` dos seus membros ativos.

## 5. Sequência de Execução

1.  **Backend**: Atualizar Prisma Schema para suportar Categorias nos pontos.
2.  **Backend**: Criar endpoint para `Ranking por Categoria`.
3.  **Frontend**: Criar tela de "Lançamento de Atividades de Unidade" (Ex: Avaliar Ordem Unida).
4.  **Frontend**: Atualizar a tela de Rankings para ter o filtro de categorias.

---

## 6. Exemplo Prático para o Cliente

**Cenário: Domingo de Manhã**
1.  **8:00 (Pessoal)**: Conselheiro marca uniforme. (Joaozinho ganha 10 pts em `Uniforme`).
2.  **9:00 (Coletivo)**: Diretor avalia o "Cantinho da Unidade". A Unidade Águias estava bagunçada, a Unidade Falcão estava limpa.
    *   Diretor lança 50 pontos para Falcão na categoria `Limpeza/Disciplina`.
    *   Joaozinho (da Águias) não perde pontos no ranking pessoal dele, mas a Unidade dele fica para trás no Ranking de Unidades.
3.  **Resultado**: No fim do ano, Joaozinho pode ser o "Desbravador do Ano" (Individual), mas a Unidade Falcão ganha a "Unidade do Ano" pelo trabalho em equipe.
