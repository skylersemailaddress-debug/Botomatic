export interface RuntimeIncident {
  severity: 'critical' | 'high' | 'medium';
  traceId: string;
  tenantId: string;
  projectId: string;
  message: string;
}

export interface IncidentRouter {
  routeToSlack(incident: RuntimeIncident): Promise<void>;
  routeToPagerDuty(incident: RuntimeIncident): Promise<void>;
}

export function createNoopIncidentRouter(): IncidentRouter {
  return {
    async routeToSlack(_incident) {
      return;
    },

    async routeToPagerDuty(_incident) {
      return;
    },
  };
}
