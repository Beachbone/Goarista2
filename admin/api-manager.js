// api-manager.js - Zentrale API-Verwaltung für das Admin-Interface

class ApiManager {
    constructor(baseUrl = 'http://192.168.2.166:8080/api') {
        this.baseUrl = baseUrl;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // milliseconds
    }

    // Generic request method with retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, defaultOptions);
                
                if (!response.ok) {
                    // Handle specific error codes
                    if (response.status === 400) {
                        const error = await response.json();
                        throw new ApiError(error.error || 'Bad Request', response.status, error);
                    }
                    if (response.status === 404) {
                        throw new ApiError('Resource not found', response.status);
                    }
                    if (response.status === 500) {
                        throw new ApiError('Server error', response.status);
                    }
                    
                    throw new ApiError(`Request failed with status ${response.status}`, response.status);
                }
                
                // Return parsed JSON or empty object
                const text = await response.text();
                return text ? JSON.parse(text) : {};
                
            } catch (error) {
                // If it's our last attempt, throw the error
                if (attempt === this.retryAttempts) {
                    if (error instanceof ApiError) {
                        throw error;
                    }
                    throw new ApiError(`Network error: ${error.message}`, 0);
                }
                
                // Wait before retrying
                await this.delay(this.retryDelay * attempt);
                console.log(`Retrying request (attempt ${attempt + 1}/${this.retryAttempts})...`);
            }
        }
    }

    // HTTP method shortcuts
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Health check
    async checkHealth() {
        try {
            const response = await this.get('/health');
            return { online: true, ...response };
        } catch (error) {
            return { online: false, error: error.message };
        }
    }

    // Batch operations
    async batchRequest(requests) {
        const results = await Promise.allSettled(
            requests.map(req => this.request(req.endpoint, req.options))
        );
        
        return results.map((result, index) => ({
            request: requests[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason : null
        }));
    }

    // Response caching for GET requests
    cache = new Map();
    cacheTimeout = 60000; // 1 minute

    async getCached(endpoint, forceRefresh = false) {
        const cacheKey = endpoint;
        const cached = this.cache.get(cacheKey);
        
        if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`Returning cached data for ${endpoint}`);
            return cached.data;
        }
        
        const data = await this.get(endpoint);
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    }

    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }

    // Validation helpers
    validateId(id) {
        if (!id || isNaN(id) || id <= 0) {
            throw new Error(`Invalid ID: ${id}`);
        }
        return parseInt(id);
    }

    validateData(data, requiredFields) {
        const missing = requiredFields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        return true;
    }

    // Logging and debugging
    enableDebugMode() {
        const originalRequest = this.request.bind(this);
        this.request = async (endpoint, options) => {
            console.group(`API Request: ${options?.method || 'GET'} ${endpoint}`);
            console.log('Options:', options);
            try {
                const result = await originalRequest(endpoint, options);
                console.log('Response:', result);
                console.groupEnd();
                return result;
            } catch (error) {
                console.error('Error:', error);
                console.groupEnd();
                throw error;
            }
        };
        console.log('API Debug mode enabled');
    }

    // Statistics tracking
    stats = {
        requests: 0,
        errors: 0,
        cacheHits: 0,
        retries: 0
    };

    getStats() {
        return { ...this.stats };
    }

    resetStats() {
        this.stats = {
            requests: 0,
            errors: 0,
            cacheHits: 0,
            retries: 0
        };
        console.log('API statistics reset');
    }

    // Connection testing
    async testConnection() {
        const start = Date.now();
        try {
            await this.checkHealth();
            const latency = Date.now() - start;
            return {
                connected: true,
                latency: `${latency}ms`,
                baseUrl: this.baseUrl
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                baseUrl: this.baseUrl
            };
        }
    }

    // Retry configuration
    setRetryConfig(attempts, delay) {
        this.retryAttempts = attempts;
        this.retryDelay = delay;
        console.log(`Retry config updated: ${attempts} attempts with ${delay}ms delay`);
    }

    // Utility method for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Specific API methods for the QR-Bestellsystem

    // Categories API
    async getCategories() {
        return this.get('/admin/categories');
    }

    async createCategory(category) {
        return this.post('/admin/categories', category);
    }

    async updateCategory(id, category) {
        return this.put(`/admin/categories/${id}`, category);
    }

    async deleteCategory(id) {
        return this.delete(`/admin/categories/${id}`);
    }

    // Ingredients API
    async getIngredients() {
        return this.get('/admin/ingredients');
    }

    async createIngredient(ingredient) {
        return this.post('/admin/ingredients', ingredient);
    }

    async updateIngredient(id, ingredient) {
        return this.put(`/admin/ingredients/${id}`, ingredient);
    }

    async deleteIngredient(id) {
        return this.delete(`/admin/ingredients/${id}`);
    }

    // Meal Sets API
    async getMealSets() {
        return this.get('/admin/meal-sets');
    }

    async createMealSet(mealSet) {
        return this.post('/admin/meal-sets', mealSet);
    }

    async updateMealSet(id, mealSet) {
        return this.put(`/admin/meal-sets/${id}`, mealSet);
    }

    async deleteMealSet(id) {
        return this.delete(`/admin/meal-sets/${id}`);
    }

    // Orders API (read-only for admin)
    async getOrders(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = params.toString() ? `/orders?${params}` : '/orders';
        return this.get(endpoint);
    }

    async updateOrderStatus(id, status) {
        return this.put(`/orders/${id}/status`, { status });
    }

    // Tables API
    async getTables() {
        return this.get('/tables');
    }

    // Statistics API
    async getStats(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = params.toString() ? `/stats?${params}` : '/stats';
        return this.get(endpoint);
    }

    // Inventory API
    async getInventory() {
        return this.get('/admin/inventory');
    }

    async updateInventory(updates) {
        return this.put('/admin/inventory', updates);
    }

    async resetInventory() {
        return this.post('/admin/inventory/reset');
    }
}

// Custom Error class for API errors
class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiManager, ApiError };
}
