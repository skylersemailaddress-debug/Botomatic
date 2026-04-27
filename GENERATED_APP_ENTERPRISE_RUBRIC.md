# Generated App Enterprise Rubric

Generated app must satisfy:
- install/build/test checks pass
- lint/typecheck checks pass when configured
- real auth implementation when auth is required
- real integration handlers for production paths
- real route/form/data flow implementation
- role guards when multiple roles are present
- empty/loading/error UX states present
- deployment target + env var manifest documented
- README includes assumptions and launch instructions
- no placeholder production paths

Fail-closed rules:
- Any critical validator failure means generated app is not launch-ready.
- Any placeholder production path means not launch-ready.
- Any fake auth/payment/integration in production paths means not launch-ready.
