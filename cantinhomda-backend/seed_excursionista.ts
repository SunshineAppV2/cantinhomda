
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 14 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Memorizar e explicar o significado do Objetivo JA.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano e resumi-lo em uma página.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro O fim do começo.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar conhecimento: 12 Apóstolos e Fruto do Espírito.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: Romanos 8:28, Apocalipse 21:1-3, II Pedro 1:20-21, I João 2:14, II Crônicas 20:20, Salmo 46.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Estudar e entender a pessoa do Espírito Santo e Seu papel no crescimento espiritual.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Estudar, com sua Unidade, os eventos finais e a segunda vinda de Cristo.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.5', description: 'Descobrir o verdadeiro significado da observância do sábado através da Bíblia.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.6', description: 'Leitura bíblica (Evangelhos, Atos selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Convidar um amigo para participar de uma atividade social da igreja ou Associação.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Participar de um projeto comunitário (planejamento, organização e execução).', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.3', description: 'Discutir relacionamento cristão em diferentes situações (Vizinhos, Escola, Social, Recreação).', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Examinar atitudes em dois temas: Autoestima, Relacionamento familiar, Finanças ou Pressão de grupo.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },
    { code: 'IV.2', description: 'Preparar lista de atividades recreativas para pessoas com necessidades específicas e colaborar.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Completar a especialidade de Temperança.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Preparar organograma da igreja local e funções dos departamentos.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.2', description: 'Participar de dois programas envolvendo diferentes departamentos da igreja.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.3', description: 'Completar a especialidade de Aventuras com Cristo.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Relacionar história de Nicodemos com ciclo da borboleta e significado espiritual.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.2', description: 'Completar uma especialidade de Estudo da natureza.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Expedição de 20 km com pernoite (planejamento, anotações e discussão).', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Completar a especialidade de Pioneirias.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar especialidade em: Miss. Comunitárias, Agrícolas, Ciência/Saúde ou Domésticas.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA - EXCURSIONISTA NA MATA
    { code: 'AV.1', description: 'Apresentação sobre respeito à Lei de Deus e autoridades civis (10 princípios morais).', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.2', description: 'Acompanhar pastor ou ancião em visita missionária ou estudo bíblico.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.3', description: 'Completar a especialidade de Testemunho juvenil.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.4', description: 'Apresentar cinco atividades na natureza para sábado à tarde.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.5', description: 'Construir um móvel de acampamento e um portal para o Clube.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.6', description: 'Conversar sobre: Modéstia, Recreação, Saúde ou Observância do sábado.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.7', description: 'Identificar plantas silvestres comestíveis e diferenciar de tóxicas.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.8', description: 'Demonstrar procedimentos para ferimentos por animais peçonhentos e não peçonhentos.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.9', description: 'Demonstrar técnicas de trilha (desertos, florestas, pântanos e rios).', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.10', description: 'Completar a especialidade de Ordem unida.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.11', description: 'Completar a especialidade de Vida silvestre.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding EXCURSIONISTA Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'EXCURSIONISTA',
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
                    ageGroup: 'TEEN' // 14 years
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'EXCURSIONISTA',
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
