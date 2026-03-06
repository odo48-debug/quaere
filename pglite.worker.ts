import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { worker } from '@electric-sql/pglite/worker';

worker({
    async init(options) {
        // Create the PGlite instance within the worker
        const db = await PGlite.create({
            ...options,
            extensions: {
                ...options.extensions,
                live,
            },
        });
        return db;
    },
});
