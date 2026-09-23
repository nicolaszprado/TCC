declare module 'pg-copy-streams' {
  // `from` is both a pg Submittable and a writable stream at runtime. The
  // upstream declaration models it only as Writable, so expose the combined
  // runtime value to pg's overloaded `Client.query` API.
  export function from(query: string): any;
}
