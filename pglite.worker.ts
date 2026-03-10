import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { worker } from '@electric-sql/pglite/worker';

worker({
    async init(options) {
        // We can pass options from the main thread or define defaults here
        return await PGlite.create({
            ...options,
            extensions: {
                ...options.extensions,
                live,
            },
        });
    },
});
