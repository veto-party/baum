
export type KeyValuePair<A extends string|unknown, Target> = A extends string|number|symbol ? { [key in A]: Target } : Target; 
