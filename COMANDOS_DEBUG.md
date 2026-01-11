# 🛠️ Comandos Úteis - Debug e Verificação

## 🔍 Verificar Configuração Local

### Frontend (rankingdbv-web)

```bash
# Navegar para pasta do frontend
cd rankingdbv-web

# Verificar se variáveis de ambiente estão carregadas
npm run dev

# Em outro terminal, verificar build
npm run build

# Verificar se Firebase está configurado
cat src/lib/firebase.ts
```

### Backend (rankingdbv-backend)

```bash
# Navegar para pasta do backend
cd rankingdbv-backend

# Verificar variáveis de ambiente (cuidado com chaves privadas!)
# NÃO EXECUTAR EM PRODUÇÃO
cat .env

# Verificar se Firebase Admin está configurado
cat src/firebase-admin.ts

# Testar build
npm run build

# Rodar localmente
npm run start:dev
```

---

## 🌐 Testar Endpoints

### Verificar Backend no Render

```bash
# Health check
curl https://rankingdbv-backend.onrender.com/health

# Verificar se API está respondendo
curl https://rankingdbv-backend.onrender.com/api

# Testar autenticação (substitua SEU_TOKEN)
curl -X GET https://rankingdbv-backend.onrender.com/api/users/me \
  -H "Authorization: Bearer SEU_TOKEN_JWT_AQUI"
```

### Verificar Frontend no Vercel

```bash
# Verificar se site está no ar
curl -I https://seu-app.vercel.app

# Verificar se arquivos estáticos estão sendo servidos
curl https://seu-app.vercel.app/assets/index.js
```

---

## 🔐 Obter Token JWT (para testes)

### No Console do Navegador (F12)

```javascript
// Verificar se usuário está logado
const user = firebase.auth().currentUser;
console.log('Usuário:', user);

// Obter token
if (user) {
    user.getIdToken().then(token => {
        console.log('Token JWT:', token);
        // Copiar token para usar em testes de API
        navigator.clipboard.writeText(token);
        console.log('Token copiado para clipboard!');
    });
} else {
    console.log('Usuário não está logado');
}

// Verificar dados do token (decodificado)
user.getIdTokenResult().then(result => {
    console.log('Claims:', result.claims);
    console.log('Expira em:', new Date(result.expirationTime));
});
```

---

## 📊 Verificar Logs

### Vercel

```bash
# Instalar Vercel CLI (opcional)
npm i -g vercel

# Login
vercel login

# Ver logs em tempo real
vercel logs seu-projeto --follow

# Ver logs de build
vercel logs seu-projeto --build
```

### Render

**Via Dashboard:**
1. Acessar: https://dashboard.render.com
2. Clicar no serviço `rankingdbv-backend`
3. Clicar em "Logs"
4. Filtrar por erro: Ctrl+F → "error"

**Via API (avançado):**
```bash
# Obter API Key do Render
# Dashboard → Account Settings → API Keys

curl -H "Authorization: Bearer SEU_RENDER_API_KEY" \
  https://api.render.com/v1/services/SEU_SERVICE_ID/logs
```

---

## 🔧 Debug de Autenticação

### Verificar se Firebase está inicializado

```javascript
// No console do navegador
console.log('Firebase App:', firebase.app());
console.log('Auth:', firebase.auth());
console.log('Usuário atual:', firebase.auth().currentUser);
```

### Testar login programaticamente

```javascript
// Login com email/senha
firebase.auth().signInWithEmailAndPassword('usuario@example.com', 'senha123')
    .then(userCredential => {
        console.log('Login bem-sucedido!', userCredential.user);
        return userCredential.user.getIdToken();
    })
    .then(token => {
        console.log('Token:', token);
    })
    .catch(error => {
        console.error('Erro no login:', error.code, error.message);
    });
```

### Verificar domínio autorizado

```javascript
// Verificar se domínio atual está autorizado
const currentDomain = window.location.hostname;
console.log('Domínio atual:', currentDomain);

// Lista de domínios autorizados (verificar no Firebase Console)
// Authentication → Settings → Authorized domains
```

---

## 🧪 Testar Fluxo Completo

### Script de Teste End-to-End

```javascript
// Executar no console do navegador (F12)

async function testarFluxoCompleto() {
    console.log('🔍 Iniciando teste...\n');
    
    // 1. Verificar Firebase
    console.log('1️⃣ Verificando Firebase...');
    if (!firebase) {
        console.error('❌ Firebase não está carregado!');
        return;
    }
    console.log('✅ Firebase OK\n');
    
    // 2. Verificar usuário
    console.log('2️⃣ Verificando usuário...');
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('❌ Usuário não está logado!');
        return;
    }
    console.log('✅ Usuário logado:', user.email, '\n');
    
    // 3. Obter token
    console.log('3️⃣ Obtendo token...');
    const token = await user.getIdToken();
    console.log('✅ Token obtido:', token.substring(0, 50) + '...\n');
    
    // 4. Testar API
    console.log('4️⃣ Testando API...');
    const API_URL = 'https://rankingdbv-backend.onrender.com'; // Ajustar se necessário
    
    try {
        const response = await fetch(`${API_URL}/api/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API respondeu:', data, '\n');
        } else {
            console.error('❌ API retornou erro:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Erro ao chamar API:', error);
    }
    
    console.log('✅ Teste concluído!');
}

