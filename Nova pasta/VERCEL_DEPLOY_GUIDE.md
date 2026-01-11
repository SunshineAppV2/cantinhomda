# 🚀 Guia Rápido: Deploy no Vercel

## ✅ Pré-requisitos

Você já tem:
- ✅ Usuários cadastrados no Firebase Auth
- ✅ Backend rodando no Render (com Service Account)
- ✅ Código no GitHub: https://github.com/SunshineAppV2/RankingDbv

---

## 📋 Passo 1: Obter Chaves Públicas do Firebase

1. Acesse: https://console.firebase.google.com/project/cantinhodbv-dfdab/settings/general

2. Role até **"Seus aplicativos"** → **"SDK setup and configuration"**

3. Copie a configuração (será algo assim):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "cantinhodbv-dfdab.firebaseapp.com",
  projectId: "cantinhodbv-dfdab",
  storageBucket: "cantinhodbv-dfdab.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};
```

---

## 📋 Passo 2: Criar Projeto no Vercel

### 2.1. Importar Repositório

1. Acesse: https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione: `SunshineAppV2/RankingDbv`
4. Clique em **"Import"**

### 2.2. Configurar Build

Na tela de configuração:

**Root Directory:**
- Clique em **"Edit"**
- Selecione: `rankingdbv-web`

**Framework Preset:**
- Deve detectar automaticamente: **Vite**

**Build Command:**
```bash
npm install && npm run build
```

**Output Directory:**
```
dist
```

### 2.3. Adicionar Variáveis de Ambiente

Clique em **"Environment Variables"** e adicione:

| Nome | Valor |
|------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` (copiar do Firebase) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `cantinhodbv-dfdab.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `cantinhodbv-dfdab` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `cantinhodbv-dfdab.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123456789:web:abc123` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` (opcional) |

**⚠️ IMPORTANTE:** Use os valores EXATOS do Firebase Console!

### 2.4. Deploy

Clique em **"Deploy"** e aguarde (2-3 minutos).

---

## 📋 Passo 3: Autorizar Domínio no Firebase

1. Acesse: https://console.firebase.google.com/project/cantinhodbv-dfdab/authentication/settings

2. Role até **"Authorized domains"**

3. Clique em **"Add domain"**

4. Adicione o domínio do Vercel:
   - Exemplo: `seu-app.vercel.app`
   - Ou domínio customizado se tiver

5. Clique em **"Add"**

---

## 📋 Passo 4: Testar Login

1. Acesse a URL do Vercel (ex: `https://seu-app.vercel.app`)

2. Tente fazer login com um usuário existente

3. Abra o Console do Navegador (F12) e execute:

```javascript
// Verificar se Firebase foi inicializado
console.log(firebase.auth().currentUser);

// Obter token
firebase.auth().currentUser.getIdToken().then(token => {
    console.log('Token:', token);
});
```

4. Se aparecer o token, está funcionando! ✅

---

## 📋 Passo 5: Configurar Backend URL (Opcional)

Se o frontend precisa se comunicar com o backend no Render:

1. No Vercel, vá em **Settings** → **Environment Variables**

2. Adicione:

| Nome | Valor |
|------|-------|
| `VITE_API_URL` | `https://rankingdbv-backend.onrender.com` |

3. Faça **Redeploy** do projeto

4. No código, use:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const fetchData = async () => {
    const token = await auth.currentUser?.getIdToken();
    
    const response = await fetch(`${API_URL}/api/users/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    return response.json();
};
```

---

## 🔧 Troubleshooting

### ❌ Erro: "Firebase: Error (auth/invalid-api-key)"

**Causa:** Chave API incorreta ou não configurada

**Solução:**
1. Verificar se `VITE_FIREBASE_API_KEY` está correta
2. Copiar novamente do Firebase Console
3. Fazer redeploy no Vercel

---

### ❌ Erro: "Firebase: Error (auth/unauthorized-domain)"

**Causa:** Domínio do Vercel não autorizado

**Solução:**
1. Firebase Console → Authentication → Settings
2. Adicionar domínio do Vercel em "Authorized domains"
3. Aguardar 1-2 minutos para propagar

---

### ❌ Erro: "Cannot read property 'getIdToken' of null"

**Causa:** Usuário não está logado

**Solução:**
1. Verificar se login foi bem-sucedido
2. Adicionar verificação:

```typescript
const user = auth.currentUser;
if (!user) {
    console.error('Usuário não está logado');
    return;
}

const token = await user.getIdToken();
```

---

### ❌ Build falha no Vercel

**Causa:** Dependências faltando ou erro de TypeScript

**Solução:**
1. Verificar logs do build no Vercel
2. Testar build localmente:

```bash
cd rankingdbv-web
npm install
npm run build
```

3. Corrigir erros e fazer commit
4. Vercel fará redeploy automaticamente

---

## 📊 Verificar Status

### Vercel (Frontend)
- Dashboard: https://vercel.com/dashboard
- Logs: Clicar no projeto → Deployments → Ver logs

### Render (Backend)
- Dashboard: https://dashboard.render.com
- Status: Verificar se está "Available" (verde)
- Logs: Clicar no serviço → Logs

### Firebase (Auth)
- Console: https://console.firebase.google.com/project/cantinhodbv-dfdab/authentication/users
- Verificar se usuários estão listados

---

## ✅ Checklist Final

- [ ] Projeto criado no Vercel
- [ ] Root directory configurado: `rankingdbv-web`
- [ ] Variáveis de ambiente adicionadas (7 variáveis `VITE_FIREBASE_*`)
- [ ] Deploy bem-sucedido (status verde)
- [ ] Domínio adicionado no Firebase Auth
- [ ] Login testado com usuário existente
- [ ] Token JWT gerado corretamente
- [ ] Backend no Render está "Available"
- [ ] Comunicação frontend ↔ backend funcionando

---

## 🎯 Próximos Passos

1. **Domínio Customizado (Opcional):**
   - Vercel → Settings → Domains
   - Adicionar domínio (ex: `app.cantinhodbv.com.br`)
   - Atualizar DNS conforme instruções
   - Adicionar domínio no Firebase Auth

2. **Monitoramento:**
   - Configurar alertas no Vercel
   - Monitorar logs do Render
   - Verificar uso do Firebase

3. **Performance:**
   - Ativar Vercel Analytics
   - Configurar cache de assets
   - Otimizar bundle size

---

## 📞 Suporte

**Documentação:**
- Vercel: https://vercel.com/docs
- Firebase: https://firebase.google.com/docs
- Render: https://render.com/docs

**Repositório:**
- GitHub: https://github.com/SunshineAppV2/RankingDbv

---

**Última atualização:** 2026-01-05
