export async function POST(req:Request){const body=await req.json();return Response.json({ok:true,workflow:'execute',jobId:body.jobId||'job_1'});}
