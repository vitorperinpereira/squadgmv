# GMV Notion Model

## Canonical Databases

1. `Projects`
2. `Epics`
3. `Stories`
4. `Tasks`

## Required Properties

- `Name`
- `Runtime ID`
- `Mission ID`
- `Owner`
- `Sector`
- `Priority`
- `Process Type`
- `Planning Status`
- `Execution Status`
- `Context Summary`
- `Acceptance Criteria`
- `Dependencies`
- `Input Summary`
- `Expected Output`
- `Validation Needed`

## Required Relations

- `Epics -> Project`
- `Stories -> Epic`
- `Tasks -> Story`

## Runtime Rule

Only story records marked as `Planning Status = ready` and containing context plus acceptance criteria are mirrored into `docs/stories`.
