
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Due to the large number of specialties, I'll create them without detailed requirements
// Requirements can be added later as needed

const SPECIALTIES = [
    // ARTES E HABILIDADES MANUAIS (HM)
    { code: 'HM-001', name: 'Aeromodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-002', name: 'Arte com Barbantes', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-003', name: 'Arte de Oleiro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-004', name: 'Arte de Trançar', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-005', name: 'Arte de Trançar - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-006', name: 'Automodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-007', name: 'Balões de Ar Quente', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-008', name: 'Biscuit', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-009', name: 'Bordado em Ponto Cruz', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-010', name: 'Cerâmica', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-011', name: 'Cestaria', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-012', name: 'Construção Nativa', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-013', name: 'Crochê', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-014', name: 'Crochê - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-015', name: 'Cultura Indígena', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-016', name: 'Decoração de Bolos', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-017', name: 'Desenho e Pintura', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-018', name: 'Desenho Vetorial', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-019', name: 'E.V.A.', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-020', name: 'Embalagem', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-021', name: 'Entalhe em Madeira', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-022', name: 'Escultura', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-023', name: 'Espaçomodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-024', name: 'Espaçomodelismo - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-025', name: 'Ferreomodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-026', name: 'Fuxico', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-027', name: 'Gravuras em Vidro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-028', name: 'Herança Cultural', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-029', name: 'História em Quadrinhos', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-030', name: 'Lapidação', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-031', name: 'Letreiros e Cartazes', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-032', name: 'Modelagem e Fabricação de Sabão', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-033', name: 'Modelagem e Fabricação de Sabão - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-034', name: 'Modelagem em Gesso', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-035', name: 'Música', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-036', name: 'Música - Intermediário', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-037', name: 'Música - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-038', name: 'Nautimodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-039', name: 'Origami', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-040', name: 'Origami - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-041', name: 'Ornamentação', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-042', name: 'Ornamentação com Flores', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-043', name: 'Papercraft', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-044', name: 'Papel Machê', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-045', name: 'Patchwork', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-046', name: 'Pintura em Tecido', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-047', name: 'Pintura em Vidro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-048', name: 'Pirografia', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-049', name: 'Plástico Canvas', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-050', name: 'Plastimodelismo', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-051', name: 'Quilling', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-052', name: 'Quilling - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-053', name: 'Tecelagem', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-054', name: 'Tie-Dye', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-055', name: 'Trabalhos com Agulha', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-056', name: 'Trabalhos em Acrílico', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-057', name: 'Trabalhos em Couro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-058', name: 'Trabalhos em Couro - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-059', name: 'Trabalhos em Feltro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-060', name: 'Trabalhos em Madeira', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-061', name: 'Trabalhos em Metal', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-062', name: 'Trabalhos em Vidro', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-063', name: 'Tricô', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-064', name: 'Tricô - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-065', name: 'Violão', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-066', name: 'Violão - Avançado', area: 'Artes e Habilidades Manuais' },
    { code: 'HM-067', name: 'Xilogravura', area: 'Artes e Habilidades Manuais' },

    // ATIVIDADES AGRÍCOLAS (AA)
    { code: 'AA-001', name: 'Avicultura', area: 'Atividades Agrícolas' },
    { code: 'AA-002', name: 'Jardinagem e Horticultura', area: 'Atividades Agrícolas' },
    { code: 'AA-003', name: 'Agricultura Familiar de Subsistência', area: 'Atividades Agrícolas' },
    { code: 'AA-004', name: 'Apicultura', area: 'Atividades Agrícolas' },
    { code: 'AA-005', name: 'Agricultura', area: 'Atividades Agrícolas' },
    { code: 'AA-006', name: 'Pescaria', area: 'Atividades Agrícolas' },
    { code: 'AA-007', name: 'Criação de Gado Leiteiro', area: 'Atividades Agrícolas' },
    { code: 'AA-008', name: 'Pomicultura', area: 'Atividades Agrícolas' },
    { code: 'AA-009', name: 'Pomicultura II - Frutas Pequenas', area: 'Atividades Agrícolas' },
    { code: 'AA-010', name: 'Floricultura', area: 'Atividades Agrícolas' },
    { code: 'AA-011', name: 'Criação de Cavalos', area: 'Atividades Agrícolas' },
    { code: 'AA-012', name: 'Criação de Pombos', area: 'Atividades Agrícolas' },
    { code: 'AA-013', name: 'Criação de Ovelhas', area: 'Atividades Agrícolas' },
    { code: 'AA-014', name: 'Pecuária', area: 'Atividades Agrícolas' },
    { code: 'AA-015', name: 'Criação de Cabras', area: 'Atividades Agrícolas' },
    { code: 'AA-016', name: 'Paisagismo', area: 'Atividades Agrícolas' },

    // ATIVIDADES MISSIONÁRIAS E COMUNITÁRIAS (AM)
    { code: 'AM-001', name: 'Arte de Contar Histórias Cristãs', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-002', name: 'Arte em Fantoches', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-003', name: 'Arte em Fantoches - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-004', name: 'Etnologia Missionária', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-005', name: 'Colportagem', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-006', name: 'Cidadania Cristã', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-007', name: 'Estudo de Línguas - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-008', name: 'Evangelismo Pessoal', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-009', name: 'Liderança Juvenil', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-010', name: 'Testemunho Juvenil', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-011', name: 'Asseio e Cortesia Cristã', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-012', name: 'Vida Familiar', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-013', name: 'Temperança', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-014', name: 'Língua de Sinais', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-015', name: 'Mordomia', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-016', name: 'Aventuras com Cristo', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-017', name: 'Aventuras com Cristo - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-018', name: 'Língua de Sinais - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-019', name: 'Marcação Bíblica', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-020', name: 'Marcação Bíblica - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-021', name: 'Pregador Evangelista', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-022', name: 'Pregador Evangelista - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-023', name: 'Santuário', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-024', name: 'Dramatização Cristã', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-025', name: 'Desfile com Carros Alegóricos', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-026', name: 'Desfile com Carros Alegóricos - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-027', name: 'Pacificador', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-028', name: 'Pacificador - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-029', name: 'Adoração Cristã', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-030', name: 'Arte da Pregação Cristã', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-031', name: 'Arte da Pregação Cristã - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-032', name: 'Arqueologia Bíblica', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-033', name: 'Cerimônias', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-034', name: 'Braile', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-035', name: 'Criacionismo', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-036', name: 'Criacionismo - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-037', name: 'Espírito de Profecia', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-038', name: 'Escatologia', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-039', name: 'Historiador Eclesiástico', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-040', name: 'Evangelismo Web', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-041', name: 'Evangelismo Web - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-043', name: 'Pioneiros Adventistas', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-044', name: 'Patriotismo', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-045', name: 'Sonoplastia', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-046', name: 'Sonoplastia - Avançado', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-047', name: 'Investigador Bíblico I', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-048', name: 'Boa Conduta Escolar', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-049', name: 'Mensageira de Deus', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-050', name: 'Estudo de Línguas', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-051', name: 'Cultura Sul-Americana', area: 'Atividades Missionárias e Comunitárias' },
    { code: 'AM-052', name: 'Apocalipse', area: 'Atividades Missionárias e Comunitárias' },

    // ATIVIDADES PROFISSIONAIS (AP)
    { code: 'AP-001', name: 'Conserto de Sapatos', area: 'Atividades Profissionais' },
    { code: 'AP-002', name: 'Fotografia', area: 'Atividades Profissionais' },
    { code: 'AP-003', name: 'Mecânica Automotiva', area: 'Atividades Profissionais' },
    { code: 'AP-004', name: 'Radioamadorismo', area: 'Atividades Profissionais' },
    { code: 'AP-005', name: 'Datilografia', area: 'Atividades Profissionais' },
    { code: 'AP-006', name: 'Eletricidade', area: 'Atividades Profissionais' },
    { code: 'AP-007', name: 'Carpintaria', area: 'Atividades Profissionais' },
    { code: 'AP-008', name: 'Corte e Costura', area: 'Atividades Profissionais' },
    { code: 'AP-009', name: 'Taquigrafia', area: 'Atividades Profissionais' },
    { code: 'AP-010', name: 'Tipografia', area: 'Atividades Profissionais' },
    { code: 'AP-011', name: 'Marcenaria', area: 'Atividades Profissionais' },
    { code: 'AP-012', name: 'Encadernação', area: 'Atividades Profissionais' },
    { code: 'AP-013', name: 'Alvenaria', area: 'Atividades Profissionais' },
    { code: 'AP-014', name: 'Barbearia', area: 'Atividades Profissionais' },
    { code: 'AP-015', name: 'Aplicação de Papel de Parede', area: 'Atividades Profissionais' },
    { code: 'AP-016', name: 'Contabilidade I', area: 'Atividades Profissionais' },
    { code: 'AP-018', name: 'Canalização', area: 'Atividades Profissionais' },
    { code: 'AP-019', name: 'Jornalismo', area: 'Atividades Profissionais' },
    { code: 'AP-020', name: 'Ofício de Alfaiate', area: 'Atividades Profissionais' },
    { code: 'AP-021', name: 'Pintura de Paredes Exteriores', area: 'Atividades Profissionais' },
    { code: 'AP-022', name: 'Pintura de Paredes Interiores', area: 'Atividades Profissionais' },
    { code: 'AP-023', name: 'Radioeletrônica', area: 'Atividades Profissionais' },
    { code: 'AP-024', name: 'Magistério', area: 'Atividades Profissionais' },
    { code: 'AP-025', name: 'Corte e Costura - Avançado', area: 'Atividades Profissionais' },
    { code: 'AP-026', name: 'Radioamadorismo - Avançado', area: 'Atividades Profissionais' },
    { code: 'AP-027', name: 'Mecânica Automotiva - Avançado', area: 'Atividades Profissionais' },
    { code: 'AP-028', name: 'Mecânica de Pequenos Motores', area: 'Atividades Profissionais' },
    { code: 'AP-029', name: 'Cães - Cuidado e Treinamento', area: 'Atividades Profissionais' },
    { code: 'AP-030', name: 'Serviço Rádio do Cidadão', area: 'Atividades Profissionais' },
    { code: 'AP-031', name: 'Soldagem', area: 'Atividades Profissionais' },
    { code: 'AP-032', name: 'Produção de Vídeo', area: 'Atividades Profissionais' },
    { code: 'AP-033', name: 'Vendas', area: 'Atividades Profissionais' },
    { code: 'AP-034', name: 'Internet', area: 'Atividades Profissionais' },
    { code: 'AP-035', name: 'Internet - Avançado', area: 'Atividades Profissionais' },
    { code: 'AP-036', name: 'Silvicultura', area: 'Atividades Profissionais' },
    { code: 'AP-037', name: 'Administração', area: 'Atividades Profissionais' },
    { code: 'AP-038', name: 'Bandeiras Náuticas', area: 'Atividades Profissionais' },
    { code: 'AP-039', name: 'Blogs', area: 'Atividades Profissionais' },
    { code: 'AP-040', name: 'Biblioteconomia', area: 'Atividades Profissionais' },
    { code: 'AP-041', name: 'Computação I - Básico', area: 'Atividades Profissionais' },
    { code: 'AP-042', name: 'Computação II - Médio', area: 'Atividades Profissionais' },
    { code: 'AP-043', name: 'Computação III - Regular', area: 'Atividades Profissionais' },
    { code: 'AP-044', name: 'Computação IV - Avançado', area: 'Atividades Profissionais' },
    { code: 'AP-045', name: 'Computação V - Especialista', area: 'Atividades Profissionais' },
    { code: 'AP-046', name: 'Código Semafórico', area: 'Atividades Profissionais' },
    { code: 'AP-047', name: 'Comunicações', area: 'Atividades Profissionais' },
];

