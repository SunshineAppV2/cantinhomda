# 🏗️ Arquitetura Moderna - Ranking DBV

## 📋 Visão Geral da Migração

**Antes:** Firebase Hosting (Frontend + Auth)  
**Agora:** Vercel (Frontend) + Render (Backend) + Firebase (Auth)

---

## 🔐 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITETURA ATUAL                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   VERCEL     │         │   FIREBASE   │         │    RENDER    │
│  (Frontend)  │────────▶│    (Auth)    │◀────────│  (Backend)   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                         │
      │  Chaves Públicas        │  Token JWT              │  Service Account
      │  (Client SDK)           │  (ID Token)             │  (Chave Privada)
      │                         │                         │
      ▼                         ▼                         ▼
  Login do                 Gera Token              Valida Token
  Usuário                  Assinado                e Libera Dados
```

---

## 🔑 Distribuição de Chaves

### 1️⃣ **VERCEL (Frontend)** - Chaves Públicas ✅

**Localização:** `rankingdbv-web/.env` ou Variáveis de Ambiente do Vercel

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=cantinhodbv-dfdab.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cantinhodbv-dfdab
VITE_FIREBASE_STORAGE_BUCKET=cantinhodbv-dfdab.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Responsabilidade:**
- ✅ Inicializar Firebase Client SDK
- ✅ Fazer login do usuário (email/senha, Google, etc.)
- ✅ Obter ID Token do usuário autenticado
- ✅ Enviar token nas requisições para o backend

**Arquivo:** `rankingdbv-web/src/lib/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

---

### 2️⃣ **FIREBASE** - Autenticação Centralizada 🔐

**Console:** https://console.firebase.google.com/project/cantinhodbv-dfdab

**Responsabilidade:**
- ✅ Gerenciar usuários (cadastro, login, senha)
- ✅ Gerar tokens JWT assinados
- ✅ Prover métodos de autenticação (Email, Google, etc.)

**Fluxo:**
1. Usuário faz login no Vercel
2. Firebase Auth valida credenciais
3. Firebase retorna **ID Token** (JWT)
4. Frontend envia token para backend

---

### 3️⃣ **RENDER (Backend)** - Service Account (Chave Privada) 🔒

**Localização:** Variáveis de Ambiente do Render

```env
FIREBASE_PROJECT_ID=cantinhodbv-dfdab
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cantinhodbv-dfdab.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...XXXX\n-----END PRIVATE KEY-----\n"
```

**Responsabilidade:**
- ✅ Validar tokens JWT enviados pelo frontend
- ✅ Verificar se o token é válido e não expirou
- ✅ Extrair informações do usuário (UID, email)
- ✅ Liberar acesso aos dados protegidos

**Arquivo:** `rankingdbv-backend/src/firebase-admin.ts`

```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin initialized successfully.');
    }
}

export const firebaseAdmin = admin;
```

---

### 4️⃣ **GITHUB** - Código Fonte (SEM CHAVES) 📦

**Repositório:** https://github.com/SunshineAppV2/RankingDbv

**Responsabilidade:**
- ✅ Armazenar código-fonte
- ❌ **NÃO** contém chaves privadas
- ❌ **NÃO** contém arquivos `.env`

**Arquivos Ignorados (.gitignore):**
```
.env
.env.local
.env.production
serviceAccountKey.json
```

---

## 🚀 Fluxo Completo de Autenticação

### Passo 1: Login no Frontend (Vercel)

```typescript
// No componente de login
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './lib/firebase';

const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Obter ID Token
    const idToken = await user.getIdToken();
    
    // Armazenar token (opcional)
    localStorage.setItem('authToken', idToken);
    
    return idToken;
};
```

### Passo 2: Enviar Token para Backend

```typescript
// Fazer requisição autenticada
const fetchUserData = async () => {
    const token = await auth.currentUser?.getIdToken();
    
    const response = await fetch('https://rankingdbv-backend.onrender.com/api/users/me', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    return response.json();
};
```

### Passo 3: Validar Token no Backend (Render)

```typescript
// Guard de autenticação
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { firebaseAdmin } from '../firebase-admin';

@Injectable()
export class AuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            throw new UnauthorizedException('Token não fornecido');
        }
        
        try {
            // Validar token com Firebase Admin
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
            request.user = decodedToken; // { uid, email, ... }
            return true;
        } catch (error) {
            throw new UnauthorizedException('Token inválido');
        }
    }
}
```

---

## 📊 Dados de Acesso Existentes

### Usuários já Cadastrados no Firebase Auth

Você mencionou que **já tem dados de acesso disponibilizados para clientes no hosting**.

✅ **Boa notícia:** Esses usuários continuam funcionando!

**Por quê?**
- Os usuários estão no **Firebase Authentication**
- O Firebase Auth é independente do hosting
- Mudando de Firebase Hosting para Vercel, os usuários permanecem intactos

