
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const SPECIALTIES = [
    {
        code: 'AD-001',
        name: 'Alívio da Fome',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Assistir a uma reportagem sobre fome no mundo e discutir ações para reduzi-la.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Entrevistar alguém que distribui alimentos (ASA, ONG) sobre público e necessidades.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Descrever as causas da fome em seu país (redação, vídeo ou encenação).', methodology: 'DISCOVERY' },
        ]
    },
    {
        code: 'AD-002',
        name: 'Avaliação da Comunidade',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Descrever uma comunidade (mapa, demografia, condições, educação, saúde, segurança).', methodology: 'DISCOVERY' },
            { code: '2', description: 'Listar necessidades identificadas (apoio a baixa renda, idosos, limpeza, etc).', methodology: 'DISCOVERY' },
            { code: '3', description: 'Entrevistar um líder comunitário sobre como exercer impacto positivo.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Preparar relatório criativo para o Clube apresentando descobertas.', methodology: 'LEADERSHIP' },
            { code: '5', description: 'Descrever melhorias necessárias e o que você pode fazer para ajudar.', methodology: 'LEADERSHIP' },
        ]
    },
    {
        code: 'AD-003',
        name: 'Serviço Comunitário',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Ler Lucas 10 e Mateus 25 e explicar papel do cristão com necessitados.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Ler "O Desejado de Todas as Nações" (cap 54) e listar 5 pontos.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Explicar organização adventista local de ajuda e significado da sigla ADRA.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Auxiliar na preparação de 5 pacotes de socorro/alimentos.', methodology: 'EXECUTION' },
            { code: '5', description: 'Consultar líder ADRA/ASA sobre projetos para a unidade.', methodology: 'LEADERSHIP' },
            { code: '6', description: 'Planejar e completar um projeto de serviço comunitário com a unidade.', methodology: 'LEADERSHIP' },
            { code: '7', description: 'Completar 10 horas de serviço voluntário.', methodology: 'EXECUTION' },
        ]
    },
    {
        code: 'AD-004',
        name: 'Resposta a Emergências e Desastres',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Definir o que é uma emergência ou desastre e listar tipos comuns.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Identificar organizações que respondem a desastres em sua região.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Preparar um kit de emergência familiar básico.', methodology: 'EXECUTION' },
            { code: '4', description: 'Participar de treinamento ou simulação de resposta a emergências.', methodology: 'EXECUTION' },
            { code: '5', description: 'Desenvolver um plano de evacuação para sua casa ou escola.', methodology: 'LEADERSHIP' },
        ]
    },
    {
        code: 'AD-005',
        name: 'Resposta a Emergências e Desastres - Avançado',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Completar a especialidade básica de Resposta a Emergências.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Participar de treinamento avançado em gestão de desastres.', methodology: 'EXECUTION' },
            { code: '3', description: 'Coordenar uma simulação de resposta a desastres com sua unidade.', methodology: 'LEADERSHIP' },
            { code: '4', description: 'Desenvolver um plano de comunicação de emergência para o clube.', methodology: 'LEADERSHIP' },
            { code: '5', description: 'Participar ativamente de uma resposta real ou exercício de campo.', methodology: 'EXECUTION' },
        ]
    },
    {
        code: 'AD-006',
        name: 'Alfabetização',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Definir o termo "alfabetização".', methodology: 'DISCOVERY' },
            { code: '2', description: 'Pesquisar como 2-3 organizações promovem a alfabetização na comunidade.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Escrever um parágrafo sobre a importância da alfabetização.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Realizar 3 atividades práticas (ex: ajudar a ler, ler para crianças, material pedagógico, ler para idosos, apresentação).', methodology: 'EXECUTION' },
            { code: '5', description: 'Escolher 3 palavras e explicar como ensinaria seu significado e soletração.', methodology: 'LEADERSHIP' },
        ]
    },
    {
        code: 'AD-007',
        name: 'Resolução de Conflitos',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Explicar como Cristo encorajou pessoas em conflito (João 8, Mateus 18, 1 Reis 3).', methodology: 'DISCOVERY' },
            { code: '2', description: 'Discutir conflitos da juventude (pais, autoestima, amizades).', methodology: 'LEADERSHIP' },
            { code: '3', description: 'Descrever categorias de necessidades humanas com exemplos.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Explicar e praticar escuta ativa em encenação de conflitos.', methodology: 'EXECUTION' },
            { code: '5', description: 'Aplicar método de resolução de conflitos a um exemplo prático.', methodology: 'EXECUTION' },
            { code: '6', description: 'Explicar como encaminhar para conselheiro ou pastor.', methodology: 'LEADERSHIP' },
            { code: '7', description: 'Discutir razões para ajudar amigos e estranhos.', methodology: 'DISCOVERY' },
            { code: '8', description: 'Definir discórdia vs conflitos e identificar causas bíblicas.', methodology: 'DISCOVERY' },
            { code: '9', description: 'Identificar etapas da "bola de neve" em conflitos e soluções.', methodology: 'DISCOVERY' },
        ]
    },
    {
        code: 'AD-008',
        name: 'Reassentamento de Refugiados',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Descrever causas de refugiados e definir refugiado, deslocado interno e imigrante.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Listar necessidades imediatas de um refugiado e descrever sentimentos de mudança.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Pesquisar organizações que auxiliam refugiados.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Descrever como ajudar um refugiado em sua comunidade.', methodology: 'LEADERSHIP' },
            { code: '5', description: 'Entrevistar pessoa de outro país sobre desafios de adaptação.', methodology: 'DISCOVERY' },
            { code: '6', description: 'Elaborar relatório (vídeo, encenação, etc) sobre aprendizado sobre refugiados.', methodology: 'LEADERSHIP' },
            { code: '7', description: 'Discutir importância de buscar soluções para refugiados.', methodology: 'LEADERSHIP' },
        ]
    },
    {
        code: 'AD-009',
        name: 'Desenvolvimento Comunitário',
        area: 'ADRA',
        requirements: [
            { code: '1', description: 'Definir Desenvolvimento Comunitário e diferença entre países desenvolvidos/em desenvolvimento.', methodology: 'DISCOVERY' },
            { code: '2', description: 'Nomear 5 países em desenvolvimento e ações da ADRA.', methodology: 'DISCOVERY' },
            { code: '3', description: 'Ler "O Desejado de Todas as Nações" (cap 70) sobre pobreza.', methodology: 'DISCOVERY' },
            { code: '4', description: 'Descrever uma necessidade do seu bairro que requer atenção.', methodology: 'DISCOVERY' },
            { code: '5', description: 'Elaborar plano de desenvolvimento (plantio, limpeza, pintura) para o grupo.', methodology: 'LEADERSHIP' },
            { code: '6', description: 'Participar 4 horas em atividade prática (ASA, ADRA ou Mutirão Social).', methodology: 'EXECUTION' },
        ]
    }
];

