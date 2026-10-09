import { AsyncLocalStorage } from "node:async_hooks";

export const requestIdStore = new AsyncLocalStorage<{
	requestId: string;
	userId?: string;
	tenantId?: string;
}>();

/**
 * Runs a function with request ID and user/tenant IDs stored in the async local storage.
 * @param requestId - The request ID to associate with the current async context.
 * @param fn - The function to run.
 */
export function withRequestId<T>(requestId: string, fn: () => T): T {
	return requestIdStore.run(
		{
			requestId,
			userId: undefined,
			tenantId: undefined,
		},
		fn,
	);
}

/**
 * Gets the current request context from the async local storage, if any.
 * Returns undefined if not called within a context initialized with withRequestId.
 */
export function getRequestContext():
	| {
			requestId: string;
			userId?: string;
			tenantId?: string;
	  }
	| undefined {
	return requestIdStore.getStore();
}

/**
 * Sets the user ID in the current request context.
 * @param userId - The user ID to associate with the current request.
 */
export function setUserId(userId: string): void {
	const store = requestIdStore.getStore();
	if (store) {
		store.userId = userId;
	}
}

/**
 * Sets the tenant ID in the current request context.
 * @param tenantId - The tenant ID to associate with the current request.
 */
export function setTenantId(tenantId: string): void {
	const store = requestIdStore.getStore();
	if (store) {
		store.tenantId = tenantId;
	}
}
