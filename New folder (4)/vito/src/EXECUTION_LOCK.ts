// EXECUTION LOCK
// Purpose: Prevent any execution of Olympus artifacts
// Behavior: Immediate throw on import or execution
// No functions. No exports. No capability.

const LOCK_MESSAGE = 'OLYMPUS_EXECUTION_FORBIDDEN_CANONICAL_ONLY';

// Throw immediately on module load
throw new Error(LOCK_MESSAGE);

// The following code is unreachable by design.
// It exists only to document what this module refuses to do.

/*
FORBIDDEN_OPERATIONS:
  - Function execution
  - Class instantiation
  - Variable access
  - Type usage at runtime
  - Module chaining
  - Dynamic import resolution
  - Require resolution
  - Any computational effect

PERMITTED_OPERATIONS:
  - None

This module has one behavior: throw.
This module has one purpose: prevent execution.
This module has one message: OLYMPUS_EXECUTION_FORBIDDEN_CANONICAL_ONLY

Any attempt to import this module will fail.
Any attempt to require this module will fail.
Any attempt to execute this module will fail.

This is correct behavior.
*/