async function main() {
    console.log('🌱 Seeding ALL specialty categories...\n');
    console.log(`Total specialties to import: ${SPECIALTIES.length}\n`);

    let created = 0;
    let updated = 0;

    for (const spec of SPECIALTIES) {
        let specialty = await prisma.specialty.findFirst({
            where: { name: spec.name }
        });

        if (!specialty) {
            specialty = await prisma.specialty.create({
                data: {
                    name: `${spec.code} - ${spec.name}`,
                    area: spec.area
                }
            });
            created++;
            if (created % 10 === 0) {
                console.log(`✅ Created ${created} specialties...`);
            }
        } else {
            await prisma.specialty.update({
                where: { id: specialty.id },
                data: {
                    name: `${spec.code} - ${spec.name}`,
                    area: spec.area
                }
            });
            updated++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Import complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${SPECIALTIES.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Show summary by category
    const categories = await prisma.specialty.groupBy({
        by: ['area'],
        _count: true,
        where: {
            area: {
                in: [
                    'Artes e Habilidades Manuais',
                    'Atividades Agrícolas',
                    'Atividades Missionárias e Comunitárias',
                    'Atividades Profissionais'
                ]
            }
        }
    });

    console.log('📊 Summary by category:');
    categories.forEach(cat => {
        console.log(`   ${cat.area}: ${cat._count} specialties`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
