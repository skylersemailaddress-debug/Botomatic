import { runOnboardingWorkflow } from '../../../../workflows/onboarding';
export async function POST(req: Request) { const body = await req.json(); const result = runOnboardingWorkflow(body.userId || 'user'); return Response.json({ ok: true, result }); }
