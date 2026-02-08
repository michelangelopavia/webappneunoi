const API_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD
    ? window.location.origin
    : window.location.protocol + '//' + window.location.hostname + ':3000');

const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Richiesta scaduta (timeout). Verifica la connessione o riprova tra poco.');
        }
        throw error;
    }
};

const handleResponse = async (response) => {
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            // Optional: Redirect to login
            // window.location.href = '/login'; 
        }
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorJson.message || 'API Error');
        } catch (e) {
            throw new Error(errorText || 'API Error');
        }
    }
    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    } else {
        return response.text();
    }
};

const API_ADMIN_RESTORE = `${API_URL}/api/admin/restore-db`;

// Generic Entity Handler
const createEntityHandler = (entityName) => ({
    list: async (sortOrOptions, limit) => {
        const params = new URLSearchParams();
        if (typeof sortOrOptions === 'object') {
            const { sort, limit: l, include } = sortOrOptions;
            if (sort) params.append('sort', sort);
            if (l) params.append('limit', l);
            if (include) params.append('include', include);
        } else {
            if (sortOrOptions) params.append('sort', sortOrOptions);
            if (limit) params.append('limit', limit);
        }

        const res = await fetch(`${API_URL}/api/entities/${entityName}/list?${params.toString()}`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    get: async (id) => {
        const res = await fetch(`${API_URL}/api/entities/${entityName}/${id}`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    create: async (data) => {
        const res = await fetch(`${API_URL}/api/entities/${entityName}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    update: async (id, data) => {
        const res = await fetch(`${API_URL}/api/entities/${entityName}/${id}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    delete: async (id) => {
        console.log(`[CLIENT API] Deleting entity ${entityName} with ID ${id}`);
        const res = await fetch(`${API_URL}/api/entities/${entityName}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        console.log(`[CLIENT API] Delete response status: ${res.status} for ${entityName} ${id}`);
        return handleResponse(res);
    },

    filter: async (filters, sortOrOptions) => {
        const params = new URLSearchParams();
        if (typeof sortOrOptions === 'object' && sortOrOptions !== null) {
            const { sort, limit, offset, include } = sortOrOptions;
            if (sort) params.append('sort', sort);
            if (limit) params.append('limit', limit);
            if (offset) params.append('offset', offset);
            if (include) params.append('include', include);
        } else if (typeof sortOrOptions === 'string') {
            params.append('sort', sortOrOptions);
        }

        const res = await fetch(`${API_URL}/api/entities/${entityName}/filter?${params.toString()}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(filters)
        });
        return handleResponse(res);
    },

    bulkDelete: async () => {
        const res = await fetch(`${API_URL}/api/entities/${entityName}/bulk?confirm=true`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    }
});

export const neunoi = {
    admin: {
        restoreDatabase: async (file) => {
            const formData = new FormData();
            formData.append('database', file);
            const token = localStorage.getItem('auth_token');
            const res = await fetchWithTimeout(API_ADMIN_RESTORE, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            }, 60000); // 60s for DB
            return handleResponse(res);
        },
        getSystemDiag: async () => {
            const res = await fetchWithTimeout(`${API_URL}/api/system-diag`, {
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        testEmailConnection: async () => {
            const res = await fetchWithTimeout(`${API_URL}/api/admin/test-email-connection`, {
                headers: getHeaders()
            }, 40000);
            return handleResponse(res);
        }
    },
    auth: {
        login: async (email, password) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await handleResponse(res);
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
            }
            return data;
        },
        register: async (email, password, full_name) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, full_name })
            }, 45000); // 45s per registrazione ed email
            const data = await handleResponse(res);
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
            }
            return data;
        },
        forgotPassword: async (email) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email })
            }, 45000); // 45s for email
            return handleResponse(res);
        },
        resetPassword: async (token, newPassword) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ token, newPassword })
            });
            return handleResponse(res);
        },
        verifyEmail: async (token) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/verify-email?token=${token}`, {
                method: 'GET',
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        resendVerification: async (email) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email })
            });
            return handleResponse(res);
        },
        me: async () => {
            const res = await fetchWithTimeout(`${API_URL}/auth/me`, {
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        updateProfile: async (data) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/update`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        changePassword: async (currentPassword, newPassword) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/change-password`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ currentPassword, newPassword })
            });
            return handleResponse(res);
        },
        adminTriggerReset: async (userId) => {
            const res = await fetchWithTimeout(`${API_URL}/auth/admin-trigger-reset`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ userId })
            }, 45000);
            return handleResponse(res);
        },
        isAuthenticated: async () => {
            const token = localStorage.getItem('auth_token');
            return !!token;
        },
        redirectToLogin: (redirectUrl) => {
            const url = redirectUrl ? `/Login?redirect=${encodeURIComponent(redirectUrl)}` : '/Login';
            window.location.href = url;
        },
        logout: () => {
            localStorage.removeItem('auth_token');
            window.location.href = '/Login';
        }
    },

    entities: {
        User: {
            ...createEntityHandler('User'),
            recalc: async (id) => {
                const res = await fetch(`${API_URL}/api/users/${id}/recalc`, {
                    method: 'POST',
                    headers: getHeaders()
                });
                return handleResponse(res);
            }
        },
        TurnoHost: createEntityHandler('TurnoHost'),
        ProfiloSocio: createEntityHandler('ProfiloSocio'),
        TransazioneNEU: createEntityHandler('TransazioneNEU'),
        SalaRiunioni: createEntityHandler('SalaRiunioni'),
        PrenotazioneSala: createEntityHandler('PrenotazioneSala'),
        IngressoCoworking: createEntityHandler('IngressoCoworking'),
        NotificaAbbonamento: createEntityHandler('NotificaAbbonamento'),
        TaskNotifica: createEntityHandler('TaskNotifica'),
        ProfiloCoworker: createEntityHandler('ProfiloCoworker'),
        OrdineCoworking: createEntityHandler('OrdineCoworking'),
        DatiFatturazione: createEntityHandler('DatiFatturazione'),
        AmbitoVolontariato: createEntityHandler('AmbitoVolontariato'),
        AzioneVolontariato: createEntityHandler('AzioneVolontariato'),
        DichiarazioneVolontariato: createEntityHandler('DichiarazioneVolontariato'),
        TipoAbbonamento: createEntityHandler('TipoAbbonamento'),
        AbbonamentoUtente: createEntityHandler('AbbonamentoUtente'),
        SistemaSetting: createEntityHandler('SistemaSetting')
    },

    integrations: {
        Core: {
            UploadFile: async ({ file }) => {
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch(`${API_URL}/api/integrations/upload`, {
                    method: 'POST',
                    headers: {
                        ...(localStorage.getItem('auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } : {})
                        // Do NOT set Content-Type for FormData, browser does it with boundary
                    },
                    body: formData
                });
                return handleResponse(res);
            },

            ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
                const res = await fetch(`${API_URL}/api/integrations/extract`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ file_url, json_schema })
                });
                return handleResponse(res);
            },

            // Mocks for other methods if needed
            GenerateImage: async () => ({ url: 'https://placehold.co/600x400' }),
            SendEmail: async (data) => {
                // Support both standard to/subject/text and the newer expanded format
                const payload = {
                    to: data.to,
                    subject: data.subject,
                    text: data.text || data.body || '',
                    html: data.html || data.body || '',
                    base64_attachments: data.base64_attachments || []
                };
                return neunoi.post('/api/integrations/send-email', payload);
            },
            CreateFileSignedUrl: async () => ({ url: '' }),
            InvokeLLM: async () => ({ output: '' })
        }
    },

    coworking: {
        sendReceipt: async (orderId) => {
            return neunoi.post(`/api/coworking/orders/${orderId}/send-receipt`);
        }
    },

    // Generic Fetch Helpers
    get: async (url) => {
        const res = await fetch(`${API_URL}${url}`, { headers: getHeaders() });
        return handleResponse(res);
    },
    post: async (url, data) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers: getHeaders(),
            body: data ? JSON.stringify(data) : undefined
        });
        return handleResponse(res);
    },
    patch: async (url, data) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: data ? JSON.stringify(data) : undefined
        });
        return handleResponse(res);
    },
    delete: async (url) => {
        const res = await fetch(`${API_URL}${url}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    }
};

export const createClient = () => neunoi;
