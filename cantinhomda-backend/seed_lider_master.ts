
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // 1. PRÉ-REQUISITOS
    { code: 'I.1', description: 'Ter no mínimo 18 anos completos.', area: 'I. PRÉ-REQUISITOS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser invetido na Classe de Líder.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Ter, no mínimo, um ano de experiência como líder investido.', area: 'I. PRÉ-REQUISITOS', methodology: 'EXECUTION' },
    { code: 'I.4', description: 'Ser membro ativo da Igreja Adventista e do Clube/Coordenação.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.5', description: 'Possuir recomendação da comissão da igreja.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },

    // 2. CRESCIMENTO PESSOAL E ESPIRITUAL
    { code: 'II.1', description: 'Completar o Ano Bíblico Jovem (ou áudio).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler "A Ciência do Bom Viver" (caps selecionados) e apresentar reação (1 pág).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Estudar "Nisto Cremos" (11-20) e prestar exame (Nota min. 7,0).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Conduzir série de estudos bíblicos (Família ou Classe Bíblica).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'LEADERSHIP' },
    { code: 'II.5', description: 'Apresentar certificado de Curso de Treinamento de Diretoria – Nível Avançado.', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'LEADERSHIP' },
    { code: 'II.6', description: 'Participar do curso de liderança para Líder Master.', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'LEADERSHIP' },

    // 3. SERVIÇO AO CLUBE
    { code: 'III.1', description: 'Ensinar uma classe regular e uma avançada durante um ano.', area: 'III. SERVIÇO AO CLUBE', methodology: 'LEADERSHIP' },
    { code: 'III.2', description: 'Servir na diretoria (Conselheiro, Diretor, etc.) por 8 meses.', area: 'III. SERVIÇO AO CLUBE', methodology: 'LEADERSHIP' },

    // 4. CAPACITAÇÃO APLICADA
    { code: 'IV.1', description: 'Preparar cronograma detalhado da história da IASD (foco Divisão/União/Campo) e apresentar.', area: 'IV. CAPACITAÇÃO APLICADA', methodology: 'DISCOVERY' },
    { code: 'IV.2', description: 'Ler um livro de duas áreas específicas (Liderança, Recriação, etc) e apresentar reações.', area: 'IV. CAPACITAÇÃO APLICADA', methodology: 'DISCOVERY' },
];

async function main() {
    console.log('🌱 Seeding LÍDER MASTER Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'LIDER_MASTER',
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
                    ageGroup: 'SENIOR' // 18+
                }
            });
        } else {
            console.log(`Creating ${req.code}...`);
            await prisma.requirement.create({
                data: {
                    code: req.code,
                    description: req.description,
                    area: req.area,
                    dbvClass: 'LIDER_MASTER',
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
