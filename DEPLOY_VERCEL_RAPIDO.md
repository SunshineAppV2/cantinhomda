# 🚀 GUIA RÁPIDO - Deploy no Vercel (PRONTO PARA USAR)

## ✅ Pré-requisitos Concluídos

- ✅ Backend no Render corrigido
- ✅ Chaves públicas do Firebase obtidas
- ✅ Código no GitHub atualizado

---

## 🎯 Passo a Passo (15 minutos)

### 1️⃣ Criar Conta no Vercel

1. Acessar: https://vercel.com/signup
2. Clicar em **"Continue with GitHub"**
3. Autorizar Vercel a acessar seus repositórios
4. Aguardar redirecionamento para dashboard

---

### 2️⃣ Importar Projeto

1. No dashboard, clicar em **"Add New..."** → **"Project"**
2. Procurar por: `RankingDbv`
3. Clicar em **"Import"** ao lado de `SunshineAppV2/RankingDbv`

---

### 3️⃣ Configurar Projeto

#### Root Directory
- Clicar em **"Edit"** ao lado de "Root Directory"
- Selecionar: **`rankingdbv-web`**
- Clicar em **"Continue"**

#### Framework Preset
- Deve detectar automaticamente: **Vite**
- Se não detectar, selecionar manualmente

#### Build Settings
- **Build Command:** `npm install && npm run build` (padrão)
- **Output Directory:** `dist` (padrão)
- **Install Command:** `npm install` (padrão)

---

### 4️⃣ Adicionar Variáveis de Ambiente

Clicar em **"Environment Variables"** e adicionar **TODAS** as variáveis abaixo:

#### ⚠️ COPIE E COLE EXATAMENTE COMO ESTÁ

**Variável 1:**
```
Nome: VITE_FIREBASE_API_KEY
Valor: AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM
```

**Variável 2:**
```
Nome: VITE_FIREBASE_AUTH_DOMAIN
Valor: cantinhodbv-dfdab.firebaseapp.com
```

**Variável 3:**
```
Nome: VITE_FIREBASE_PROJECT_ID
Valor: cantinhodbv-dfdab
```

**Variável 4:**
```
Nome: VITE_FIREBASE_STORAGE_BUCKET
Valor: cantinhodbv-dfdab.firebasestorage.app
```

**Variável 5:**
```
Nome: VITE_FIREBASE_MESSAGING_SENDER_ID
Valor: 402854694692
```

**Variável 6:**
```
Nome: VITE_FIREBASE_APP_ID
Valor: 1:402854694692:web:38dc7415eb2f3fdbffadb1
```

**Variável 7:**
```
Nome: VITE_FIREBASE_MEASUREMENT_ID
Valor: G-2D3NW9W4QP
```

**Variável 8 (CRÍTICA):**
```
Nome: VITE_API_URL
Valor: https://rankingdbv-backend.onrender.com
```

#### Como Adicionar (Passo a Passo)

1. Clicar em **"Add"** ou **"Add Another"**
2. No campo **"Key"**, colar o nome (ex: `VITE_API_URL`)
3. No campo **"Value"**, colar o valor (ex: `https://rankingdbv-backend.onrender.com`)
4. Deixar **"Environment"** como: `Production`, `Preview`, `Development` (todos marcados)
5. Clicar em **"Add"**
6. Repetir para todas as 8 variáveis

---

### 5️⃣ Deploy

1. Clicar em **"Deploy"**
2. Aguardar 2-3 minutos
3. Vercel mostrará progresso do build:
   - Installing dependencies...
   - Building...
   - Deploying...

4. Quando aparecer **"Congratulations!"** = ✅ Deploy bem-sucedido!

5. **COPIAR A URL** gerada (ex: `https://ranking-dbv.vercel.app`)

---

### 6️⃣ Autorizar Domínio no Firebase

**IMPORTANTE:** Sem este passo, o login NÃO funcionará!

1. Acessar: https://console.firebase.google.com/project/cantinhodbv-dfdab/authentication/settings

2. Rolar até **"Authorized domains"**

3. Clicar em **"Add domain"**

4. Colar a URL do Vercel **SEM** `https://`:
   - Exemplo: `ranking-dbv.vercel.app`
   - **NÃO** incluir `https://`
   - **NÃO** incluir `/` no final

