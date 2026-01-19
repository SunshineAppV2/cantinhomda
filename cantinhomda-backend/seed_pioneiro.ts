
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // I. GERAIS
    { code: 'I.1', description: 'Ter, no mínimo, 13 anos de idade.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro ativo do Clube de Desbravadores.', area: 'I. GERAIS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Memorizar e entender o Alvo e o Lema JA.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.4', description: 'Ler o livro do Curso de Leitura do ano e resumi-lo em uma página.', area: 'I. GERAIS', methodology: 'DISCOVERY' },
    { code: 'I.5', description: 'Ler o livro Expedição Galápagos.', area: 'I. GERAIS', methodology: 'DISCOVERY' },

    // II. DESCOBERTA ESPIRITUAL
    { code: 'II.1', description: 'Memorizar e demonstrar conhecimento: Bem-Aventuranças (Sermão da Montanha).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler e explicar os versos: Isaías 26:3, Romanos 12:12, João 14:1-3, Salmo 37:5, Filipenses 3:12-14, Salmo 23, I Samuel 15:22.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Conversar sobre Cristianismo, verdadeiro discípulo e como ser cristão verdadeiro.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'LEADERSHIP' },
    { code: 'II.4', description: 'Participar de estudo sobre inspiração da Bíblia (inspiração, revelação, iluminação).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.5', description: 'Convidar três ou mais pessoas para assistirem a uma Classe Bíblica ou Pequeno Grupo.', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'LEADERSHIP' },
    { code: 'II.6', description: 'Leitura bíblica (Eclesiastes, Isaías, Jeremias, Daniel, Joel, Amós, Jonas, Miquéias, Ageu, Zacarias, Malaquias, Mateus selecionados).', area: 'II. DESCOBERTA ESPIRITUAL', methodology: 'DISCOVERY' },

    // III. SERVINDO A OUTROS
    { code: 'III.1', description: 'Participar em dois projetos missionários definidos por seu Clube.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Trabalhar em um projeto comunitário de sua igreja, escola ou comunidade.', area: 'III. SERVINDO A OUTROS', methodology: 'LEADERSHIP' },

    // IV. DESENVOLVENDO AMIZADE
    { code: 'IV.1', description: 'Debate e avaliação pessoal sobre: Autoestima, Amizade, Relacionamentos ou Otimismo/Pessimismo.', area: 'IV. DESENVOLVENDO AMIZADE', methodology: 'LEADERSHIP' },

    // V. SAÚDE E APTIDÃO FÍSICA
    { code: 'V.1', description: 'Preparar programa de exercícios físicos diários e assinar compromisso.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'EXECUTION' },
    { code: 'V.2', description: 'Discutir vantagens do estilo de vida adventista segundo a Bíblia.', area: 'V. SAÚDE E APTIDÃO FÍSICA', methodology: 'DISCOVERY' },

    // VI. ORGANIZAÇÃO E LIDERANÇA
    { code: 'VI.1', description: 'Assistir seminário/treinamento de Ministério Pessoal ou Evangelismo.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },
    { code: 'VI.2', description: 'Participar de uma atividade social de sua igreja.', area: 'VI. ORGANIZAÇÃO E LIDERANÇA', methodology: 'LEADERSHIP' },

    // VII. ESTUDO DA NATUREZA
    { code: 'VII.1', description: 'Estudar história do dilúvio e processo de fossilização.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },
    { code: 'VII.2', description: 'Completar uma especialidade de Estudo da natureza.', area: 'VII. ESTUDO DA NATUREZA', methodology: 'DISCOVERY' },

    // VIII. ARTE DE ACAMPAR
    { code: 'VIII.1', description: 'Fazer um fogo refletor e demonstrar seu uso.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.2', description: 'Participar de acampamento e arrumar mochila apropriadamente.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },
    { code: 'VIII.3', description: 'Completar a especialidade de Resgate básico.', area: 'VIII. ARTE DE ACAMPAR', methodology: 'EXECUTION' },

    // IX. ESTILO DE VIDA
    { code: 'IX.1', description: 'Completar especialidade em: Miss. Comunitárias, Profissionais ou Agrícolas.', area: 'IX. ESTILO DE VIDA', methodology: 'EXECUTION' },

    // CLASSE AVANÇADA - PIONEIRO DE NOVAS FRONTEIRAS
    { code: 'AV.1', description: 'Completar a especialidade de Cidadania cristã.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.2', description: 'Encenar Bom Samaritano e auxiliar 3 pessoas de forma prática.', area: 'X. CLASSE AVANÇADA', methodology: 'LEADERSHIP' },
    { code: 'AV.3', description: 'Atividade física e relatório (Caminhar, Cavalgar, Canoa, Ciclismo, Natação, Corrida ou Patins).', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.4', description: 'Completar a especialidade de Mapa e bússola.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.5', description: 'Demonstrar habilidade no uso correto de uma machadinha.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.6', description: 'Acender fogueira em chuva, conseguir lenha seca e manter fogo.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.7', description: 'Completar um: Plantas comestíveis, Semáforo, Náutico, Libras ou Braille.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.8', description: 'Completar especialidade de Atividades recreativas.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
    { code: 'AV.9', description: 'Pesquisar e identificar 25 itens: Folhas, Rochas, Flores, Borboletas ou Conchas.', area: 'X. CLASSE AVANÇADA', methodology: 'DISCOVERY' },
    { code: 'AV.10', description: 'Completar a especialidade de Fogueiras e cozinha ao ar livre.', area: 'X. CLASSE AVANÇADA', methodology: 'EXECUTION' },
];

async function main() {
    console.log('🌱 Seeding PIONEIRO Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'PIONEIRO',
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
                    ageGroup: 'TEEN'
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'PIONEIRO',
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
