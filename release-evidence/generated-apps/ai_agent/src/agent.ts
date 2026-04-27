import { TOOL_MANIFEST } from './tools/manifest';
export function runAgent(task:string){return {task,tools:TOOL_MANIFEST.map(t=>t.name)};}
