// =========================================
// Configuración de la API para PRODUCCIÓN
// =========================================
//
// INSTRUCCIONES:
// 1. Reemplaza "tudominio.com" con tu dominio real
// 2. Renombra este archivo a "api-config.js" antes de subir a Hostinger
// 3. O copia su contenido sobre el archivo api-config.js existente
//
// =========================================

// Configuración de la API
const API_CONFIG = {
    baseURL: 'https://tranquiya-backend-1.onrender.com/api',
    BASE_URL: 'https://tranquiya-backend-1.onrender.com', // Sin /api al final para rutas completas
    timeout: 30000, // 30 segundos
    headers: {
        'Content-Type': 'application/json'
    }
};

// Utilidad para hacer peticiones HTTP
const ApiClient = {
    // GET request
    async get(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = { ...API_CONFIG.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
                method: 'GET',
                headers: headers,
                ...options
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en GET:', error);
            throw error;
        }
    },

    // POST request
    async post(endpoint, data, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = { ...API_CONFIG.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data),
                ...options
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en POST:', error);
            throw error;
        }
    },

    // PATCH request
    async patch(endpoint, data, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = { ...API_CONFIG.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify(data),
                ...options
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en PATCH:', error);
            throw error;
        }
    },

    // DELETE request
    async delete(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = { ...API_CONFIG.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: headers,
                ...options
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error en DELETE:', error);
            throw error;
        }
    },

    // Manejar respuesta
    async handleResponse(response) {
        // Manejar error 429 (Too Many Requests)
        if (response.status === 429) {
            throw {
                status: 429,
                message: 'Demasiados intentos. Por favor, espera unos minutos antes de intentar de nuevo.',
                details: null
            };
        }

        // Obtener texto de la respuesta
        const text = await response.text();

        // Intentar parsear como JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            // Si no es JSON válido
            if (!response.ok) {
                throw {
                    status: response.status,
                    message: text || 'Error en la petición',
                    details: null
                };
            }
            // Si es OK pero no es JSON, retornar texto
            return { message: text };
        }

        if (!response.ok) {
            // Si el token expiró, limpiar y redirigir
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');

                // Solo redirigir si no estamos en la página de inicio
                if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
            }

            throw {
                status: response.status,
                message: data.error || 'Error en la petición',
                details: data.details || null
            };
        }

        return data;
    }
};

// API de Autenticación
const AuthAPI = {
    async register(userData) {
        return await ApiClient.post('/auth/register', userData);
    },

    async login(email, password) {
        const response = await ApiClient.post('/auth/login', { email, password });

        // Guardar token
        if (response.token) {
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
        }

        return response;
    },

    async verifyToken() {
        return await ApiClient.get('/auth/verify');
    },

    async verify() {
        return await ApiClient.get('/auth/verify');
    },

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};

// API de Usuario
const UserAPI = {
    async getDashboard() {
        return await ApiClient.get('/users/dashboard');
    },

    async getProfile() {
        return await ApiClient.get('/users/profile');
    },

    async getPrestamos() {
        return await ApiClient.get('/users/prestamos');
    },

    async getTransacciones(limit = 50) {
        return await ApiClient.get(`/users/transacciones?limit=${limit}`);
    },

    async pagarCuota(prestamoId, monto) {
        return await ApiClient.post(`/users/prestamos/${prestamoId}/pagar`, { monto });
    }
};

// API de Solicitudes
const SolicitudAPI = {
    async getMisSolicitudes() {
        return await ApiClient.get('/solicitudes');
    },

    async getSolicitud(id) {
        return await ApiClient.get(`/solicitudes/${id}`);
    },

    async crear(solicitudData) {
        return await ApiClient.post('/solicitudes', solicitudData);
    },

    async aprobar(id) {
        return await ApiClient.patch(`/solicitudes/${id}/aprobar`);
    },

    async rechazar(id, motivo) {
        return await ApiClient.patch(`/solicitudes/${id}/rechazar`, { motivo });
    },

    async getEstadisticas() {
        return await ApiClient.get('/solicitudes/stats/resumen');
    }
};

// API de Administrador
const AdminAPI = {
    async getDashboard() {
        return await ApiClient.get('/admin/dashboard');
    },

    async aprobarSolicitud(id, montoAprobado = null) {
        const body = montoAprobado ? { montoAprobado } : {};
        return await ApiClient.post(`/admin/solicitudes/${id}/aprobar`, body);
    },

    async rechazarSolicitud(id, motivo) {
        return await ApiClient.post(`/admin/solicitudes/${id}/rechazar`, { motivo });
    }
};

// API de CEO
const CEOAPI = {
    async getDashboard() {
        return await ApiClient.get('/ceo/dashboard');
    },

    async aprobarSolicitud(id, montoAprobado = null) {
        const body = montoAprobado ? { montoAprobado } : {};
        return await ApiClient.post(`/ceo/solicitudes/${id}/aprobar`, body);
    },

    async rechazarSolicitud(id, motivo) {
        return await ApiClient.post(`/ceo/solicitudes/${id}/rechazar`, { motivo });
    },

    async getSolicitudesGestionadas(estado = '') {
        const estadoParam = estado ? `?estado=${estado}` : '';
        return await ApiClient.get(`/ceo/solicitudes/gestionadas${estadoParam}`);
    },

    async desembolsarSolicitud(id, comprobante) {
        return await ApiClient.post(`/ceo/solicitudes/${id}/desembolsar`, {
            comprobante_transferencia: comprobante
        });
    },

    async getHistorial() {
        return await ApiClient.get('/ceo/historial');
    },

    // Anotaciones
    async crearAnotacion(solicitudId, anotacion) {
        return await ApiClient.post(`/ceo/solicitudes/${solicitudId}/anotacion`, { anotacion });
    },

    async editarAnotacion(anotacionId, anotacion) {
        return await ApiClient.put(`/ceo/anotaciones/${anotacionId}`, { anotacion });
    },

    async eliminarAnotacion(anotacionId) {
        return await ApiClient.delete(`/ceo/anotaciones/${anotacionId}`);
    },

    async getAnotaciones(solicitudId) {
        return await ApiClient.get(`/ceo/solicitudes/${solicitudId}/anotaciones`);
    }
};

// Exportar para uso en otros archivos
window.API = {
    baseURL: API_CONFIG.baseURL,
    Auth: AuthAPI,
    User: UserAPI,
    Solicitud: SolicitudAPI,
    Admin: AdminAPI,
    CEO: CEOAPI
};

console.log('API Client configurado para PRODUCCIÓN');
console.log('URL de la API:', API_CONFIG.baseURL);