// Executar teste
testarFluxoCompleto();
```

---

## 🔍 Verificar Variáveis de Ambiente

### No Vercel (via CLI)

```bash
# Listar variáveis de ambiente
vercel env ls

# Adicionar variável
vercel env add VITE_FIREBASE_API_KEY

# Remover variável
vercel env rm VITE_FIREBASE_API_KEY
```

### No Render (via Dashboard)

1. Acessar: https://dashboard.render.com
2. Clicar no serviço
3. Ir em "Environment"
4. Verificar se todas as variáveis estão presentes:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `DATABASE_URL`
   - `JWT_SECRET`

---

## 🐛 Debug de Erros Comuns

### Erro: "auth/invalid-api-key"

```bash
# Verificar se chave está correta
echo $VITE_FIREBASE_API_KEY

# Comparar com Firebase Console
# https://console.firebase.google.com/project/cantinhodbv-dfdab/settings/general
```

### Erro: "auth/unauthorized-domain"

```javascript
// Verificar domínio atual
console.log('Domínio:', window.location.hostname);

// Adicionar no Firebase Console:
// Authentication → Settings → Authorized domains
```

### Erro: "Token inválido" no backend

```bash
# Verificar se chave privada está correta
# Render Dashboard → Environment → FIREBASE_PRIVATE_KEY

# Deve começar com: -----BEGIN PRIVATE KEY-----\n
# Deve terminar com: \n-----END PRIVATE KEY-----\n
```

### Erro: "CORS"

```javascript
// Verificar se backend está configurado para aceitar requisições do Vercel
// No backend (NestJS), verificar main.ts:

app.enableCors({
    origin: [
        'https://seu-app.vercel.app',
        'http://localhost:5173', // desenvolvimento
    ],
    credentials: true,
});
```

---

## 📝 Checklist de Debug

Quando algo não funcionar, verificar na ordem:

- [ ] Firebase está inicializado? (`firebase.app()`)
- [ ] Usuário está logado? (`firebase.auth().currentUser`)
- [ ] Token está sendo gerado? (`user.getIdToken()`)
- [ ] Domínio está autorizado no Firebase?
- [ ] Backend está rodando? (verificar Render)
- [ ] Variáveis de ambiente estão corretas?
- [ ] CORS está configurado?
- [ ] Token está sendo enviado no header? (`Authorization: Bearer ...`)
- [ ] Backend está validando token corretamente?

---

## 🆘 Comandos de Emergência

### Resetar deploy no Vercel

```bash
# Via CLI
vercel --force

# Ou via Dashboard
# Deployments → ... → Redeploy
```

### Resetar deploy no Render

**Via Dashboard:**
1. Render Dashboard → Seu serviço
2. Manual Deploy → Deploy latest commit

### Limpar cache do navegador

```javascript
// No console do navegador
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Verificar se Firebase está acessível

```bash
# Ping para Firebase
curl -I https://firebase.google.com

# Verificar se projeto existe
curl https://cantinhodbv-dfdab.firebaseapp.com
```

---

## 📚 Logs Úteis

### Habilitar logs detalhados do Firebase

```javascript
// No início do seu app
firebase.setLogLevel('debug');

// Ou via localStorage
localStorage.setItem('debug', 'firebase:*');
```

### Ver requisições de rede

```javascript
// No console do navegador (F12)
// Aba Network → Filtrar por "api" ou "firebase"
```

---

## 🎯 Script de Verificação Completa

```bash
# Salvar como check-all.sh (Linux/Mac) ou check-all.ps1 (Windows)

echo "🔍 Verificando configuração completa...\n"

# 1. Verificar se pastas existem
echo "📁 Verificando estrutura de pastas..."
test -d rankingdbv-web && echo "✅ rankingdbv-web" || echo "❌ rankingdbv-web"
test -d rankingdbv-backend && echo "✅ rankingdbv-backend" || echo "❌ rankingdbv-backend"

# 2. Verificar se dependências estão instaladas
echo "\n📦 Verificando dependências..."
cd rankingdbv-web && npm list firebase && cd ..
cd rankingdbv-backend && npm list firebase-admin && cd ..

# 3. Verificar se builds funcionam
echo "\n🔨 Testando builds..."
cd rankingdbv-web && npm run build && cd ..
cd rankingdbv-backend && npm run build && cd ..

echo "\n✅ Verificação concluída!"
```

---

**Última atualização:** 2026-01-05  
**Uso:** Consultar quando precisar debugar problemas de autenticação ou deploy
