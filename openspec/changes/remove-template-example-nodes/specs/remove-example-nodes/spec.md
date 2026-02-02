## ADDED Requirements

### Requirement: Remove example nodes from template
The template SHALL exclude the Example Node and GitHub Issues Node source files and any export/registration references so a new project starts with no placeholder nodes.

#### Scenario: Template build excludes example nodes
- **WHEN** a user installs or builds the template package
- **THEN** no Example Node or GitHub Issues Node files are present or registered

### Requirement: Document required bootstrap fields
The template documentation SHALL list the required fields to update when starting a new project, including package metadata, display names, README placeholders, and credential identifiers.

#### Scenario: New project checklist is present
- **WHEN** a user reads the template documentation
- **THEN** there is a clear checklist of required fields to update for a new project
