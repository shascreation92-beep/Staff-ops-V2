import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCompanyRuleAction } from '@/app/actions/settings';

/**
 * Hook to update a company rule using React Query.
 * The server action `updateCompanyRuleAction` validates the payload with Zod.
 */
export const useRules = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: { key: string; value: string; targetCompanyId?: string }) => {
      return await updateCompanyRuleAction(payload);
    },
    onSuccess: () => {
      // Invalidate any queries that depend on rules so UI refreshes.
      queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
    onError: (error) => {
      console.error('Failed to update rule', error);
    },
  });

  return mutation;
};
