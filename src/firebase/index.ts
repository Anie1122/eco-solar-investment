'use client';

// This file now serves as a barrel file for exporting hooks and types.
// The initialization logic has been moved to client-provider.tsx
// to ensure it runs once at the root of the application on the client-side.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export * from './config';