**O que você precisa fazer:**
1. ✅ Configurar as mesmas chaves públicas no Vercel
2. ✅ Garantir que o frontend no Vercel usa o mesmo `firebase.ts`
3. ✅ Testar login com usuários existentes

---

## 🔧 Configuração no Vercel

### Opção 1: Arquivo `.env` (Desenvolvimento Local)

Criar `rankingdbv-web/.env`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=cantinhodbv-dfdab.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cantinhodbv-dfdab
VITE_FIREBASE_STORAGE_BUCKET=cantinhodbv-dfdab.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Opção 2: Variáveis de Ambiente no Vercel (Produção)

1. Acessar: https://vercel.com/seu-projeto/settings/environment-variables
2. Adicionar cada variável:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. Fazer redeploy do projeto

---

## 🔧 Configuração no Render

### Variáveis de Ambiente (Backend)

1. Acessar: https://dashboard.render.com/web/seu-servico
2. Ir em **Environment**
3. Adicionar:

```
FIREBASE_PROJECT_ID=cantinhodbv-dfdab
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cantinhodbv-dfdab.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
```

**⚠️ IMPORTANTE:** A chave privada deve ter `\n` literais (não quebras de linha reais)

---

## 📝 Checklist de Migração

### ✅ Vercel (Frontend)
- [ ] Criar projeto no Vercel
- [ ] Conectar ao repositório GitHub
- [ ] Configurar build: `cd rankingdbv-web && npm install && npm run build`
- [ ] Configurar output: `rankingdbv-web/dist`
- [ ] Adicionar variáveis de ambiente (chaves públicas Firebase)
- [ ] Fazer deploy
- [ ] Testar login com usuário existente

### ✅ Render (Backend)
- [ ] Verificar se está rodando (imagem mostra "Available")
- [ ] Confirmar variáveis de ambiente (Service Account)
- [ ] Testar endpoint de validação de token
- [ ] Verificar logs de autenticação

### ✅ Firebase
- [ ] Confirmar projeto: `cantinhodbv-dfdab`
- [ ] Verificar usuários existentes em Authentication
- [ ] Adicionar domínio do Vercel em "Authorized domains"
- [ ] Testar login do console

### ✅ GitHub
- [ ] Confirmar que `.env` está no `.gitignore`
- [ ] Verificar que não há chaves commitadas
- [ ] Atualizar README com nova arquitetura

---

## 🧪 Como Testar

### 1. Testar Login no Vercel

```bash
# Abrir console do navegador no site Vercel
# Fazer login
# Executar:
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log(token);
```

### 2. Testar Validação no Render

```bash
curl -X GET https://rankingdbv-backend.onrender.com/api/users/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

**Resposta esperada:**
```json
{
  "uid": "abc123",
  "email": "usuario@example.com",
  "name": "Nome do Usuário"
}
```

---

## 🆘 Troubleshooting

### Problema: "Token inválido" no backend

**Causa:** Chave privada incorreta ou mal formatada

**Solução:**
1. Baixar nova Service Account Key do Firebase Console
2. Copiar conteúdo do arquivo JSON
3. Extrair `private_key` e adicionar no Render
4. Garantir que `\n` está escapado corretamente

### Problema: "CORS error" ao fazer login

**Causa:** Domínio do Vercel não autorizado no Firebase

**Solução:**
1. Firebase Console → Authentication → Settings
2. Adicionar domínio do Vercel em "Authorized domains"
3. Exemplo: `seu-app.vercel.app`

### Problema: Usuários não conseguem logar

**Causa:** Configuração incorreta do Firebase no frontend

**Solução:**
1. Verificar `rankingdbv-web/src/lib/firebase.ts`
2. Confirmar que `import.meta.env.VITE_*` está correto
3. Verificar variáveis de ambiente no Vercel
4. Fazer rebuild do projeto

---

## 📚 Referências

- **Firebase Console:** https://console.firebase.google.com/project/cantinhodbv-dfdab
- **GitHub Repo:** https://github.com/SunshineAppV2/RankingDbv
- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **Render Docs:** https://render.com/docs/environment-variables
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

## 🎯 Próximos Passos

1. **Obter chaves públicas do Firebase:**
   - Firebase Console → Project Settings → General
   - Copiar configuração do SDK

2. **Configurar Vercel:**
   - Adicionar variáveis de ambiente
   - Fazer deploy

3. **Testar com usuário existente:**
   - Fazer login
   - Verificar se token é gerado
   - Confirmar que backend valida

4. **Migrar domínio (se necessário):**
   - Atualizar DNS para apontar para Vercel
   - Adicionar domínio customizado no Vercel

---

**Status Atual (baseado na imagem):**
- ✅ `cantinhodbv` (PostgreSQL) - Available (8 dias)
- ❌ `rankingdbv-backend` (Docker) - Failed deploy (1h)

**Ação Necessária:** Verificar logs do `rankingdbv-backend` no Render para corrigir o deploy.
