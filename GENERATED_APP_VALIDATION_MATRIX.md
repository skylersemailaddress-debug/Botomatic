# Generated App Validation Matrix

Generated app validators include:
- validateSpecCompleteness
- validateNoPlaceholders
- validateAuthRbac
- validateDataModel
- validateRoutes
- validateForms
- validateWorkflows
- validateIntegrations
- validatePayments
- validateNotifications
- validateResponsiveUi
- validateUxStates
- validateSecurity
- validateDeployment
- validateCommercialReadiness

Rules:
- Any critical fail blocks launch-ready claim.
- Any placeholder production path blocks launch-ready claim.
- Any fake auth/payment/integration in production path blocks launch-ready claim.
- Launchable benchmark threshold requires >= 8.5/10 with zero critical failures.
- Universal-builder benchmark target requires >= 9.2/10 with zero critical failures and >= 25 benchmark cases.
