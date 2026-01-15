import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../server/index';

describe('Security Baseline Tests', () => {
    it('should have security headers (Helmet)', async () => {
        const response = await request(app).get('/');
        expect(response.headers['x-dns-prefetch-control']).toBeDefined();
        expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should block unauthenticated access to sensitive entities', async () => {
        const response = await request(app).get('/api/entities/User/list');
        expect(response.status).toBe(401); // No token provided
    });
});
