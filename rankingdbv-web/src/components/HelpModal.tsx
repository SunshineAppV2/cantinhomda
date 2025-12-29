import { useState } from 'react';
import { ROLE_TRANSLATIONS } from '../pages/members/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import {
    ChevronDown, ChevronUp, Search, HelpCircle, FileText,
    Shield, Users, GraduationCap, Heart
} from 'lucide-react';
import { Modal } from './Modal';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    isVisible: boolean;
}

// --- CONTENT DEFINITIONS ---

// 1. Guides by Role (Contextual Help)
// Maps specific roles to the menu items they can see and how to use them.

const ADMIN_GUIDE = [
    {
        category: 'GESTÃO ADMINISTRATIVA',
        items: [
            {
                title: 'Painel Principal (Dashboard)',
                desc: 'Visão macro dos indicadores do clube.',
                steps: [
                    'Acesse para ver estatísticas em tempo real: total de membros ativos, aniversariantes do mês e saldo financeiro.',
                    'Use o widget "Indique e Ganhe" para copiar seu link de referência exclusivo.',
                    'Monitore o gráfico de frequência para identificar tendências de queda na participação.',
                    'Verifique o card de "Próximo Evento" para não perder prazos de inscrição.'
                ]
            },
            {
                title: 'Secretaria & Atas',
                desc: 'Gestão de documentos oficiais e reuniões de comissão.',
                steps: [
                    'Acesse o menu "Secretaria" > Aba "Atas".',
                    'Clique em "Nova Ata" para registrar uma reunião da D.A. (Diretoria Administrativa).',
                    'Registre os membros presentes e os votos tomados (decisões).',
                    'O sistema gera automaticamente um número sequencial e permite imprimir o documento para assinatura.',
                    'Na aba "Membros", monitore quem está com ficha médica ou cadastro pendente (marcadores vermelhos).'
                ]
            },
            {
                title: 'Gestão de Unidades',
                desc: 'Organização das micro-equipes do clube.',
                steps: [
                    'No menu "Unidades", crie novas unidades masculinas e femininas.',
                    'Defina os Conselheiros e Capitães de cada unidade.',
                    'Use a interface de "arrastar e soltar" para mover desbravadores entre unidades ou adicioná-los a uma unidade pela primeira vez.',
                    'Acompanhe a pontuação de cada unidade no Ranking de Unidades.'
                ]
            }
        ]
    },
    {
        category: 'FINANCEIRO & LOJA',
        items: [
            {
                title: 'Tesouraria',
                desc: 'Controle de fluxo de caixa e mensalidades.',
                steps: [
                    'Na aba "Caixa", lance todas as entradas (ofertas, mensalidades manuais) e saídas (compras, lanches).',
                    'Na aba "Mensalidades", gere o carnê anual para os membros.',
                    'Para cobrar, clique no ícone do WhatsApp ao lado do membro para enviar o link de pagamento ou Chave Pix.',
                    'Dê baixa manualmente se receber em dinheiro, ou aguarde a baixa automática via sistema (se configurado).'
                ]
            }
        ]
    }
];

const COUNSELOR_GUIDE = [
    {
        category: 'MINHA UNIDADE',
        items: [
            {
                title: 'Gestão da Unidade',
                desc: 'Acompanhamento dos seus desbravadores.',
                steps: [
                    'Acesse o menu "Minha Unidade" (ou Unidades).',
                    'Veja a lista dos seus desbravadores e verifique se todos estão com "Seguro Ativo".',
                    'Use o botão "Cantinho da Unidade" para registrar gritos de guerra ou fotos da equipe.',
                    'Monitore o "Ranking da Unidade" para motivar seus liderados.'
                ]
            },
            {
                title: 'Chamada e Inspeção',
                desc: 'Registro semanal obrigatório.',
                steps: [
                    'No menu "Chamada", selecione a reunião atual.',
                    'Marque "Presente" ou "Falta". Se for falta, entre em contato com os pais imediatamente.',
                    'Realize a "Inspeção de Uniforme": pontue itens como lenço, cinto, sapatos engraxados e Bíblia.',
                    'A pontuação da inspeção conta diretamente para o Ranking da Unidade.'
                ]
            },
            {
                title: 'Aprovação de Requisitos',
                desc: 'Validar o progresso dos desbravadores.',
                steps: [
                    'Verifique o menu "Solicitações" ou vá direto no perfil do desbravador.',
                    'Quando um desbravador marca que completou um requisito (ex: "Decorar o Voto"), você deve testá-lo.',
                    'Se aprovado, clique em "Confirmar" no sistema. Isso libera a próxima etapa para ele.',
                    'Se reprovado, clique em "Rejeitar" e deixe um comentário explicando o que falta melhorar.'
                ]
            }
        ]
    }
];

