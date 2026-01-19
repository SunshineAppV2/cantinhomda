
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // 1. PRÉ-REQUISITOS
    { code: 'I.1', description: 'Ter no mínimo 20 anos completos.', area: 'I. PRÉ-REQUISITOS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser investido em Líder Master e ter 1 ano de experiência.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Ser membro ativo da Igreja Adventista e do Clube.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.4', description: 'Possuir recomendação da comissão da igreja.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.5', description: 'Sem condenação judicial/disciplina eclesiástica.', area: 'I. PRÉ-REQUISITOS', methodology: 'DISCOVERY' },

    // 2. CRESCIMENTO PESSOAL E ESPIRITUAL
    { code: 'II.1', description: 'Completar o Ano Bíblico (Jovem ou áudio).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler "A Ciência do Bom Viver" (caps selecionados) e apresentar reação (1 pág).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Estudar "Nisto Cremos" (11-20) e prestar exame (Nota min. 7,0).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Conduzir estudos bíblicos (Família não adventista ou Classe Bíblica para batismo).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'LEADERSHIP' },

    // 3. SERVIÇO AO CLUBE
    { code: 'III.1', description: 'Ensinar uma classe regular e uma avançada durante um ano.', area: 'III. SERVIÇO AO CLUBE', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Servir na diretoria (Conselheiro, Diretor, etc.) por 8 meses.', area: 'III. SERVIÇO AO CLUBE', methodology: 'LEADERSHIP' },

    // 4. CAPACITAÇÃO APLICADA
    { code: 'IV.1', description: 'Preparar cronograma detalhado da história da IASD (foco Divisão/União/Campo) e apresentar.', area: 'IV. CAPACITAÇÃO APLICADA', methodology: 'DISCOVERY' },
    { code: 'IV.2', description: 'Ler um livro de duas áreas específicas e apresentar reações.', area: 'IV. CAPACITAÇÃO APLICADA', methodology: 'DISCOVERY' },

    // 5. DISCIPULADO E EVANGELISMO
    { code: 'V.1', description: 'Fazer o mestrado em Testificação.', area: 'V. DISCIPULADO E EVANGELISMO', methodology: 'EXECUTION' },
    { code: 'V.2', description: 'Participar ativamente de equipe da semana de oração jovem.', area: 'V. DISCIPULADO E EVANGELISMO', methodology: 'LEADERSHIP' },
    { code: 'V.3', description: 'Dar um estudo bíblico completo.', area: 'V. DISCIPULADO E EVANGELISMO', methodology: 'LEADERSHIP' },
    { code: 'V.4', description: 'Preparar e acompanhar uma pessoa até o batismo (fruto do trabalho).', area: 'V. DISCIPULADO E EVANGELISMO', methodology: 'LEADERSHIP' },

    // 6. HABILIDADES DE CAMPING
    { code: 'VI.1', description: 'Organizar e liderar expedição (Montanha/Ciclismo/Água, etc.) com relatório.', area: 'VI. HABILIDADES DE CAMPING', methodology: 'EXECUTION' },
    { code: 'VI.2', description: 'Construir 4 móveis campestres em tamanho real (6 nós cada).', area: 'VI. HABILIDADES DE CAMPING', methodology: 'EXECUTION' },
    { code: 'VI.3', description: 'Desenhar e executar 2 trilhas de eventos (10 atividades cada).', area: 'VI. HABILIDADES DE CAMPING', methodology: 'EXECUTION' },
    { code: 'VI.4', description: 'Dirigir cerimônia de fogo do conselho criativa.', area: 'VI. HABILIDADES DE CAMPING', methodology: 'LEADERSHIP' },

    // 7. LIDERANÇA APLICADA (Área 1 Teorica ou Área 2 Prática)
    // Selecting a generic requirement that encompasses the choice
    { code: 'VII.1', description: 'Completar Área 1 (Teórica/Produção Material) OU Área 2 (Prática/Fundar Clube).', area: 'VII. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
];

async function main() {
    console.log('🌱 Seeding LÍDER MASTER AVANÇADO Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'LIDER_MASTER_AVANCADO',
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
                    ageGroup: 'SENIOR' // 20+
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'LIDER_MASTER_AVANCADO',
                    methodology: req.methodology as RequirementMethodology,
                    ageGroup: 'SENIOR',
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
