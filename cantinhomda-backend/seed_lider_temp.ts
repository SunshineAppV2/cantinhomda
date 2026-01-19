
import { PrismaClient, RequirementMethodology } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIREMENTS = [
    // 1. PRÉ-REQUISITOS
    { code: 'I.1', description: 'Ter no mínimo 16 anos completos para iniciar e 18 para investidura.', area: 'I. PRÉ-REQUISITOS', methodology: 'DISCOVERY' },
    { code: 'I.2', description: 'Ser membro batizado da Igreja Adventista do Sétimo Dia.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.3', description: 'Possuir recomendação da comissão da igreja.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },
    { code: 'I.4', description: 'Ter concluído todas as classes regulares (ou estar cumprindo agrupadas).', area: 'I. PRÉ-REQUISITOS', methodology: 'EXECUTION' },
    { code: 'I.5', description: 'Ser membro ativo do Clube ou Coordenação Distrital/Regional.', area: 'I. PRÉ-REQUISITOS', methodology: 'LEADERSHIP' },

    // 2. CRESCIMENTO PESSOAL E ESPIRITUAL
    { code: 'II.1', description: 'Completar o Ano Bíblico Jovem ou Bíblia em dois anos.', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.2', description: 'Ler "O Libertador" (Ellen White) e apresentar reação à leitura (2 pág).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.3', description: 'Ler livro sobre liderança/desenvolvimento juvenil e apresentar reação (2 pág).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'DISCOVERY' },
    { code: 'II.4', description: 'Completar a especialidade de Arte de Contar Histórias Cristãs.', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'EXECUTION' },
    { code: 'II.5', description: 'Organizar ou participar de projeto evangelístico (Semana Santa, Pequeno Grupo, etc).', area: 'II. CRESCIMENTO PESSOAL E ESPIRITUAL', methodology: 'LEADERSHIP' },

    // 3. FUNDAMENTOS DO ACONSELHAMENTO
    { code: 'III.1', description: 'Participar de Curso de Treinamento de Diretoria (10h) da Associação/Missão.', area: 'III. FUNDAMENTOS DO ACONSELHAMENTO', methodology: 'LEADERSHIP' },

    // 4. LIDERANÇA APLICADA E SERVIÇO AO CLUBE
    { code: 'IV.1', description: 'Ensinar duas especialidades para uma Unidade ou classe.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.2', description: 'Planejar e coordenar um acampamento de clube ou unidade.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.3', description: 'Assistir a 75% das reuniões de diretoria e relatar.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.4', description: 'Participar ou liderar um Pequeno Grupo por 6 meses.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.5', description: 'Liderar por 6 meses: Classe, Projeto DBV por um dia, Feira de Saúde ou Calebe.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.6', description: 'Atuar em cargo de liderança da igreja.', area: 'IV. LIDERANÇA APLICADA', methodology: 'LEADERSHIP' },
    { code: 'IV.7', description: 'Participar em equipe de apoio de evento da Associação/Missão.', area: 'IV. LIDERANÇA APLICADA', methodology: 'EXECUTION' },

    // 5. AVALIAÇÕES
    { code: 'V.1', description: 'Prova do Manual Administrativo do Clube (Nota min. 7,0).', area: 'V. AVALIAÇÕES', methodology: 'DISCOVERY' },
    { code: 'V.2', description: 'Prova "Nisto Cremos" (1-10) (Nota min. 7,0).', area: 'V. AVALIAÇÕES', methodology: 'DISCOVERY' },
    { code: 'V.3', description: 'Ler "Salvação e Serviço" e "Estatuto da Criança e Adolescente".', area: 'V. AVALIAÇÕES', methodology: 'DISCOVERY' },
];

async function main() {
    console.log('🌱 Seeding LÍDER Class Requirements...');

    for (const req of REQUIREMENTS) {
        const existing = await prisma.requirement.findFirst({
            where: {
                code: req.code,
                dbvClass: 'LIDER', // Assuming LIDER is a valid enum value or string match
                clubId: null
            }
        });

        // NOTE: Need to check if 'LIDER' exists in DBVClass enum. 
        // Usually DBVClass is strictly: AMIGO, COMPANHEIRO... GUIA.
        // If 'LIDER' is not in Enum, we might need a workaround or schema update.
        // Let's assume for now user wants them, but if schema blocks, we must panic.
        // Checking schema previously viewed: 
        // enum DBVClass { AMIGO, COMPANHEIRO, PESQUISADOR, PIONEIRO, EXCURSIONISTA, GUIA }
        // It is MISSING 'LIDER'.
        // I MUST UPDATE THE SCHEMA FIRST to include LIDER, LIDER_MASTER, LIDER_MASTER_AVANCADO.

        // BUT 'prossiga' implies doing it. I will check schema first in next step or assume I need to update it.
        // Actually, I should update schema first. But let's write the seed assuming I will update schema.
    }
}
// Wait, I can't write this file if the Enum won't support it in the next step.
// I will instead change my plan to UPDATE SCHEMA first.