const INSTRUCTOR_GUIDE = [
    {
        category: 'CLASSES E ESPECIALIDADES',
        items: [
            {
                title: 'Ministrar Classes',
                desc: 'Gerenciamento do currículo progressivo.',
                steps: [
                    'Acesse o menu "Classes".',
                    'Selecione a Classe que você leciona (ex: Amigo, Pesquisador).',
                    'Use a função "Aula do Dia" para registrar o que foi ensinado.',
                    'Utilize o "Lançamento em Lote" para aprovar o requisito para toda a turma de uma vez após uma prova ou trabalho.',
                    'Monitore os alunos que estão atrasados no gráfico de progresso.'
                ]
            }
        ]
    }
];

const PATHFINDER_GUIDE = [
    {
        category: 'MEU CLUBE',
        items: [
            {
                title: 'Ranking & Pontos',
                desc: 'Acompanhe sua classificação.',
                steps: [
                    'No menu "Ranking", veja sua posição geral no clube.',
                    'Ganhe pontos por: Presença, Uniforme Completo, Trazer Bíblia e Completar Requisitos.',
                    'Pontos extras podem ser dados por "Espírito de Desbravador" em eventos especiais.'
                ]
            },
            {
                title: 'Caderno Virtual (Requisitos)',
                desc: 'Marque o que você já aprendeu.',
                steps: [
                    'Acesse "Meus Requisitos".',
                    'Leia o que pede cada item da sua Classe (ex: "Ler o livro do ano").',
                    'Quando terminar, marque a caixinha "Concluído".',
                    'Aguarde seu Conselheiro validar. Se ele aprovar, a barra de progresso avança.'
                ]
            }
        ]
    }
];

const PARENT_GUIDE = [
    {
        category: 'ÁREA DOS PAIS',
        items: [
            {
                title: 'Financeiro',
                desc: 'Gestão de pagamentos.',
                steps: [
                    'No painel principal, veja o resumo de "Mensalidades em Aberto".',
                    'Clique para copiar o código Pix e realizar o pagamento.',
                    'O comprovante é gerado automaticamente no sistema após a baixa.'
                ]
            },
            {
                title: 'Calendário e Autorizações',
                desc: 'Fique por dentro das atividades.',
                steps: [
                    'Consulte o "Próximo Evento" para saber data, local e o que levar.',
                    'Para acampamentos, clique em "Autorizar Participação" para assinar digitalmente a ficha de saída.',
                    'Mantenha a "Ficha Médica" do seu filho sempre atualizada com alergias e remédios.'
                ]
            }
        ]
    }
];

// 2. Manuals Library (Public to All)
// Full text manuals for deep reading.

