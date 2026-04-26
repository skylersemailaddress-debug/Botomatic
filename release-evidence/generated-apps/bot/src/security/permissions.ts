export function canRun(command:string,role:'admin'|'operator'){return role==='admin'||command!=='deploy';}
