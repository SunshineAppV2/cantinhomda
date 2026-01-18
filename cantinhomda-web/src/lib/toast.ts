import { toast, Toaster } from 'sonner';

/**
 * Sistema Unificado de Toast Notifications
 * 
 * Baseado em Sonner com estilos customizados e consistentes
 * Substitui alerts e confirms do navegador
 */

// Estilos base para todos os toasts
const baseStyle = {
    borderRadius: '1rem',
    padding: '1rem 1.5rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
};

/**
 * Toast de Sucesso
 * Uso: showToast.success('Operação concluída!')
 */
const success = (message: string, description?: string) => {
    return toast.success(message, {
        duration: 3000,
        description,
        style: {
            ...baseStyle,
            background: '#10b981',
            color: '#fff',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
        },
    });
};

/**
 * Toast de Erro
 * Uso: showToast.error('Algo deu errado!')
 */
const error = (message: string, description?: string) => {
    return toast.error(message, {
        duration: 4000, // Erros ficam mais tempo
        description,
        style: {
            ...baseStyle,
            background: '#ef4444',
            color: '#fff',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
        },
    });
};

/**
 * Toast de Aviso
 * Uso: showToast.warning('Atenção!')
 */
const warning = (message: string, description?: string) => {
    return toast(message, {
        duration: 3000,
        description,
        icon: '⚠️',
        style: {
            ...baseStyle,
            background: '#f59e0b',
            color: '#fff',
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
        },
    });
};

/**
 * Toast de Informação
 * Uso: showToast.info('Você sabia?')
 */
const info = (message: string, description?: string) => {
    return toast(message, {
        duration: 3000,
        description,
        icon: 'ℹ️',
        style: {
            ...baseStyle,
            background: '#3b82f6',
            color: '#fff',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
        },
    });
};

/**
 * Toast de Loading
 * Uso: const id = showToast.loading('Carregando...')
 *      // ... após carregar
 *      toast.dismiss(id)
 */
const loading = (message: string) => {
    return toast.loading(message, {
        duration: Infinity, // Não desaparece automaticamente
        style: {
            ...baseStyle,
            background: '#64748b',
            color: '#fff',
        },
    });
};

/**
 * Toast com Promise
 * Uso: showToast.promise(
 *   api.post('/data'),
 *   {
 *     loading: 'Salvando...',
 *     success: 'Salvo com sucesso!',
 *     error: 'Erro ao salvar'
 *   }
 * )
 */
const promise = <T,>(
    promiseFn: Promise<T>,
    messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
    }
) => {
    return toast.promise(promiseFn, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
    });
};

/**
 * Toast Customizado
 * Uso: showToast.custom('Mensagem', { duration: 5000 })
 */
const custom = (message: string, options?: any) => {
    return toast(message, {
        duration: 3000,
        ...options,
        style: {
            ...baseStyle,
            ...options?.style,
        },
    });
};

/**
 * Toast com Ação
 * Uso: showToast.action('Arquivo deletado', {
 *   action: {
 *     label: 'Desfazer',
 *     onClick: () => restore()
 *   }
 * })
 */
const action = (
    message: string,
    actionConfig: {
        label: string;
        onClick: () => void;
    },
    description?: string
) => {
    return toast(message, {
        duration: 5000,
        description,
        action: {
            label: actionConfig.label,
            onClick: actionConfig.onClick,
        },
        style: {
            ...baseStyle,
            background: '#1e293b',
            color: '#fff',
        },
    });
};

// Exportar funções
export const showToast = {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    custom,
    action,
};

/**
 * Componente Toaster Provider
 * Adicionar no App.tsx
 */
export function ToastProvider() {
    return (
        <Toaster
      position= "top-right"
    expand = { true}
    richColors = { false}
    closeButton = { true}
    toastOptions = {{
        className: 'font-sans',
            style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
        },
    }
}
    />
  );
}

// Re-exportar toast original para casos especiais
export { toast };
