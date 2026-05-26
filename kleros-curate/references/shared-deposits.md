# Shared: Deposit Computation
<!-- Source: curate-v1/curate-light-skill.md §4-§5, curate-v1/pgtcr-stake-curate-skill.md §deposit -->

## Contents
- Submission deposit formula (LGTCR)
- Challenge deposit formula (LGTCR)
- PGTCR stake vs deposit distinction
- Arbitration cost read (arbitrationCost())
- msg.value assembly rule

## Submission deposit (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §4 -->
[Phase 2 content here — submissionBaseDeposit() + arbitrationCost() × multiplier]

## Challenge deposit (LGTCR)
<!-- Source: curate-v1/curate-light-skill.md §5 -->
[Phase 2 content here — challengerBaseDeposit() + arbitrationCost()]

## PGTCR stake vs deposit
<!-- Source: curate-v1/pgtcr-stake-curate-skill.md §deposit -->
[Phase 2 content here — ERC20 permanent stake is separate from native arbitration cost; two separate transactions]

## Arbitration cost (arbitrationCost())
<!-- Source: curate-v1/curate-light-skill.md §4, curate-v1/pgtcr-stake-curate-skill.md §deposit -->
[Phase 2 content here — read from IArbitrator.arbitrationCost() with registry's extraData; always live-read, never cache]

## msg.value assembly
<!-- Source: curate-v1/curate-light-skill.md §4-§5 -->
[Phase 2 content here — exact msg.value = deposit total; undersend reverts; never approximate]
