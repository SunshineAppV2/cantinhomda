#!/usr/bin/env node

/**
 * Script de Verificação de Configuração
 * Verifica se todas as variáveis de ambiente necessárias estão configuradas
 */

console.log('🔍 Verificando Configuração do Projeto...\n');

// Cores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

const checkmark = '✅';
const cross = '❌';
const warning = '⚠️';

// Variáveis esperadas no Frontend (Vercel)
const frontendVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
];

// Variáveis esperadas no Backend (Render)
const backendVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
];

console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.blue}📦 FRONTEND (Vercel)${colors.reset}`);
console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

let frontendOk = true;

frontendVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`${checkmark} ${colors.green}${varName}${colors.reset}: ${value.substring(0, 20)}...`);
    } else {
        console.log(`${cross} ${colors.red}${varName}${colors.reset}: NÃO CONFIGURADO`);
        frontendOk = false;
    }
});

console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.blue}🔧 BACKEND (Render)${colors.reset}`);
console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

let backendOk = true;

backendVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName === 'FIREBASE_PRIVATE_KEY') {
            // Verificar se a chave está bem formatada
            if (value.includes('BEGIN PRIVATE KEY') && value.includes('END PRIVATE KEY')) {
                console.log(`${checkmark} ${colors.green}${varName}${colors.reset}: Chave privada válida`);
            } else {
                console.log(`${warning} ${colors.yellow}${varName}${colors.reset}: Chave pode estar mal formatada`);
                backendOk = false;
            }
        } else {
            console.log(`${checkmark} ${colors.green}${varName}${colors.reset}: ${value.substring(0, 30)}...`);
        }
    } else {
        console.log(`${cross} ${colors.red}${varName}${colors.reset}: NÃO CONFIGURADO`);
        backendOk = false;
    }
});

console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.blue}📊 RESUMO${colors.reset}`);
console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

if (frontendOk && backendOk) {
    console.log(`${checkmark} ${colors.green}Todas as variáveis estão configuradas!${colors.reset}`);
    console.log(`\n${colors.green}Você pode prosseguir com o deploy.${colors.reset}\n`);
    process.exit(0);
} else {
    console.log(`${cross} ${colors.red}Algumas variáveis estão faltando!${colors.reset}`);
    console.log(`\n${colors.yellow}Ações necessárias:${colors.reset}\n`);

    if (!frontendOk) {
        console.log(`1. Configure as variáveis do Frontend no Vercel:`);
        console.log(`   https://vercel.com/seu-projeto/settings/environment-variables\n`);
    }

    if (!backendOk) {
        console.log(`2. Configure as variáveis do Backend no Render:`);
        console.log(`   https://dashboard.render.com/seu-servico\n`);
    }

    console.log(`3. Consulte o guia: VERCEL_DEPLOY_GUIDE.md\n`);
    process.exit(1);
}
