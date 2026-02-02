## Context

The current project template includes Example Node and GitHub Issues Node as placeholders. These are not intended for real projects and can mislead new users. The change removes those nodes and clarifies which template fields must be customized when bootstrapping a new node package.

## Goals / Non-Goals

**Goals:**
- Remove Example Node and GitHub Issues Node files and any export/registration references.
- Clean up template documentation and configuration that references the example nodes.
- Document the fields that must be updated to start a new project (package metadata, README placeholders, credentials references).

**Non-Goals:**
- Introducing new runtime capabilities or node behavior.
- Changing n8n core APIs or the node execution contract.

## Decisions

- Remove the example node source files and their registrations from the template entry points to ensure new projects start with a clean slate.
  - Alternative considered: keep example nodes but hide them from exports. Rejected because files would still clutter the template and cause confusion.
- Create a concise checklist of required template fields to update (package.json fields, display names, README placeholders, credential names) so new projects have a clear bootstrap path.
  - Alternative considered: rely on existing README prose. Rejected because required fields are currently scattered and easy to miss.
- Ensure all docs and config references to the example nodes are removed to avoid broken links or misleading guidance.
  - Alternative considered: leave historical references. Rejected to keep the template consistent with actual contents.

## Risks / Trade-offs

- [Risk] Removing files without updating exports or docs could cause build errors or broken references ? Mitigation: update index/exports and scan docs/config for references.
- [Risk] Users relying on example nodes for learning lose concrete samples ? Mitigation: keep a short “how to start” checklist and optionally link to external official examples.
