// Supabase Client for Order Tracking
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import SUPABASE_CONFIG from './supabase-config.js';

// Initialize Supabase client
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Order tracking functions
class OrderTracker {
    constructor() {
        this.tableName = 'paco_orders';
        this.realtimeChannel = null;
    }

    // Increment global order count
    async recordOrder(orderData = {}) {
        try {
            const orderRecord = {
                created_at: new Date().toISOString(),
                hat_id: orderData.hat || null,
                hat_name: orderData.hatName || null,
                item_id: orderData.item || null,
                item_name: orderData.itemName || null,
                total_price: orderData.total || 0,
                user_agent: navigator.userAgent,
                timestamp: Date.now()
            };

            const { data, error } = await supabase
                .from(this.tableName)
                .insert([orderRecord])
                .select();

            if (error) {
                console.error('Error recording order:', error);
                return { success: false, error };
            }

            console.log('✅ Order recorded successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('Exception recording order:', error);
            return { success: false, error: error.message };
        }
    }

    // Get total global order count
    async getGlobalOrderCount() {
        try {
            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error getting order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get today's order count
    async getTodayOrderCount() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const { count, error } = await supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .gte('created_at', todayISO);

            if (error) {
                console.error('Error getting today order count:', error);
                return { success: false, count: 0, error };
            }

            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Exception getting today order count:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    // Get popular traits
    async getPopularTraits() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('hat_name, item_name')
                .not('hat_name', 'is', null)
                .not('item_name', 'is', null);

            if (error) {
                console.error('Error getting popular traits:', error);
                return { success: false, data: [], error };
            }

            // Count trait popularity
            const hatCounts = {};
            const itemCounts = {};

            data.forEach(order => {
                if (order.hat_name) {
                    hatCounts[order.hat_name] = (hatCounts[order.hat_name] || 0) + 1;
                }
                if (order.item_name) {
                    itemCounts[order.item_name] = (itemCounts[order.item_name] || 0) + 1;
                }
            });

            return {
                success: true,
                data: {
                    popularHats: Object.entries(hatCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
                    popularItems: Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
                }
            };
        } catch (error) {
            console.error('Exception getting popular traits:', error);
            return { success: false, data: [], error: error.message };
        }
    }

    // Test connection
    async testConnection() {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('count', { count: 'exact', head: true });

            if (error) {
                console.error('Connection test failed:', error);
                return { success: false, error };
            }

            console.log('✅ Supabase connection successful');
            return { success: true, message: 'Connection successful' };
        } catch (error) {
            console.error('Connection test exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Start real-time subscription for live order updates
    subscribeToLiveOrders(onNewOrder, onOrderUpdate) {
        try {
            // Unsubscribe from existing channel if any
            this.unsubscribeFromLiveOrders();

            // Create new real-time channel
            this.realtimeChannel = supabase
                .channel('paco_orders_channel')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔴 LIVE: New order received!', payload);
                        if (onNewOrder) {
                            onNewOrder(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: this.tableName
                    },
                    (payload) => {
                        console.log('🔄 LIVE: Order updated!', payload);
                        if (onOrderUpdate) {
                            onOrderUpdate(payload.new);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Live order tracking activated!');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('❌ Real-time subscription failed');
                    }
                });

            return { success: true, channel: this.realtimeChannel };
        } catch (error) {
            console.error('Error setting up real-time subscription:', error);
            return { success: false, error: error.message };
        }
    }

    // Stop real-time subscription
    unsubscribeFromLiveOrders() {
        if (this.realtimeChannel) {
            supabase.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
            console.log('🔌 Real-time subscription stopped');
        }
    }

    // Get recent orders for live feed
    async getRecentOrders(limit = 10) {
        try {
            const { data, error } = await supabase
                .from(this.tableName)
                .select('id, created_at, hat_name, item_name, total_price')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error getting recent orders:', error);
                return { success: false, data: [], error };
            }

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Exception getting recent orders:', error);
            return { success: false, data: [], error: error.message };
        }
    }
}

// Export singleton instance
export const orderTracker = new OrderTracker();
export default orderTracker;