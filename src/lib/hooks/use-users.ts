import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/lib/stores/user-store';

// API functions
async function fetchUsers() {
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error('Failed to fetch users');

  const data = await response.json();
  return data?.data;
}

async function fetchUserById(id: string) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch product');
  return response.json();
}

async function createUser(data: any) {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
}

async function updateUser({ id, data }: { id: string; data: any }) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update product');
  return response.json();
}

async function deleteUser(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete product');
  return response.json();
}


/**
 * Fetch all users
 */
export function useUsers() {
  const setUsers = useUserStore(state => state.setUsers);
  const setLoading = useUserStore(state => state.setLoading);
  const setError = useUserStore(state => state.setError);

  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

/**
 * Fetch single product by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchUserById(id),
    enabled: !!id,
  });
}

/**
 * Create new product
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const addUser = useUserStore(state => state.addUser);

  return useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Optimistically update store
      addUser(newUser);
    },
  });
}

/**
 * Update existing product
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const updateUserInStore = useUserStore(state => state.updateUser);

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // Update specific product in cache
      queryClient.setQueryData(
        ['users', updatedUser.id],
        updatedUser
      );
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Update store
      updateUserInStore(updatedUser.id, updatedUser);
    },
  });
}

/**
 * Delete product
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const deleteUserFromStore = useUserStore(state => state.deleteUser);

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['users', deletedId] });
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Update store
      deleteUserFromStore(deletedId);
    },
  });
}