const MANUALS_LIBRARY = [
    {
        id: 'admin',
        title: 'Manual Administrativo',
        icon: Shield,
        color: 'text-blue-600 bg-blue-50',
        description: 'Guia completo para Diretores, Vice-Diretores e Secretários sobre a gestão do clube no sistema.',
        content: `
# Manual Administrativo do Sistema

## 1. Introdução
Este sistema foi desenhado para centralizar toda a gestão do Clube de Desbravadores. Como administrador, você tem acesso total.

## 2. Cadastro de Membros
- **Novos Membros**: Sempre cadastre com e-mail válido. O sistema enviará a senha inicial.
- **Ficha Médica**: É documento legal. Não leve ninguém para acampamento sem a ficha estar "Verde" (completa) no sistema.
- **Transferências**: Ao receber um membro de outro clube, solicite a carta de transferência e cadastre o histórico anterior nas observações.

## 3. Gestão Financeira
- **Transparência**: Todo dinheiro que entra ou sai DEVE ser lançado.
- **Categorias**: Use categorias corretas (ex: "Verba da Igreja", "Inscrições", "Cantina") para que os relatórios trimestrais saiam corretos.
- **Inadimplência**: O sistema bloqueia inscrições em eventos pagos para membros inadimplentes automaticamente (se configurado).

## 4. O sistema de Ranking
- O ranking é calculado toda madrugada (00:00).
- A pontuação é baseada em: Presença (10pts), Uniforme (até 20pts), Requisitos (5pts cada).
- **Fair Play**: Nunca altere pontos manualmente para beneficiar alguém sem justificativa clara registrada em ata.
        `
    },
    {
        id: 'counselor',
        title: 'Manual do Conselheiro',
        icon: Users,
        color: 'text-orange-600 bg-orange-50',
        description: 'Tudo o que o conselheiro precisa saber para liderar sua unidade e avaliar requisitos.',
        content: `
# Manual do Conselheiro

## 1. O Papel do Conselheiro
Você é o pai/mãe da unidade. No sistema, sua responsabilidade é garantir que os dados reflitam a realidade espiritual e técnica dos seus desbravadores.

## 2. Rotina de Reunião
1. **Chegada**: Abra o aplicativo e vá em "Chamada".
2. **Inspeção**: Avalie rigorosamente mas com amor. O uniforme oficial exige emblemas costurados no lugar certo.
3. **Cantinho**: Aproveite o tempo de unidade para abrir os "Requisitos" no tablet/celular e tomar a lição de quem estudou durante a semana.

## 3. Avaliação de Classes
- Não aprove requisitos "por atacado".
- Se o requisito pede "Demonstrar", peça para o desbravador fazer na sua frente.
- Se pede "Relatório", exija o texto escrito ou digitado.
- Você é o filtro de qualidade do clube.
        `
    },
    {
        id: 'instructor',
        title: 'Manual do Instrutor',
        icon: GraduationCap,
        color: 'text-purple-600 bg-purple-50',
        description: 'Diretrizes para o ensino de classes e especialidades.',
        content: `
# Manual do Instrutor

## 1. Planejamento de Aulas
- O sistema permite agendar o cronograma anual.
- Lance as aulas planejadas no menu "Eventos" > "Calendário de Classes".

## 2. Metodologia
- O sistema é apenas o registro. A aula deve ser prática.
- Use a seção "Materiais" da classe para baixar PDFs e PowerPoints oficiais da Divisão.

## 3. Aprovação em Massa
- Ao final de uma especialidade (ex: Felinos), use a "Aprovação em Lote".
- Selecione todos os alunos que passaram na prova prática e clique em "Concluir Especialidade".
- Isso lançará a insígnia virtual no perfil de todos eles instantaneamente.
        `
    },
    {
        id: 'parents',
        title: 'Guia dos Pais',
        icon: Heart,
        color: 'text-red-600 bg-red-50',
        description: 'Como acompanhar a vida do seu filho no clube e facilitar a comunicação.',
        content: `
# Guia dos Pais e Responsáveis

## 1. Acompanhamento
- O maior incentivo vem de casa. Abra o aplicativo com seu filho e peça para ele mostrar as "Medalhas" e "Pontos" que ele ganhou.
- Verifique se ele tem requisitos pendentes para investir na próxima cerimônia.

## 2. Segurança e Saúde
- Mantenha o tipo sanguíneo e alergias atualizados. Em caso de emergência no acampamento, esses são os dados que o médico consultará no sistema.

## 3. Pagamentos
- O clube é sem fins lucrativos. As mensalidades pagam seguro, materiais e manutenção.
- O sistema aceita Pix. Ao pagar, o recibo fica salvo na sua conta para sempre.
        `
    }
];


