
import React, { useState } from 'react';
import { api } from '../lib/axios';
import { Loader2, Copy, X } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    member?: { id: string, name: string, email: string };
}

export function PaymentModal({ isOpen, onClose, member }: PaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Mensalidade');
    const [loading, setLoading] = useState(false);
    const [pixData, setPixData] = useState<{ qrCodeImageUrl: string, payload: string, referenceId: string } | null>(null);

    if (!isOpen) return null;

    const handleGeneratePix = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/payments/pix', {
                amount: Number(amount),
                description,
                userId: member?.id || 'anon',
                userName: member?.name || 'Membro',
                userEmail: member?.email || 'email@teste.com'
            });
            setPixData(res.data);
            toast.success('QR Code Gerado!');
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao gerar Pix: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (pixData?.payload) {
            navigator.clipboard.writeText(pixData.payload);
            toast.success('Código Copia e Cola copiado!');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-green-600 text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="bg-white text-green-600 rounded p-1 text-xs">PIX</span>
                        Cobrar {member ? member.name.split(' ')[0] : 'Membro'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-green-700 rounded"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6">
                    {!pixData ? (
                        <form onSubmit={handleGeneratePix} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full text-2xl font-bold p-3 border rounded-lg text-center"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !amount}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Gerar QR Code Pix'}
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="p-4 border-4 border-slate-900 rounded-xl bg-white">
                                <img src={pixData.qrCodeImageUrl} alt="Pix QR Code" className="w-48 h-48 mix-blend-multiply" />
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-bold text-lg text-slate-800">R$ {Number(amount).toFixed(2)}</h3>
                                <p className="text-sm text-slate-500">{description}</p>
                            </div>

                            <div className="w-full flex gap-2">
                                <button
                                    onClick={copyToClipboard}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex justify-center items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" /> Copia e Cola
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                                >
                                    Novo Pagamento
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">O pagamento é confirmado automaticamente pelo banco (em breve).</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
