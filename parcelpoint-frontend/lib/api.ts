// lib/api.ts
const AUTH_SERVICE = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
const ORCH_SERVICE = process.env.NEXT_PUBLIC_ORCH_SERVICE_URL || 'http://localhost:3002';

export const api = {
  auth: {
    login: (credentials: any) => fetch(`${AUTH_SERVICE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }),
  },
  shipments: {
    getMyShipment: (token: any) => fetch(`${ORCH_SERVICE}/shipments/my`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  }
};