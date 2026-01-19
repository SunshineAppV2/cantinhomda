
import { PrismaClient, RequirementMethodology, RequirementType } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 10 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Memorizar e explicar o Voto e a Lei do Desbravador.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro Vaso de Barro.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.6', description: 'Participar ativamente da Classe Bíblica do seu Clube.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar o seu conhecimento sobre: Criação, 10 Pragas, 12 Tribos e Livros do AT.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: João 3:16, Efésios 6:1-3, II Timóteo 3:16, Salmo 1.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Leitura bíblica (Gênesis e Êxodo selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Dedicar duas horas ajudando alguém em sua comunidade (visita, alimento ou projeto).', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Escrever uma redação explicando como ser um bom cidadão no lar e na escola.', area: 'III. SERVINDO A OUTROS', methodology: 'DISCOVERY' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Mencionar dez qualidades de um bom amigo e apresentar quatro situações de prática da Regra Áurea.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },
    { code: 'IV.2', description: 'Saber cantar o Hino Nacional e conhecer sua história.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'DISCOVERY' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Completar uma especialidade de água (Natação, Cultura física, Nós, Segurança).', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },
    { code: 'V.2', description: 'Utilizando Daniel: Explicar temperança, Memorizar Daniel 1:8 e Escrever compromisso de saúde.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },
    { code: 'V.3', description: 'Aprender os princípios de uma dieta saudável e ajudar a preparar um quadro com grupos alimentares.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Acompanhar planejamento e execução de uma caminhada de 5 km.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Completar uma especialidade de natureza (Felinos, Cães, Mamíferos, Sementes, Aves).', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.2', description: 'Aprender a purificar água e escrever sobre Jesus como água da vida.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'EXECUTION' },
    { code: 'VII.3', description: 'Aprender e montar uma barraca em local apropriado.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'EXECUTION' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Demonstrar nós (Simples, Cego, Direito, Cirurgião, Laís de guia, etc) e cuidados com corda.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Completar a especialidade de Acampamento I.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.3', description: 'Apresentar dez regras para caminhada e o que fazer se perdido.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.4', description: 'Aprender sinais de pista e preparar/seguir uma pista de 10 sinais.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar uma especialidade na área de Artes e habilidades manuais.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA
    { code: 'AV.1', description: 'Memorizar, cantar ou tocar o Hino dos Desbravadores.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.2', description: 'Conversar sobre amor de Deus na vida de José, Jonas, Ester ou Rute.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.3', description: 'Levar dois amigos à Escola Sabatina ou Clube.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.4', description: 'Conhecer princípios de higiene e boas maneiras à mesa.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.5', description: 'Completar a especialidade de Arte de acampar.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.6', description: 'Conhecer e identificar 10 flores silvestres e 10 insetos.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.7', description: 'Começar uma fogueira com materiais naturais e mantê-la acesa.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.8', description: 'Usar corretamente faca/facão/machadinha e conhecer 10 regras de segurança.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.9', description: 'Completar uma especialidade de Missionária ou Agrícola.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding Amigo Class Requirements...');

    // Clean existing Amigo requirements to avoid duplicates? 
    // Dangerous for production if users already have progress. USE UPSERT based on CODE + CLASS.

    for (const req of REQUIREMENTS) {
        // Only update description/gamification if exists, create if not
        // We use findFirst to check existence because Code isn't unique globally (but code+class should be)

        // NOTE: This assumes 'AMIGO' is the intended class for all these.

        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'AMIGO',
                clubId: null // Universal
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
                    ageGroup: 'JUNIOR'
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'AMIGO',
                    methodology: req.methodology as RequirementMethodology,
                    ageGroup: 'JUNIOR'
                    // type: 'NONE' -> Defaults to TEXT in schema (which is fine for now)
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
