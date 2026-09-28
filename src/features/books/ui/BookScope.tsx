import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { type ComponentType } from 'react';
import { View } from 'react-native';
import { USE_MOCK_API } from '@/shared/api/client';
import { useBooksStore } from '../store';
import { useAuthStore } from '@/features/auth/store';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { Skeleton } from '@/shared/ui/components/Skeleton';
/** Keyed children reset local drafts/animations before the new book can paint. */
export function withBookScope(Screen: ComponentType, gate = true) {
  return function BookScopedScreen() {
    const { selectedBookId, books, ready, error, ensureBook } = useBooksStore();
    const params = useLocalSearchParams<{ bookId?: string }>();
    const router = useRouter();
    const accountId = useAuthStore(s => s.user?.id ?? '');
    if (!USE_MOCK_API) return <Screen />;
    if (params.bookId && params.bookId !== selectedBookId) return <EmptyState title="This transaction belongs to another cash book" message="Switch to that book before opening its transactions." actionLabel="Return home" onAction={() => router.replace('/(tabs)/home')} />;
    if (gate && (!ready || !books.some(b => b.id === selectedBookId))) return <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>{error ? <EmptyState title="Cash books unavailable" message={error} actionLabel="Retry" onAction={() => { void ensureBook({ name: 'Personal' }).catch(() => {}); }} /> : <Skeleton height={80} />}</View>;
    return <Screen key={`${accountId}:${selectedBookId}`} />;
  };
}