5. Clicar em **"Add"**

6. Aguardar 1-2 minutos para propagar

---

### 7️⃣ Testar Login

1. **Abrir a URL do Vercel** no navegador

2. **Fazer login** com um usuário existente:
   - Email: (seu email cadastrado)
   - Senha: (sua senha)

3. **Verificar resultado:**
   - ✅ Se entrou no sistema = SUCESSO!
   - ❌ Se deu erro = Ver seção "Troubleshooting" abaixo

---

## 🔧 Troubleshooting

### ❌ Erro: "auth/invalid-api-key"

**Causa:** Variável `VITE_FIREBASE_API_KEY` incorreta

**Solução:**
1. Vercel Dashboard → Seu projeto → Settings → Environment Variables
2. Verificar se `VITE_FIREBASE_API_KEY` = `AIzaSyB4yshC1hK1EJMs8pKm_dzLCEhojMQPyQM`
3. Se estiver errado, editar e fazer redeploy

---

### ❌ Erro: "auth/unauthorized-domain"

**Causa:** Domínio do Vercel não autorizado no Firebase

**Solução:**
1. Verificar se completou o Passo 6 (Autorizar domínio)
2. Aguardar 2 minutos para propagar
3. Limpar cache do navegador: `Ctrl+Shift+Del`
4. Tentar novamente

---

### ❌ Build falha no Vercel

**Causa:** Erro de compilação ou dependências

**Solução:**
1. Vercel Dashboard → Deployments → Clicar no deploy falhado
2. Ver logs de erro
3. Verificar se Root Directory está correto: `rankingdbv-web`
4. Tentar redeploy: Deployments → ... → Redeploy

---

### ❌ Página em branco após deploy

**Causa:** Variáveis de ambiente não configuradas

**Solução:**
1. Verificar se TODAS as 7 variáveis foram adicionadas
2. Vercel → Settings → Environment Variables
3. Confirmar que todas estão presentes
4. Fazer redeploy

---

## ✅ Checklist de Verificação

Marque conforme for completando:

- [ ] Conta criada no Vercel
- [ ] Projeto importado do GitHub
- [ ] Root directory configurado: `rankingdbv-web`
- [ ] Framework detectado: Vite
- [ ] 7 variáveis de ambiente adicionadas
- [ ] Deploy bem-sucedido (status verde)
- [ ] URL do Vercel copiada
- [ ] Domínio autorizado no Firebase
- [ ] Login testado com usuário existente
- [ ] Sistema funcionando ✅

---

## 🎉 Após Deploy Bem-Sucedido

### Configurações Adicionais (Opcional)

#### Domínio Customizado

Se quiser usar seu próprio domínio (ex: `app.cantinhodbv.com.br`):

1. Vercel → Settings → Domains
2. Clicar em **"Add"**
3. Digitar seu domínio
4. Seguir instruções para configurar DNS
5. Adicionar o novo domínio no Firebase Auth (Passo 6)

#### Analytics

O Vercel oferece analytics gratuito:

1. Vercel → Analytics
2. Ativar **"Web Analytics"**
3. Ver métricas de acesso, performance, etc.

---

## 📊 Status Final

Após completar todos os passos:

| Componente | Status | URL |
|------------|--------|-----|
| Frontend (Vercel) | ✅ Deployed | `https://seu-app.vercel.app` |
| Backend (Render) | ✅ Available | `https://rankingdbv-backend.onrender.com` |
| Firebase Auth | ✅ Configured | Firebase Console |

---

## 🎯 Próximos Passos

1. ✅ Deploy no Vercel - CONCLUÍDO
2. ✅ Autorizar domínio - CONCLUÍDO
3. ✅ Testar login - CONCLUÍDO
4. 🎉 **MIGRAÇÃO COMPLETA!**

---

## 📞 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com/project/cantinhodbv-dfdab
- **GitHub Repo:** https://github.com/SunshineAppV2/RankingDbv
- **Render Dashboard:** https://dashboard.render.com

---

**Última atualização:** 2026-01-05  
**Tempo estimado:** 15 minutos  
**Dificuldade:** Fácil (apenas copiar e colar)
