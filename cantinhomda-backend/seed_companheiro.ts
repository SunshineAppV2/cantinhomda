
import { PrismaClient, RequirementMethodology, RequirementType } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 11 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Ilustrar de forma criativa o significado do Voto do Desbravador.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano e escrever um parágrafo sobre o que mais lhe chamou atenção.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro Um simples lanche.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.6', description: 'Participar ativamente da Classe Bíblica do seu Clube.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar conhecimento: 10 Mandamentos e 27 livros do Novo Testamento.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: Isaías 41:9-10, Hebreus 13:5, Provérbios 22:6, I João 1:9, Salmo 8.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Leitura bíblica (Levítico, Números, Deuteronômio, Josué, Juízes, Rute, Samuel selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Escolher e demonstrar conhecimento sobre: Parábola, Milagre, Sermão da Montanha ou Segunda Vinda.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Dedicar duas horas servindo sua comunidade e demonstrando companheirismo.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Participar de um projeto que beneficiará sua comunidade ou igreja.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Conversar sobre respeito a pessoas de diferentes culturas, raça e sexo.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Memorizar e explicar I Coríntios 9:24-27.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },
    { code: 'V.2', description: 'Conversar sobre aptidão física e exercícios físicos regulares.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },
    { code: 'V.3', description: 'Aprender sobre os prejuízos do cigarro e escrever compromisso de não fumar.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },
    { code: 'V.4', description: 'Completar especialidade de Natação principiante II ou Acampamento II.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Dirigir ou colaborar em uma meditação criativa.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.2', description: 'Ajudar no planejamento de uma excursão ou acampamento.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Participar de jogos na natureza ou caminhada ecológica (1 hora).', area: 'VII. ESTUDO DA NATUREZA', methodology: 'EXECUTION' },
    { code: 'VII.2', description: 'Completar uma especialidade de natureza (Anfíbios, Aves, Pecuária, Répteis, Moluscos, Árvores, Arbustos).', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.3', description: 'Recapitular estudo da Criação e fazer diário de 7 dias.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Descobrir pontos cardeais sem bússola e desenhar Rosa dos Ventos.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Participar de acampamento e fazer relatório.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.3', description: 'Aprender/Recapitular nós (Oito, Salteador, Duplo, Caminhoneiro, Direito, Fiel, Escota, Laís, Simples).', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar uma especialidade de Artes e habilidades manuais.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA - COMPANHEIRO DE EXCURSIONISMO
    { code: 'AV.1', description: 'Aprender composição e significado da Bandeira Nacional.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.2', description: 'Ler e discutir a primeira visão de Ellen White.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.3', description: 'Participar de atividade missionária ou comunitária com um amigo.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.4', description: 'Conversar sobre respeito aos pais e listar cuidados recebidos.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.5', description: 'Participar de caminhada de 6 km com relatório.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.6', description: 'Escolher item de saúde (Curso fumo, Filme saúde, Cartaz drogas, Exposição, Pesquisa).', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.7', description: 'Identificar e descrever 12 aves nativas e 12 árvores nativas.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.8', description: 'Participar e sugerir ideias para uma cerimônia (Investidura, Lenço ou Dia Mundial).', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.9', description: 'Preparar uma refeição em fogueira durante acampamento.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.10', description: 'Preparar quadro com 15 nós diferentes.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.11', description: 'Completar especialidade de Excursionismo pedestre com mochila.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.12', description: 'Completar uma especialidade de Habilidades domésticas, Ciência/Saúde, Missionária ou Agrícola.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding COMPANHEIRO Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'COMPANHEIRO',
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
                    dbvClass: 'COMPANHEIRO',
                    methodology: req.methodology as RequirementMethodology,
                    ageGroup: 'JUNIOR',
                    // type: RequirementType.TEXT // Default
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
