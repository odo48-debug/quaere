import { PGlite } from '@electric-sql/pglite';
import { live } from '@electric-sql/pglite/live';
import { vector } from '@electric-sql/pglite/vector';
import { worker } from '@electric-sql/pglite/worker';

worker({
    async init(options) {
        return await PGlite.create({
            ...options,
            extensions: {
                ...options.extensions,
                live,
                vector,
            },
        });
    },
});
