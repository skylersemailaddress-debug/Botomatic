export function runOnboardingWorkflow(userId: string) { return { userId, state: 'provisioned', nextStep: 'invite_team' }; }
