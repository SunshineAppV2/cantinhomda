
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 15 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Memorizar e explicar o Voto de Fidelidade à Bíblia.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano e resumi-lo em uma página.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro O livro amargo.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar conhecimento: 3 Mensagens Angélicas, 7 Igrejas, Pedras preciosas.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: I Coríntios 13, II Crônicas 7:14, Apocalipse 22:18-20, II Timóteo 4:6-7, Romanos 8:38-39, Mateus 6:33-34.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Descrever os dons espirituais (Paulo) e seus objetivos para a igreja.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Estudar estrutura e serviço do santuário (AT) e relacionar com Jesus e a cruz.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.5', description: 'Ler e resumir três histórias de pioneiros adventistas e contá-las.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'LEADERSHIP' },
    { code: 'II.6', description: 'Leitura bíblica (Atos, Epístolas de Paulo, Pedro, João, Apocalipse selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Ajudar e participar: Visita a doente, Adotar família carente ou Projeto aprovado.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Discutir métodos de evangelismo pessoal e praticar.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Examinar atitudes em dois temas: Escolha profissional, Pais, Namoro ou Sexo (Plano de Deus).', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'DISCOVERY' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Fazer apresentação sobre os oito remédios naturais.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'LEADERSHIP' },
    { code: 'V.2', description: 'Completar um: Poesia/Artigo saúde, Corrida com treinamento, Temperança (Ellen White) ou Esp. Nutrição/Cultura Física.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Preparar organograma da estrutura administrativa da Igreja (Divisão).', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.2', description: 'Participar de: Curso conselheiros, Convenção liderança ou 2 reuniões de diretoria.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.3', description: 'Planejar e ensinar 2 requisitos de especialidade para um grupo.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Estudar infância de Jesus (O Desejado de Todas as Nações) e relação com a natureza.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.2', description: 'Completar especialidade: Ecologia ou Conservação ambiental.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Acampamento com pioneiria: planejamento e execução.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Planejar, preparar e cozinhar três refeições ao ar livre.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.3', description: 'Construir e utilizar um móvel de acampamento em tamanho real.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.4', description: 'Completar especialidade: Aquática, Esportes, Recreativas ou Vida campestre.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar especialidade em: Recreativas, Ciência/Saúde, Domésticas ou Profissionais.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA - GUIA DE EXPLORAÇÃO
    { code: 'AV.1', description: 'Completar a especialidade de Mordomia.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.2', description: 'Ler O Maior Discurso de Cristo e escrever sobre efeito na vida.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.3', description: 'Trazer 2 amigos para igreja ou ajudar em série de evangelismo jovem.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.4', description: 'Escrever/Apresentar sobre como influenciar amigos para Cristo.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.5', description: 'Observar trabalho dos diáconos por 2 meses e relatar.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.6', description: 'Completar uma especialidade para mestrado em Vida campestre.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.7', description: 'Projetar 3 abrigos e usar um deles em acampamento.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.8', description: 'Assistir/Apresentar sobre: Aborto, Bullying, Violência, Drogas ou ISTs.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.9', description: 'Completar a especialidade de Liderança campestre.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.10', description: 'Completar a especialidade de Orçamento familiar.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding GUIA Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'GUIA',
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
                    ageGroup: 'TEEN' // 15 years
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'GUIA',
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
