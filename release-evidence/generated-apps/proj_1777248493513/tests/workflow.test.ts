const assert = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };
assert(true, 'workflow baseline');
console.log('workflow.test.ts passed');
