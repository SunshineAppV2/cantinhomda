import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Phone, ArrowRight } from 'lucide-react';

export function RegistrationSuccess() {
    const location = useLocation();
    const { clubName, ownerName, union, region, mission } = location.state || {};

    // Support Number (Alex Seabra / Master)
    const SUPPORT_NUMBER = "5591983292005";

    // Construct the WhatsApp message
    const message = `Olá Master!
Acabei de cadastrar meu clube no Cantinho DBV e aguardo liberação.

*Dados do Clube:*
Nome: ${clubName || 'N/A'}
Diretor: ${ownerName || 'N/A'}
Região: ${region || 'N/A'}
Assoc/Missão: ${mission || 'N/A'}
União: ${union || 'N/A'}

Poderia liberar meu acesso?`;

    const whatsappLink = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                        <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm shadow-inner">
                            <CheckCircle className="text-white w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Cadastro Realizado!</h1>
                        <p className="text-green-100 font-medium">Seja bem-vindo ao Cantinho DBV</p>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-orange-800 text-sm text-center">
                        <p className="font-bold mb-1">⚠️ Atenção: Acesso Pendente</p>
                        <p>Para garantir a segurança, seu acesso precisa ser liberado pela diretoria/master.</p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-slate-600 text-center text-sm leading-relaxed">
                            Tudo pronto! Seus dados foram salvos com segurança.
                            Para agilizar a liberação do seu clube <b>{clubName}</b>, envie uma mensagem agora para o Master.
                        </p>

                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
                        >
                            <Phone className="w-5 h-5 fill-current" />
                            <span>LIBERAR ACESSO AGORA</span>
                        </a>

                        <p className="text-[10px] text-center text-slate-400">
                            Ao clicar, você abrirá o WhatsApp com os dados do seu clube já preenchidos.
                        </p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
                        >
                            <span>Ir para tela de Login</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
