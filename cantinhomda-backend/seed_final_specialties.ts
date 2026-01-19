
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPECIALTIES = [
    // ATIVIDADES RECREATIVAS (AR) - 42 especialidades
    { code: 'AR-001', name: 'Arte de Acampar', area: 'Atividades Recreativas' },
    { code: 'AR-002', name: 'Cultura Física', area: 'Atividades Recreativas' },
    { code: 'AR-003', name: 'Natação Principiante I', area: 'Atividades Recreativas' },
    { code: 'AR-004', name: 'Natação Principiante II', area: 'Atividades Recreativas' },
    { code: 'AR-005', name: 'Natação Intermediário I', area: 'Atividades Recreativas' },
    { code: 'AR-006', name: 'Natação Intermediário II', area: 'Atividades Recreativas' },
    { code: 'AR-007', name: 'Natação - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-008', name: 'Salvamento de Afogados', area: 'Atividades Recreativas' },
    { code: 'AR-009', name: 'Ciclismo', area: 'Atividades Recreativas' },
    { code: 'AR-010', name: 'Excursionismo Pedestre', area: 'Atividades Recreativas' },
    { code: 'AR-011', name: 'Filatelia', area: 'Atividades Recreativas' },
    { code: 'AR-012', name: 'Filatelia - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-013', name: 'Esqui Downhill', area: 'Atividades Recreativas' },
    { code: 'AR-014', name: 'Arco e Flecha', area: 'Atividades Recreativas' },
    { code: 'AR-015', name: 'Caiaque', area: 'Atividades Recreativas' },
    { code: 'AR-016', name: 'Canoagem', area: 'Atividades Recreativas' },
    { code: 'AR-017', name: 'Numismática', area: 'Atividades Recreativas' },
    { code: 'AR-018', name: 'Navegação', area: 'Atividades Recreativas' },
    { code: 'AR-019', name: 'Vela', area: 'Atividades Recreativas' },
    { code: 'AR-020', name: 'Fogueiras e Cozinha ao Ar Livre', area: 'Atividades Recreativas' },
    { code: 'AR-021', name: 'Mapa e Bússola', area: 'Atividades Recreativas' },
    { code: 'AR-022', name: 'Pioneirismo', area: 'Atividades Recreativas' },
    { code: 'AR-023', name: 'Remo', area: 'Atividades Recreativas' },
    { code: 'AR-024', name: 'Vida Silvestre', area: 'Atividades Recreativas' },
    { code: 'AR-025', name: 'Equitação', area: 'Atividades Recreativas' },
    { code: 'AR-026', name: 'Esqui Aquático', area: 'Atividades Recreativas' },
    { code: 'AR-027', name: 'Esqui Aquático - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-028', name: 'Mergulho Livre', area: 'Atividades Recreativas' },
    { code: 'AR-029', name: 'Salvamento de Afogados - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-030', name: 'Saltos Ornamentais', area: 'Atividades Recreativas' },
    { code: 'AR-031', name: 'Mergulho Autônomo', area: 'Atividades Recreativas' },
    { code: 'AR-032', name: 'Mergulho Autônomo - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-033', name: 'Acampamento em Baixas Temperaturas', area: 'Atividades Recreativas' },
    { code: 'AR-034', name: 'Escalada', area: 'Atividades Recreativas' },
    { code: 'AR-035', name: 'Escalada - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-036', name: 'Escalada em Árvores', area: 'Atividades Recreativas' },
    { code: 'AR-037', name: 'Exploração de Cavernas', area: 'Atividades Recreativas' },
    { code: 'AR-038', name: 'Exploração de Cavernas - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-039', name: 'Barco a Motor', area: 'Atividades Recreativas' },
    { code: 'AR-040', name: 'Nós e Amarras', area: 'Atividades Recreativas' },
    { code: 'AR-041', name: 'Arco e Flecha - Avançado', area: 'Atividades Recreativas' },
    { code: 'AR-042', name: 'Ciclismo - Avançado', area: 'Atividades Recreativas' },

    // CIÊNCIA E SAÚDE (CS) - 43 especialidades
    { code: 'CS-001', name: 'Saúde e Cura', area: 'Ciência e Saúde' },
    { code: 'CS-002', name: 'Química', area: 'Ciência e Saúde' },
    { code: 'CS-003', name: 'Primeiros Socorros - Básico', area: 'Ciência e Saúde' },
    { code: 'CS-004', name: 'Primeiros Socorros - Intermediário', area: 'Ciência e Saúde' },
    { code: 'CS-005', name: 'Primeiros Socorros - Avançado', area: 'Ciência e Saúde' },
    { code: 'CS-006', name: 'Enfermagem Básica', area: 'Ciência e Saúde' },
    { code: 'CS-007', name: 'Ótica', area: 'Ciência e Saúde' },
    { code: 'CS-008', name: 'Nutrição', area: 'Ciência e Saúde' },
    { code: 'CS-009', name: 'Alerta Vermelho', area: 'Ciência e Saúde' },
    { code: 'CS-010', name: 'Nutrição - Avançado', area: 'Ciência e Saúde' },
    { code: 'CS-011', name: 'Reanimação Cardiopulmonar', area: 'Ciência e Saúde' },
    { code: 'CS-012', name: 'Resgate Básico', area: 'Ciência e Saúde' },
    { code: 'CS-013', name: 'Física', area: 'Ciência e Saúde' },
    { code: 'CS-014', name: 'Microscopia', area: 'Ciência e Saúde' },
    { code: 'CS-015', name: 'Digestão', area: 'Ciência e Saúde' },
    { code: 'CS-016', name: 'Ossos, Músculos e Articulações', area: 'Ciência e Saúde' },
    { code: 'CS-017', name: 'Sistema Nervoso', area: 'Ciência e Saúde' },
    { code: 'CS-018', name: 'Sangue e Defesas do Corpo', area: 'Ciência e Saúde' },
    { code: 'CS-019', name: 'Hereditariedade', area: 'Ciência e Saúde' },
    { code: 'CS-020', name: 'Coração e Circulação', area: 'Ciência e Saúde' },
    { code: 'CS-021', name: 'Bioquímica', area: 'Ciência e Saúde' },
    { code: 'CS-022', name: 'Bioquímica - Avançado', area: 'Ciência e Saúde' },
    { code: 'CS-023', name: 'Higiene Oral', area: 'Ciência e Saúde' },
    { code: 'CS-024', name: 'Higiene Oral - Avançado', area: 'Ciência e Saúde' },
    { code: 'CS-025', name: 'Metodologia de Estudo', area: 'Ciência e Saúde' },
    { code: 'CS-026', name: 'Prevenção de Doenças Tropicais', area: 'Ciência e Saúde' },
    { code: 'CS-027', name: 'Patrimônio Histórico', area: 'Ciência e Saúde' },
    { code: 'CS-028', name: 'Saúde Mental', area: 'Ciência e Saúde' },
    { code: 'CS-029', name: 'Sexualidade Humana', area: 'Ciência e Saúde' },
    { code: 'CS-030', name: 'Sistema Respiratório', area: 'Ciência e Saúde' },
    { code: 'CS-031', name: 'Habilidades em Matemática I', area: 'Ciência e Saúde' },
    { code: 'CS-032', name: 'Habilidades em Matemática II', area: 'Ciência e Saúde' },
    { code: 'CS-033', name: 'Habilidades em Matemática III', area: 'Ciência e Saúde' },
    { code: 'CS-034', name: 'Habilidades em Matemática IV', area: 'Ciência e Saúde' },
    { code: 'CS-035', name: 'Biossegurança', area: 'Ciência e Saúde' },
    { code: 'CS-036', name: 'Anatomia Humana Básica', area: 'Ciência e Saúde' },
    { code: 'CS-037', name: 'Cientistas Cristãos', area: 'Ciência e Saúde' },
    { code: 'CS-038', name: 'Experimentos Científicos', area: 'Ciência e Saúde' },
    { code: 'CS-039', name: 'Plantas Medicinais', area: 'Ciência e Saúde' },
    { code: 'CS-040', name: 'Remédios da Natureza', area: 'Ciência e Saúde' },
    { code: 'CS-041', name: 'Trânsito Seguro', area: 'Ciência e Saúde' },
    { code: 'CS-042', name: 'Vacinas', area: 'Ciência e Saúde' },
    { code: 'CS-043', name: 'Zoonoses', area: 'Ciência e Saúde' },

    // ESTUDOS DA NATUREZA (EN) - 53 especialidades
    { code: 'EN-001', name: 'Aranhas', area: 'Estudos da Natureza' },
    { code: 'EN-002', name: 'Astronomia', area: 'Estudos da Natureza' },
    { code: 'EN-003', name: 'Aves', area: 'Estudos da Natureza' },
    { code: 'EN-004', name: 'Aves Domésticas', area: 'Estudos da Natureza' },
    { code: 'EN-005', name: 'Flores', area: 'Estudos da Natureza' },
    { code: 'EN-006', name: 'Árvores', area: 'Estudos da Natureza' },
    { code: 'EN-007', name: 'Insetos', area: 'Estudos da Natureza' },
    { code: 'EN-008', name: 'Mariposas e Borboletas', area: 'Estudos da Natureza' },
    { code: 'EN-009', name: 'Fungos', area: 'Estudos da Natureza' },
    { code: 'EN-010', name: 'Mamíferos', area: 'Estudos da Natureza' },
    { code: 'EN-011', name: 'Répteis', area: 'Estudos da Natureza' },
    { code: 'EN-012', name: 'Rochas e Minerais', area: 'Estudos da Natureza' },
    { code: 'EN-013', name: 'Rochas e Minerais - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-014', name: 'Moluscos', area: 'Estudos da Natureza' },
    { code: 'EN-015', name: 'Cactos', area: 'Estudos da Natureza' },
    { code: 'EN-016', name: 'Climatologia', area: 'Estudos da Natureza' },
    { code: 'EN-017', name: 'Fósseis', area: 'Estudos da Natureza' },
    { code: 'EN-018', name: 'Samambaias', area: 'Estudos da Natureza' },
    { code: 'EN-019', name: 'Arbustos', area: 'Estudos da Natureza' },
    { code: 'EN-020', name: 'Aves de Estimação', area: 'Estudos da Natureza' },
    { code: 'EN-021', name: 'Gramíneas', area: 'Estudos da Natureza' },
    { code: 'EN-022', name: 'Peixes', area: 'Estudos da Natureza' },
    { code: 'EN-023', name: 'Anfíbios', area: 'Estudos da Natureza' },
    { code: 'EN-024', name: 'Felinos', area: 'Estudos da Natureza' },
    { code: 'EN-025', name: 'Rebanhos Domésticos', area: 'Estudos da Natureza' },
    { code: 'EN-026', name: 'Astronomia - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-027', name: 'Aves - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-028', name: 'Climatologia - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-029', name: 'Flores - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-030', name: 'Insetos - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-031', name: 'Mamíferos - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-032', name: 'Moluscos - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-033', name: 'Árvores - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-034', name: 'Cães', area: 'Estudos da Natureza' },
    { code: 'EN-035', name: 'Areia', area: 'Estudos da Natureza' },
    { code: 'EN-036', name: 'Algas', area: 'Estudos da Natureza' },
    { code: 'EN-037', name: 'Cetáceos', area: 'Estudos da Natureza' },
    { code: 'EN-038', name: 'Ervas', area: 'Estudos da Natureza' },
    { code: 'EN-039', name: 'Eucaliptos', area: 'Estudos da Natureza' },
    { code: 'EN-040', name: 'Sementes', area: 'Estudos da Natureza' },
    { code: 'EN-041', name: 'Sementes - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-042', name: 'Orquídeas', area: 'Estudos da Natureza' },
    { code: 'EN-043', name: 'Plantas Silvestres Comestíveis', area: 'Estudos da Natureza' },
    { code: 'EN-044', name: 'Ecologia', area: 'Estudos da Natureza' },
    { code: 'EN-045', name: 'Ecologia - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-046', name: 'Conservação Ambiental', area: 'Estudos da Natureza' },
    { code: 'EN-047', name: 'Geologia', area: 'Estudos da Natureza' },
    { code: 'EN-048', name: 'Geologia - Avançado', area: 'Estudos da Natureza' },
    { code: 'EN-049', name: 'Plantas Caseiras', area: 'Estudos da Natureza' },
    { code: 'EN-050', name: 'Rastreio de Animais', area: 'Estudos da Natureza' },
    { code: 'EN-051', name: 'Mamíferos Marinhos', area: 'Estudos da Natureza' },
    { code: 'EN-052', name: 'Pequenos Mamíferos de Estimação', area: 'Estudos da Natureza' },
    { code: 'EN-053', name: 'Cactos - Avançado', area: 'Estudos da Natureza' },

    // HABILIDADES DOMÉSTICAS (HD) - 13 especialidades
    { code: 'HD-001', name: 'Arte Culinária', area: 'Habilidades Domésticas' },
    { code: 'HD-002', name: 'Técnicas de Lavanderia', area: 'Habilidades Domésticas' },
    { code: 'HD-003', name: 'Cuidado de Bebês', area: 'Habilidades Domésticas' },
    { code: 'HD-004', name: 'Cuidados da Casa', area: 'Habilidades Domésticas' },
    { code: 'HD-005', name: 'Técnicas de Fazer Conserva', area: 'Habilidades Domésticas' },
    { code: 'HD-006', name: 'Orçamento Familiar', area: 'Habilidades Domésticas' },
    { code: 'HD-007', name: 'Panificação', area: 'Habilidades Domésticas' },
    { code: 'HD-008', name: 'Arte Culinária - Avançado', area: 'Habilidades Domésticas' },
    { code: 'HD-009', name: 'Costura Básica', area: 'Habilidades Domésticas' },
    { code: 'HD-010', name: 'Comidas Típicas', area: 'Habilidades Domésticas' },
    { code: 'HD-011', name: 'Congelamento de Alimentos', area: 'Habilidades Domésticas' },
    { code: 'HD-012', name: 'Desidratação de Alimentos', area: 'Habilidades Domésticas' },
    { code: 'HD-013', name: 'Produção de Pizza', area: 'Habilidades Domésticas' },

    // MESTRADOS (M) - 21 mestrados
    { code: 'M-001', name: 'Mestrado em ADRA', area: 'Mestrados' },
    { code: 'M-002', name: 'Mestrado em Aquática', area: 'Mestrados' },
    { code: 'M-003', name: 'Mestrado em Artes e Habilidades Manuais', area: 'Mestrados' },
    { code: 'M-004', name: 'Mestrado em Atividades Agrícolas', area: 'Mestrados' },
    { code: 'M-005', name: 'Mestrado em Atividades Profissionais', area: 'Mestrados' },
    { code: 'M-006', name: 'Mestrado em Atividades Recreativas', area: 'Mestrados' },
    { code: 'M-007', name: 'Mestrado em Botânica', area: 'Mestrados' },
    { code: 'M-008', name: 'Mestrado em Ciência e Tecnologia', area: 'Mestrados' },
    { code: 'M-009', name: 'Mestrado das Crônicas Hunter', area: 'Mestrados' },
    { code: 'M-010', name: 'Mestrado em Ecologia', area: 'Mestrados' },
    { code: 'M-011', name: 'Mestrado em Ensinos Bíblicos', area: 'Mestrados' },
    { code: 'M-012', name: 'Mestrado em Esportes', area: 'Mestrados' },
    { code: 'M-013', name: 'Mestrado em Família, Origens e Herança', area: 'Mestrados' },
    { code: 'M-014', name: 'Mestrado em Habilidades Domésticas', area: 'Mestrados' },
    { code: 'M-015', name: 'Mestrado em Habilidades Vocacionais', area: 'Mestrados' },
    { code: 'M-016', name: 'Mestrado dos Heróis da Bíblia', area: 'Mestrados' },
    { code: 'M-017', name: 'Mestrado em Natureza', area: 'Mestrados' },
    { code: 'M-018', name: 'Mestrado em Saúde', area: 'Mestrados' },
    { code: 'M-019', name: 'Mestrado em Testificação', area: 'Mestrados' },
    { code: 'M-020', name: 'Mestrado em Vida Campestre', area: 'Mestrados' },
    { code: 'M-021', name: 'Mestrado em Zoologia', area: 'Mestrados' },
];

async function main() {
    console.log('🌱 Seeding FINAL specialty categories...\n');
    console.log(`Total specialties to import: ${SPECIALTIES.length}\n`);

    let created = 0;
    let updated = 0;

    for (const spec of SPECIALTIES) {
        let specialty = await prisma.specialty.findFirst({
            where: { name: `${spec.code} - ${spec.name}` }
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
        _count: true
    });

    console.log('📊 GRAND TOTAL - All Specialty Categories:');
    categories.forEach(cat => {
        console.log(`   ${cat.area}: ${cat._count} specialties`);
    });

    const totalCount = await prisma.specialty.count();
    console.log(`\n🎉 TOTAL SPECIALTIES IN SYSTEM: ${totalCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
