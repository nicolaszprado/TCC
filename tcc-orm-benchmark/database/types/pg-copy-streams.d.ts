declare module 'pg-copy-streams' {
  import type { Writable } from 'node:stream';

  export function from(query: string): Writable;
}
