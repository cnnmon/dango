/* TYPES */

export type Step = {
  number: number;
  description: string;
  information: string;
}

export type VscodeResponse = {
  code: string;
  filename: string;
}

/* CHAT FUNCTIONS */

export const formatStep = (step: Step): string => {
  return `Step ${step.number}: ${step.description}`;
}