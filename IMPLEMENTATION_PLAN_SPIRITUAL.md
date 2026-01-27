# Plano de Implementação: Módulo Espiritual (Ano Bíblico & Classe)

Este módulo visa gamificar e incentivar o desenvolvimento espiritual dos desbravadores através do acompanhamento de leitura e quizzes interativos.

## 1. Estrutura de Dados (Backend)

### Novas Entidades (Prisma Schema)

*   **`BibleReadingPlan`**: Define o plano (ex: "Ano Bíblico Juvenil 2026").
*   **`BibleBook` / `BibleChapter`**: Estrutura da bíblia (pode ser hardcoded no front ou json para não pesar o banco).
*   **`UserBibleProgress`**:
    *   `userId`: Link para o desbravador.
    *   `chapter`: Identificador do capítulo lido (ex: "GEN-01").
    *   `readAt`: Data da leitura.
*   **`BibleQuiz`**:
    *   Perguntas atreladas a livros ou capítulos específicos.
*   **`UserQuizAttempt`**:
    *   Histórico de tentativas e acertos.

### Integração com Pontuação
*   Adicionar novos tipos de pontuação: `TYPE_BIBLE_READING` e `TYPE_BIBLE_QUIZ`.

## 2. Funcionalidades (Frontend)

### A. Dashboard do Desbravador
*   **Card "Minha Jornada"**: Gráfico de rosca mostrando % da Bíblia (ou do plano anual) lida.
*   **Meta do Dia**: Sugestão de leitura de hoje (baseada na data).
*   **Botão "Li Hoje!"**: Check-in rápido de leitura.

### B. Área de Leitura e Quiz
*   Lista de Livros/Capítulos.
*   Ao marcar um capítulo como lido -> Animação de confete + Ganho imediato de pontos no Ranking.
*   Se houver quiz disponível para o livro/setor, botão "Responder Desafio".
    *   Acertou? Pontos extras.

### C. Área do Conselheiro/Capelão
*   Relatório de "Quem não está lendo" (para aconselhamento).
*   Ranking específico "Top Leitores".

## 3. Fluxo de Gamificação

1.  Desbravador entra no app.
2.  Marca leitura de Gênesis 1 a 3.
3.  Sistema valida e lança 15 pontos (5 por cap).
4.  Sistema libera "Medalha Leitor de Gênesis" se completar o livro.