async function main() {
    console.log('🌱 Seeding ADRA Specialties...');

    for (const spec of SPECIALTIES) {
        // 1. Find or Create Specialty
        let specialty = await prisma.specialty.findFirst({ where: { name: spec.name } });

        if (!specialty) {
            console.log(`Creating Specialty: ${spec.code} - ${spec.name}`);
            specialty = await prisma.specialty.create({
                data: { name: spec.name, area: spec.area }
            });
        } else {
            console.log(`Updating Specialty: ${spec.code} - ${spec.name}`);
            specialty = await prisma.specialty.update({
                where: { id: specialty.id },
                data: { area: spec.area }
            });
        }

        // 2. Add Requirements
        for (const req of spec.requirements) {
            const existingReq = await prisma.requirement.findFirst({
                where: {
                    specialtyId: specialty.id,
                    code: req.code
                }
            });

            if (!existingReq) {
                await prisma.requirement.create({
                    data: {
                        code: req.code,
                        description: req.description,
                        specialtyId: specialty.id,
                        methodology: req.methodology as RequirementMethodology,
                    }
                });
            } else {
                await prisma.requirement.update({
                    where: { id: existingReq.id },
                    data: {
                        description: req.description,
                        methodology: req.methodology as RequirementMethodology,
                    }
                });
            }
        }
    }

    console.log('✅ ADRA Specialties Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
