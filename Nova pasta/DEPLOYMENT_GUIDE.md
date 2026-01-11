# 🚀 Guia de Migração e Deploy: Vercel + Firebase + GitHub

Este guia descreve como colocar o sistema **Ranking DBV** em produção utilizando a infraestrutura da **Vercel** (Frontend e Backend Serverless) e **Firebase** (Notificações, Storage e Auth).

---

## 🏗️ 1. Nova Arquitetura

*   **Hospedagem (Front & Back):** [Vercel](https://vercel.com). O projeto foi configurado como um Monorepo.
    *   Frontend acessível em `https://seu-projeto.vercel.app`
    *   Backend acessível em `https://seu-projeto.vercel.app/api` (Sem problemas de CORS!)
*   **Banco de Dados (PostgreSQL):** [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech) ou [Supabase](https://supabase.com). **Serverless**.
*   **Tempo Real & Arquivos:** [Firebase](https://firebase.google.com).
    *   Notificações: Firestore (Substituindo Socket.IO).
    *   Uploads: Firebase Storage (Substituindo pasta local).

---

## 🛠️ 2. Passo a Passo para Configuração na Vercel

Para garantir estabilidade e evitar conflitos de build, faremos o deploy de **Dois Projetos** separados na Vercel, ambos conectados ao mesmo repositório do GitHub.

### 2.1. Deploy do Backend (API)

1.  No Dashboard da Vercel, clique em **Add New > Project**.
2.  Importe o repositório `cantinhodbv` (ou o nome que você usou).
3.  **Configuração do Root Directory:**
    *   Clique em "Edit" ao lado de **Root Directory**.
    *   Selecione a pasta `rankingdbv-backend`.
4.  **Framework Preset:** A Vercel deve detectar "Other" ou "NestJS". Se não, escolha "Other".
5.  **Variáveis de Ambiente (Environment Variables):**
    Cole as seguintes variáveis (Settings > Environment Variables):
    *   `DATABASE_URL`: (Sua string de conexão do Postgres na Nuvem)
    *   `JWT_SECRET`: (Gere uma senha forte)
    *   `FIREBASE_PROJECT_ID`: (ID do projeto Firebase)
    *   `FIREBASE_CLIENT_EMAIL`: (Email da conta de serviço)
    *   `FIREBASE_PRIVATE_KEY`: (Chave privada da conta de serviço - copie todo o conteúdo do `-----BEGIN...` até `...END KEY-----`)
6.  Clique em **Deploy**.
7.  **Anote a URL do Backend:** (ex: `https://rankingdbv-backend.vercel.app`). Você precisará dela no próximo passo.

### 2.2. Deploy do Frontend (Web)

1.  Volte a Dashboard e clique em **Add New > Project** novamente.
2.  Importe o **mesmo repositório** (`cantinhodbv`).
3.  **Configuração do Root Directory:**
    *   Clique em "Edit" ao lado de **Root Directory**.
    *   Selecione a pasta `rankingdbv-web`.
4.  **Framework Preset:** Deve detectar **Vite**.
5.  **Variáveis de Ambiente:**
    *   Todas as `VITE_FIREBASE_...` (API Key, Project ID, etc).
    *   `VITE_API_URL`: **Cole a URL do Backend** que você gerou no passo anterior (ex: `https://rankingdbv-backend.vercel.app`).
    *   *Nota*: Não coloque `/api` no final se o seu código já adiciona, mas verifique. O padrão do axios no código é basear na URL.
6.  Clique em **Deploy**.

---

### Passo 3: Finalização

1.  Acesse o link do Frontend gerado (ex: `https://rankingdbv-web.vercel.app`).
2.  Teste o Login.
3.  Teste as Notificações (use o sininho).

---

---

## 🔄 3. O que mudou no Código?

1.  **Backend**:
    *   **Socket.IO Removido**: Vercel Functions não suportam conexões persistentes.
    *   **Notificações**: Agora gravam direto no Firestore.
    *   **Static Assets**: O serviço de arquivos locais foi removido. Uploads devem ir para o Firebase Storage (precisa ser implementado no `uploads.service.ts` se ainda não estiver - *Pendente de Verificação*).
2.  **Frontend**:
    *   **Socket Client Removido**: O "Sininho" agora escuta o Firestore diretamente.
    *   **API URL**: Agora usa `/api` relativo.

---

## ✅ Checklist de Verificação

1.  [ ] Deploy na Vercel ficou verde (Success)?
2.  [ ] Login funciona? (Testa conexão com Banco + Auth).
3.  [ ] Notificações aparecem? (Testa integração Firestore).
