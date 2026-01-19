
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rawData = `
HM-001
Automodelismo


HM-002
Trabalhos com Agulha


HM-003
Desenho e Pintura


HM-004
Música - básico


HM-005
Música - intermediário


HM-006
Música - avançado


HM-007
Letreiros e Cartazes


HM-008
Cestaria


HM-009
Trabalhos em Metal


HM-010
Arte de Oleiro


HM-011
Entalhe em Madeira


HM-012
Ornamentação com Flores


HM-013
Pintura em Vidro


HM-014
Tecelagem


HM-015
Trabalhos em Madeira


HM-016
Aeromodelismo


HM-017
Cultura Indígena


HM-018
Escultura


HM-019
Xilogravura


HM-020
Cerâmica


HM-021
Pintura em Tecido


HM-022
Trabalhos em Feltro


HM-023
Trabalhos em Acrílico


HM-024
Modelagem e Fabricação de Sabão


HM-025
Modelagem e Fabricação de Sabão - avançado


HM-026
Arte de Fazer Esteiras


HM-027
Construção Nativa


HM-028
Ferreomodelismo


HM-029
Herança Cultural


HM-030
Lapidação


HM-031
Modelagem em Gesso


HM-032
Trabalhos em Couro


HM-033
Crochê


HM-034
Crochê - avançado


HM-035
Espaçomodelismo


HM-036
Espaçomodelismo - avançado


HM-037
Tricô


HM-038
Tricô - avançado


HM-039
Trabalhos em Vidro


HM-040
Arte de Trançar


HM-041
Arte de Trançar - avançado


HM-042
Decoração de Bolos


HM-043
Esmaltado em Cobre


HM-044
Esmaltado em Cobre - avançado


HM-045
Estofamento


HM-046
Fabricação de Velas


HM-047
Serigrafia


HM-048
Serigrafia - avançado


HM-049
Arte com Barbante


HM-050
Decoupage


HM-051
Macramê


HM-052
Telhados


HM-053
Cultura Indígena - avançado


HM-054
Bordado em Ponto Cruz


HM-055
Biscuit


HM-056
Patchwork


HM-057
Nautimodelismo


HM-058
Trabalhos em Couro - avançado


HM-059
Gravuras em Vidro


HM-060
Origami


HM-061
Corrida de Carrinhos de Madeira


HM-062
Corrida de Carrinhos de Madeira - avançado


HM-063
Scrapbooking


HM-064
Scrapbooking - avançado


HM-065
Fotografia Digital


HM-066
Genealogia


HM-067
Plástico Canvas


HM-068
Quilling


HM-069
Quilling - avançado


HM-070
Tie-dye


HM-071
Apitos


HM-072
Apitos - avançado


HM-073
Faróis


HM-074
Faróis - avançado


HM-075
Balões de Ar Quente


HM-076
Origami - avançado


HM-077
Embalagem


HM-078
E.V.A.


HM-079
Desenho vetorial


HM-080
Fuxico


HM-081
História em Quadrinhos


HM-082
Ornamentação


HM-083
Papercraft


HM-084
Papel Machê


HM-085
Pirografia


HM-086
Plastimodelismo


HM-087
Violão


HM-088
Violão - avançado


HM-089
Amigurumi


HM-090
Arte Digital


HM-091
Lettering
`;

async function main() {
    console.log('Iniciando correção de especialidades de Habilidades Manuais...');

    // 1. Extrair nomes
    // O padrão é HM-XXX \n Nome
    const lines = rawData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const specialtiesToCreate: string[] = [];

    // Iterar e pegar as linhas que NÃO são códigos (HM-XXX)
    // Assumindo que a linha que segue um código é o nome.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^HM-\d+$/)) {
            // É código, a próxima é nome
            const nextLine = lines[i + 1];
            if (nextLine && !nextLine.match(/^HM-\d+$/)) {
                specialtiesToCreate.push(nextLine);
            }
        }
    }

    console.log(`Encontradas ${specialtiesToCreate.length} especialidades na lista fornecida.`);
    if (specialtiesToCreate.length === 0) {
        console.error('Nenhuma especialidade extraída. Verifique o formato.');
        return;
    }

    // 2. Remover existentes da área
    const areaName = 'Artes e Habilidade Manual';
    console.log(`Removendo especialidades existentes da área: "${areaName}"...`);

    const deleted = await prisma.specialty.deleteMany({
        where: {
            area: areaName
        }
    });
    console.log(`Removidas ${deleted.count} especialidades.`);

    // 3. Inserir novas
    console.log('Inserindo novas especialidades...');
    let createdCount = 0;

    for (const name of specialtiesToCreate) {
        // Verifica se já existe (embora tenhamos deletado a área, pode haver duplicata em outra área com mesmo nome? Não vamos checar isso agora, mas idealmente nome seria unique?)
        // Vamos apenas criar.
        await prisma.specialty.create({
            data: {
                name,
                area: areaName,
                imageUrl: '' // Vazio inicial
            }
        });
        process.stdout.write('.');
        createdCount++;
    }

    console.log(`\n\nSucesso! ${createdCount} especialidades criadas em "${areaName}".`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
