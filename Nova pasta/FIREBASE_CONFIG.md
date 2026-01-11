# 🔑 Configuração do Firebase - Chaves Públicas

## ✅ Chaves Obtidas em: 2026-01-05

### Configuração Completa

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM",
  authDomain: "cantinhodbv-dfdab.firebaseapp.com",
  projectId: "cantinhodbv-dfdab",
  storageBucket: "cantinhodbv-dfdab.firebasestorage.app",
  messagingSenderId: "402854694692",
  appId: "1:402854694692:web:38dc7415eb2f3fdbffadb1",
  measurementId: "G-2D3NW9W4QP"
};
```

---

## 📋 Variáveis de Ambiente para Vercel

### Copie e cole estas variáveis no Vercel:

| Nome da Variável | Valor |
|------------------|-------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `cantinhodbv-dfdab.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `cantinhodbv-dfdab` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `cantinhodbv-dfdab.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `402854694692` |
| `VITE_FIREBASE_APP_ID` | `1:402854694692:web:38dc7415eb2f3fdbffadb1` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-2D3NW9W4QP` |

---

## 🚀 Como Usar no Vercel

### Passo 1: Acessar Configurações do Projeto

1. Ir para: https://vercel.com/new
2. Importar repositório: `SunshineAppV2/RankingDbv`
3. Configurar Root Directory: `rankingdbv-web`

### Passo 2: Adicionar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicionar **UMA POR UMA**:

```
Nome: VITE_FIREBASE_API_KEY
Valor: AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM
```

```
Nome: VITE_FIREBASE_AUTH_DOMAIN
Valor: cantinhodbv-dfdab.firebaseapp.com
```

```
Nome: VITE_FIREBASE_PROJECT_ID
Valor: cantinhodbv-dfdab
```

```
Nome: VITE_FIREBASE_STORAGE_BUCKET
Valor: cantinhodbv-dfdab.firebasestorage.app
```

```
Nome: VITE_FIREBASE_MESSAGING_SENDER_ID
Valor: 402854694692
```

```
Nome: VITE_FIREBASE_APP_ID
Valor: 1:402854694692:web:38dc7415eb2f3fdbffadb1
```

```
Nome: VITE_FIREBASE_MEASUREMENT_ID
Valor: G-2D3NW9W4QP
```

### Passo 3: Deploy

Clicar em **"Deploy"** e aguardar 2-3 minutos.

---

## ✅ Verificação Local (Opcional)

Se quiser testar localmente antes do deploy:

### Criar arquivo `.env` local

```bash
cd rankingdbv-web
```

Criar arquivo `.env` com o conteúdo:

```env
VITE_FIREBASE_API_KEY=AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM
VITE_FIREBASE_AUTH_DOMAIN=cantinhodbv-dfdab.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cantinhodbv-dfdab
VITE_FIREBASE_STORAGE_BUCKET=cantinhodbv-dfdab.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=402854694692
VITE_FIREBASE_APP_ID=1:402854694692:web:38dc7415eb2f3fdbffadb1
VITE_FIREBASE_MEASUREMENT_ID=G-2D3NW9W4QP
```

### Testar localmente

```bash
npm install
npm run dev
```

Acessar: http://localhost:5173

---

## 🔐 Segurança

### ✅ Estas chaves são PÚBLICAS

- **Podem** ser expostas no código do frontend
- **Podem** estar em repositórios públicos
- **Não** são sensíveis (são chaves do Client SDK)

### ❌ NÃO confundir com chaves PRIVADAS

As chaves **privadas** (Service Account) estão no Render e **NUNCA** devem ser expostas:
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

---

## 📊 Comparação com Código Atual

### Arquivo atual: `rankingdbv-web/src/lib/firebase.ts`

Verificar se está usando `import.meta.env.VITE_*`:

```typescript
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
```

✅ **Está correto!** Não precisa alterar o código.

---

## 🎯 Próximos Passos

1. ✅ **Chaves obtidas** - CONCLUÍDO
2. 🚀 **Deploy no Vercel** - PRÓXIMO PASSO
3. ⏳ Autorizar domínio no Firebase
4. ⏳ Testar login

**Consulte:** `PROXIMOS_PASSOS.md` → Passo 3

---

**Última atualização:** 2026-01-05  
**Status:** ✅ Chaves públicas obtidas e documentadas