export function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user } = useAuth();
    const isAdmin = ['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR'].includes(user?.role || '');

    const [activeTab, setActiveTab] = useState<'GUIDE' | 'MANUALS' | 'FAQ'>('GUIDE');
    const [searchTerm, setSearchTerm] = useState('');
    const [manualSearchTerm, setManualSearchTerm] = useState('');

    // FAQ State
    const [faqOpenItems, setFaqOpenItems] = useState<string[]>([]);

    // Manual State
    const [selectedManual, setSelectedManual] = useState<typeof MANUALS_LIBRARY[0] | null>(null);

    const { data: faqs = [], isLoading } = useQuery<FAQ[]>({
        queryKey: ['faqs', isAdmin],
        queryFn: async () => {
            const params = isAdmin ? '?all=true' : '';
            const response = await api.get(`/faqs${params}`);
            return response.data;
        },
        enabled: isOpen && activeTab === 'FAQ'
    });

    const toggleFaqItem = (id: string) => {
        setFaqOpenItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Determine User Guide Content based on Role
    let currentGuide = PATHFINDER_GUIDE; // Default
    if (isAdmin) currentGuide = ADMIN_GUIDE;
    else if (user?.role === 'COUNSELOR') currentGuide = COUNSELOR_GUIDE;
    else if (user?.role === 'INSTRUCTOR') currentGuide = INSTRUCTOR_GUIDE;
    else if (user?.role === 'PARENT') currentGuide = PARENT_GUIDE;

    // Filter Manuals
    const filteredManuals = MANUALS_LIBRARY.filter(m =>
        m.title.toLowerCase().includes(manualSearchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(manualSearchTerm.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Central de Ajuda & Manuais">
            <div className="space-y-4 h-[75vh] flex flex-col">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => { setActiveTab('GUIDE'); setSelectedManual(null); }}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'GUIDE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Guia do Menu
                    </button>
                    <button
                        onClick={() => { setActiveTab('MANUALS'); setSelectedManual(null); }}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'MANUALS' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Biblioteca de Manuais
                    </button>
                    <button
                        onClick={() => { setActiveTab('FAQ'); setSelectedManual(null); }}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'FAQ' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Dúvidas (FAQ)
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden relative">

                    {/* TAB 1: GUIDE (Contextual) */}
                    {activeTab === 'GUIDE' && (
                        <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-6 pt-2">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 flex items-start gap-3">
                                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-800 font-bold">Olá, {user?.name.split(' ')[0]}!</p>
                                    <p className="text-xs text-blue-600">
                                        Identificamos seu perfil como <span className="font-bold">{ROLE_TRANSLATIONS[user?.role || ''] || user?.role}</span>.
                                        Abaixo está o guia rápido dos menus que você tem acesso.
                                    </p>
                                </div>
                            </div>

                            {currentGuide.map((section) => (
                                <div key={section.category}>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">{section.category}</h3>
                                    <div className="space-y-3">
                                        {section.items.map((item) => (
                                            <div key={item.title} className="bg-white border border-slate-100 rounded-xl p-4 hover:border-blue-200 transition-colors shadow-sm">
                                                <h4 className="font-bold text-slate-800 text-sm mb-1 text-lg flex items-center gap-2">
                                                    {item.title}
                                                </h4>
                                                <p className="text-sm text-slate-600 mb-4 italic">{item.desc}</p>
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wide flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> COMO USAR:
                                                    </p>
                                                    <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                                                        {item.steps.map((step, idx) => (
                                                            <li key={idx} className="ml-4">
                                                                <div className="absolute w-2 h-2 bg-blue-500 rounded-full -left-1 mt-1.5 border border-white"></div>
                                                                <span className="text-sm text-slate-700 leading-relaxed block">{step}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB 2: MANUALS (Library) */}
                    {activeTab === 'MANUALS' && (
                        <div className="h-full flex flex-col">
                            {!selectedManual ? (
                                <>
                                    <div className="mb-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar manual..."
                                                value={manualSearchTerm}
                                                onChange={(e) => setManualSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4">
                                        {filteredManuals.map((manual) => (
                                            <div
                                                key={manual.id}
                                                onClick={() => setSelectedManual(manual)}
                                                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-orange-300 transition-all group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-3 rounded-lg ${manual.color}`}>
                                                        <manual.icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">
                                                            {manual.title}
                                                        </h3>
                                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                                            {manual.description}
                                                        </p>
                                                        <span className="mt-3 inline-block text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                            Ler Manual Completo →
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 p-2 border-b border-slate-100 mb-2">
                                        <button
                                            onClick={() => setSelectedManual(null)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold flex items-center gap-1"
                                        >
                                            ← Voltar para Lista
                                        </button>
                                        <h3 className="font-bold text-slate-800 ml-auto pr-2">{selectedManual.title}</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50 rounded-lg mx-2 mb-2">
                                        <div className="prose prose-sm prose-slate max-w-none">
                                            {selectedManual.content.split('\n').map((line, i) => {
                                                if (line.trim().startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-blue-900 mb-4 mt-6 pb-2 border-b border-blue-200">{line.replace('# ', '')}</h1>;
                                                if (line.trim().startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-slate-800 mb-3 mt-5">{line.replace('## ', '')}</h2>;
                                                if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 text-slate-700 mb-1">{line.replace('- ', '')}</li>;
                                                if (line.trim() === '') return <br key={i} />;
                                                return <p key={i} className="text-slate-600 mb-2 leading-relaxed">{line}</p>;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: FAQ */}
                    {activeTab === 'FAQ' && (
                        <div className="h-full flex flex-col">
                            <div className="relative sticky top-0 bg-white pb-2 z-10">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar nas perguntas frequentes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pt-2">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-sm">Carregando perguntas...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {faqs.filter(f =>
                                            f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            f.answer.toLowerCase().includes(searchTerm.toLowerCase())
                                        ).map(faq => (
                                            <div key={faq.id} className="border border-slate-200 rounded-xl overflow-hidden hover:border-green-300 transition-colors">
                                                <button onClick={() => toggleFaqItem(faq.id)} className="w-full text-left p-4 font-bold text-sm flex justify-between items-center bg-white hover:bg-slate-50 transition-colors text-slate-700">
                                                    {faq.question}
                                                    {faqOpenItems.includes(faq.id) ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                </button>
                                                {faqOpenItems.includes(faq.id) && (
                                                    <div className="p-4 text-sm text-slate-600 bg-slate-50 border-t border-slate-100 leading-relaxed">
                                                        {faq.answer}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {faqs.length === 0 && !isLoading && <p className="text-center text-slate-400 py-8 text-sm">Nenhuma pergunta encontrada.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
}
