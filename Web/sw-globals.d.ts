// service-worker.ts runs as a service worker: `self` is a
// ServiceWorkerGlobalScope, which lib.webworker types as a plain
// WorkerGlobalScope. This adds what a service worker has: skipWaiting(),
// clients and registration. (Its events are typed where they are used.)
// Checked with tsconfig.sw.json only.

interface WorkerGlobalScope extends Pick<ServiceWorkerGlobalScope, 'clients' | 'registration' | 'skipWaiting'> {}
