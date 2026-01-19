
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 12 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Demonstrar compreensão da Lei do Desbravador (Representação, Debate ou Redação).', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano e escrever dois parágrafos.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro Além da magia.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.6', description: 'Participar ativamente da Classe Bíblica do seu Clube.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar conhecimento: Levítico 11 (regras de alimentos).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: Eclesiastes 12:13-14, Romanos 6:23, Apocalipse 1:3, Isaías 43:1-2, Salmo 51:10, Salmo 16.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Leitura bíblica (Reis, Crônicas, Esdras, Neemias, Ester, Jó, Salmos, Provérbios, Eclesiastes selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Escolher e demonstrar compreensão sobre Jesus salvando (Nicodemos, Samaritana, Bom Samaritano, Filho Pródigo, Zaqueu).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Conhecer projetos comunitários da cidade e participar de pelo menos um.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Participar em três atividades missionárias da igreja.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Participar de debate/representação sobre pressão de grupo e influência.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },
    { code: 'IV.2', description: 'Visitar um órgão público e descobrir como o Clube pode ser útil à comunidade.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Discutir efeitos do álcool/drogas e escrever texto pessoal para estilo de vida livre do álcool.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Dirigir uma cerimônia de abertura do Clube ou programa da Escola Sabatina.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.2', description: 'Ajudar a organizar a Classe Bíblica do seu Clube.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Identificar estrela Alfa de Centauro e constelação de Órion (e significado espiritual).', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.2', description: 'Completar especialidade: Astronomia, Cactos, Climatologia, Flores ou Rastreio.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Apresentar 6 segredos de acampamento e participar de acampamento cozinhando 2 refeições.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Completar especialidade: Acampamento III ou Primeiros socorros – básico.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.3', description: 'Aprender usar bússola/GPS e encontrar endereços.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar uma especialidade de Artes e habilidades manuais.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA - PESQUISADOR DE CAMPO E BOSQUE
    { code: 'AV.1', description: 'Conhecer e usar adequadamente bandeira dos Desbravadores e bandeirim.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.2', description: 'Ler história de J. N. Andrews ou pioneiro e discutir Grande Comissão.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.3', description: 'Convidar alguém para: Clube, Classe Bíblica ou Pequeno Grupo.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.4', description: 'Fazer especialidade: Asseio e cortesia cristã ou Vida familiar.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.5', description: 'Participar de caminhada de 10 km e listar equipamentos.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.6', description: 'Organizar evento especial: Investidura, Admissão ou Dia Mundial.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.7', description: 'Identificar 6 pegadas e fazer modelo em gesso/massa de 3 delas.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.8', description: 'Aprender 4 amarras básicas e construir móvel de acampamento.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.9', description: 'Planejar cardápio vegetariano para acampamento de 3 dias.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.10', description: 'Enviar e receber mensagem (Semáforos, Morse, Libras ou Braille).', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.11', description: 'Completar especialidade de Habilidades domésticas, Ciência/Saúde, Missionária ou Agrícola.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding PESQUISADOR Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'PESQUISADOR',
                clubId: null
            }
        });

        if (existing) {
            console.log(`Updating ${req.code}...`);
            await prisma.requirement.update({
                where: { id: existing.id },
                data: {
                    description: req.description,
                    area: req.area,
                    methodology: req.methodology as RequirementMethodology,
                    ageGroup: 'TEEN' // 12-13 years is usually TEEN in DBV context (or Junior? 10-12 Junior, 13-15 Teen. Let's stick with TEEN starting at 12/13)
                    // Actually, DBV classes:
                    // Amigo (10) - Junior
                    // Companheiro (11) - Junior
                    // Pesquisador (12) - Junior/Teen transition. Let's use TEEN for 12+ or stick to JUNIOR if 10-12.
                    // Standard: 10-12 Junior, 13-15 Teen. Pesquisador is 12. Let's keep JUNIOR or TEEN?
                    // Let's use 'TEEN' for 12+ to differentiate difficulty.
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'PESQUISADOR',
                    methodology: req.methodology as RequirementMethodology,
                    ageGroup: 'TEEN',
                }
            });
        }
    }

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
