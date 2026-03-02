export type PasswordRequirement = {
  id:
    | "min_length"
    | "uppercase"
    | "lowercase"
    | "number"
    | "special";
  label: string;
  test: (password: string) => boolean;
};

export const passwordRequirements: PasswordRequirement[] = [
  {
    id: "uppercase",
    label: "At least 1 uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "special",
    label: "At least 1 special character",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
  {
    id: "number",
    label: "At least 1 number",
    test: (password) => /\d/.test(password),
  },
  {
    id: "min_length",
    label: "Minimum 10 characters",
    test: (password) => password.length >= 10,
  },
];

export function getPasswordRequirementChecks(password: string) {
  return passwordRequirements.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}

export function getPasswordPolicyError(password: string) {
  const unmetRequirement = getPasswordRequirementChecks(password).find(
    (requirement) => !requirement.met
  );

  if (!unmetRequirement) {
    return null;
  }

  return `Password requirement not met: ${unmetRequirement.label}`;
}
