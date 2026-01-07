import { useQuery, useQueryClient } from '@tanstack/react-query';
import { neunoi } from '@/api/neunoiClient';

export function useAuth() {
    const queryClient = useQueryClient();

    const { data: user, isLoading, error, refetch } = useQuery({
        queryKey: ['auth_user'],
        queryFn: async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) return null;
                return await neunoi.auth.me();
            } catch (err) {
                console.error('Auth error:', err);
                return null;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false
    });

    const logout = () => {
        neunoi.auth.logout();
        queryClient.setQueryData(['auth_user'], null);
        queryClient.invalidateQueries();
    };

    return {
        user,
        isLoading,
        error,
        logout,
        refetch,
        isAuthenticated: !!user,
        isAdmin: user?.roles?.includes('admin') || user?.roles?.includes('super_admin') || user?.role === 'admin' || user?.role === 'super_admin',
        isSuperAdmin: user?.roles?.includes('super_admin') || user?.role === 'super_admin'
    };
}
