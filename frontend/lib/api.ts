import { supabase } from './supabase';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const api = {
    async fetch(url: string, options: RequestOptions = {}) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Inject AI Config from LocalStorage
        const aiConfig = localStorage.getItem('weblens_ai_config');
        if (aiConfig) {
            headers['X-AI-Config'] = aiConfig;
        }
        
        // Inject Auth token from Supabase session
        try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) {
                headers['Authorization'] = `Bearer ${data.session.access_token}`;
            }
        } catch (e) {
            console.error('Failed to get auth session for API call:', e);
        }

        const res = await fetch(url, {
            ...options,
            headers
        });

        if (!res.ok) {
            // Special handling for 429 or 500 if needed
            const errorText = await res.text();
            throw new Error(errorText || `API Error: ${res.status}`);
        }

        return res.json();
    },

    async post(url: string, body: any) {
        return this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async get(url: string) {
        return this.fetch(url, { method: 'GET' });
    }
};
