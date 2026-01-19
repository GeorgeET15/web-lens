import { supabase } from './supabase';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
    rawResponse?: boolean;
    isFormData?: boolean;
}

export class ApiError extends Error {
    constructor(public message: string, public status: number, public data?: any) {
        super(message);
        this.name = 'ApiError';
    }
}

export const api = {
    async fetch(url: string, options: RequestOptions = {}) {
        const headers: Record<string, string> = {
            ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
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
            const errorText = await res.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = null;
            }
            throw new ApiError(errorData?.detail || errorText || `API Error: ${res.status}`, res.status, errorData);
        }

        if (options.rawResponse) {
            return res;
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
