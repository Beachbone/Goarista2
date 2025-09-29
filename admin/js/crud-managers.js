// ============================================
// CRUD Managers for Admin Interface
// ============================================

const API_BASE_URL = 'http://192.168.2.166:8080/api';

// ============================================
// Base API Client
// ============================================
class BaseAPIClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
        this.baseUrl = `${API_BASE_URL}${endpoint}`;
    }

    async getAll() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${this.endpoint}:`, error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }

    async create(data) {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error creating ${this.endpoint}:`, error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error updating ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error deleting ${this.endpoint}/${id}:`, error);
            throw error;
        }
    }
}

// ============================================
// Categories CRUD Manager
// ============================================
class CategoriesManager extends BaseAPIClient {
    constructor() {
        super('/admin/categories');
    }

    async create(categoryData) {
        const data = {
            name: categoryData.name,
            color_bg_inactive: categoryData.color_bg_inactive,
            color_bg_active: categoryData.color_bg_active,
            color_font_inactive: categoryData.color_font_inactive,
            color_font_active: categoryData.color_font_active,
            sort_order: parseInt(categoryData.sort_order) || 0
        };
        return await super.create(data);
    }

    async update(id, categoryData) {
        const data = {
            name: categoryData.name,
            color_bg_inactive: categoryData.color_bg_inactive,
            color_bg_active: categoryData.color_bg_active,
            color_font_inactive: categoryData.color_font_inactive,
            color_font_active: categoryData.color_font_active,
            sort_order: parseInt(categoryData.sort_order)
        };
        return await super.update(id, data);
    }
}

// ============================================
// Ingredients CRUD Manager
// ============================================
class IngredientsManager extends BaseAPIClient {
    constructor() {
        super('/admin/ingredients');
    }

    async create(ingredientData) {
        const data = {
            name: ingredientData.name,
            price: parseFloat(ingredientData.price),
            category_id: parseInt(ingredientData.category_id),
            available: ingredientData.available !== false,
            sort_order: parseInt(ingredientData.sort_order) || 0,
            stock_quantity: parseInt(ingredientData.stock_quantity) || 0,
            min_warning_level: parseInt(ingredientData.min_warning_level) || 5,
            max_daily_limit: parseInt(ingredientData.max_daily_limit) || 0,
            track_inventory: ingredientData.track_inventory || false
        };
        return await super.create(data);
    }

    async update(id, ingredientData) {
        const data = {
            name: ingredientData.name,
            price: parseFloat(ingredientData.price),
            category_id: parseInt(ingredientData.category_id),
            available: ingredientData.available,
            sort_order: parseInt(ingredientData.sort_order),
            stock_quantity: parseInt(ingredientData.stock_quantity),
            min_warning_level: parseInt(ingredientData.min_warning_level),
            max_daily_limit: parseInt(ingredientData.max_daily_limit),
            track_inventory: ingredientData.track_inventory
        };
        return await super.update(id, data);
    }

    async getByCategory(categoryId) {
        const allIngredients = await this.getAll();
        return allIngredients.filter(ing => ing.category_id === categoryId);
    }
}

// ============================================
// MealSets CRUD Manager - UPDATED MIT PREIS
// ============================================
class MealSetsManager extends BaseAPIClient {
    constructor() {
        super('/admin/meal-sets');
    }

    async create(mealSetData) {
        const data = {
            name: mealSetData.name,
            description: mealSetData.description || '',
            price: parseFloat(mealSetData.price) || 0,  // NEU!
            available: mealSetData.available !== false,
            sort_order: parseInt(mealSetData.sort_order) || 0,
            ingredients: mealSetData.ingredients || []
        };
        return await super.create(data);
    }

    async update(id, mealSetData) {
        const data = {
            name: mealSetData.name,
            description: mealSetData.description,
            price: parseFloat(mealSetData.price) || 0,  // NEU!
            available: mealSetData.available,
            sort_order: parseInt(mealSetData.sort_order),
            ingredients: mealSetData.ingredients || []
        };
        return await super.update(id, data);
    }

    // Get meal set details with ingredients
    async getDetails(id) {
        const url = `${API_BASE_URL}/meal-sets/${id}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching meal set details ${id}:`, error);
            throw error;
        }
    }
}

// ============================================
// Orders Manager
// ============================================
class OrdersManager extends BaseAPIClient {
    constructor() {
        super('/orders');
    }

    async updateStatus(id, status) {
        try {
            const response = await fetch(`${this.baseUrl}/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error updating order status:`, error);
            throw error;
        }
    }
}

// ============================================
// Inventory Manager
// ============================================
class InventoryManager {
    constructor() {
        this.baseUrl = `${API_BASE_URL}/admin/inventory`;
    }

    async getAll() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching inventory:', error);
            throw error;
        }
    }

    async updateStock(ingredientId, newStock) {
        try {
            const response = await fetch(`${this.baseUrl}/${ingredientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ stock_quantity: newStock }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating stock:', error);
            throw error;
        }
    }

    async resetDaily() {
        try {
            const response = await fetch(`${this.baseUrl}/reset-daily`, {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error resetting daily sold:', error);
            throw error;
        }
    }

    async bulkUpdate(updates) {
        try {
            const response = await fetch(`${this.baseUrl}/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error bulk updating inventory:', error);
            throw error;
        }
    }
}

// ============================================
// Stats Manager
// ============================================
class StatsManager {
    constructor() {
        this.baseUrl = `${API_BASE_URL}/stats`;
    }

    async getSummary() {
        try {
            const response = await fetch(this.baseUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats summary:', error);
            throw error;
        }
    }

    async getIngredientStats() {
        try {
            const response = await fetch(`${this.baseUrl}/ingredients`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching ingredient stats:', error);
            throw error;
        }
    }

    async getMealSetStats() {
        try {
            const response = await fetch(`${this.baseUrl}/meal-sets`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching meal set stats:', error);
            throw error;
        }
    }

    async getTodayStats() {
        try {
            const response = await fetch(`${this.baseUrl}/today`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching today stats:', error);
            throw error;
        }
    }
}

// ============================================
// Export CRUD Object
// ============================================
const CRUD = {
    categories: new CategoriesManager(),
    ingredients: new IngredientsManager(),
    mealSets: new MealSetsManager(),
    inventory: new InventoryManager(),
    orders: new OrdersManager(),
    stats: new StatsManager()
};

// Make available globally
if (typeof window !== 'undefined') {
    window.CRUD = CRUD;
    window.API_BASE_URL = API_BASE_URL;
}
