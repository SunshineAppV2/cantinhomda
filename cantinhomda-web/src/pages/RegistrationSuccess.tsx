import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Clock, CreditCard, Unlock, MessageCircle } from 'lucide-react';

export function RegistrationSuccess() {
    const location = useLocation();
    const { clubName, ownerName, union, region, mission, isNewClub, paymentPeriod, clubSize } = location.state || {};

    // Support Number (Alex Seabra / Master)
    const SUPPORT_NUMBER = "5591983292005";

    // Calculate estimated amount
    const months = paymentPeriod === 'TRIMESTRAL' ? 3 : paymentPeriod === 'ANUAL' ? 12 : 1;
    const amount = (Number(clubSize) || 30) * 2 * months;
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

    // Construct the WhatsApp message
    const message = isNewClub
        ? `Olá Master!
Acabei de cadastrar meu clube no Cantinho DBV e aguardo liberação.

*Dados do Clube:*
Nome: ${clubName || 'N/A'}
Diretor: ${ownerName || 'N/A'}
Região: ${region || 'N/A'}
Assoc/Missão: ${mission || 'N/A'}
União: ${union || 'N/A'}
Plano: ${paymentPeriod || 'MENSAL'} - ${clubSize || 30} membros
Valor: ${formattedAmount}

Poderia liberar meu acesso?`
        : `Olá!
Acabei de me cadastrar no Cantinho DBV e aguardo liberação.

Nome: ${ownerName || 'N/A'}
Clube: ${clubName || 'N/A'}

Poderia aprovar meu acesso?`;

    const whatsappLink = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner animate-bounce">
                            <CheckCircle className="text-white w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Cadastro Realizado!</h1>
                        <p className="text-green-100 font-medium">Seja bem-vindo ao Cantinho DBV</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Status Alert */}
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
                        <p className="font-bold mb-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Aguardando Aprovação
                        </p>
                        <p>Seu cadastro foi recebido e será analisado em breve. Você receberá uma notificação quando for aprovado.</p>
                    </div>

                    {/* Timeline - Only for new clubs */}
                    {isNewClub && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-700 text-sm">📋 Próximos Passos</h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">✓</div>
                                    <div>
                                        <p className="font-medium text-slate-700">1. Cadastro Enviado</p>
                                        <p className="text-xs text-slate-500">Seus dados foram salvos com segurança</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <p className="font-medium text-slate-700">Aguardando Aprovação</p>
                                        <p className="text-xs text-slate-500">O Master irá analisar seu cadastro</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                        <CreditCard className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-500">3. Pagamento via PIX</p>
                                        <p className="text-xs text-slate-400">Após aprovação, você receberá os dados do PIX</p>
                                        <p className="text-xs text-green-600 font-medium mt-1">Valor estimado: {formattedAmount}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                        <Unlock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-500">4. Clube Ativado!</p>
                                        <p className="text-xs text-slate-400">Após confirmação do pagamento, seu clube será liberado</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WhatsApp CTA */}
                    <div className="space-y-3 pt-2">
                        <p className="text-slate-600 text-center text-sm">
                            Para agilizar, envie uma mensagem ao Master:
                        </p>

                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>ENVIAR MENSAGEM NO WHATSAPP</span>
                        </a>

                        <p className="text-[10px] text-center text-slate-400">
                            Ao clicar, você abrirá o WhatsApp com os dados já preenchidos
                        </p>
                    </div>

                    {/* Login Link */}
                    <div className="border-t border-slate-100 pt-6">
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
                        >
                            <span>Ir para tela de Login</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            Você poderá fazer login após a aprovação do seu cadastro
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

