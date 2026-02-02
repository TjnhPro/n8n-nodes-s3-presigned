## Why

The template still includes Example Node and GitHub Issues Node, which are placeholders and can confuse new users starting a real project. Removing them and highlighting required project metadata makes the template clearer and faster to customize now.

## What Changes

- Remove Example Node and GitHub Issues Node from the template package.
- Identify and document the template fields that must be updated when starting a new project (e.g., package metadata, README, credentials placeholders).
- Ensure any references to those example nodes are removed from docs and config.

## Capabilities

### New Capabilities
- `remove-example-nodes`: Define the template cleanup requirements for removing Example Node and GitHub Issues Node and documenting required bootstrap fields.

### Modified Capabilities
- none

## Impact

- Template node source files and exports.
- README / docs / examples that reference the example nodes.
- Package metadata and configuration fields used during project bootstrap.
