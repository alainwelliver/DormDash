/**
 * Tests for Authentication and User-related functionality
 * Tests: email validation, password validation, Penn email verification
 */

// Validation utilities
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isPennEmail = (email: string): boolean => {
  const pennDomains = [
    "@upenn.edu",
    "@wharton.upenn.edu",
    "@seas.upenn.edu",
    "@sas.upenn.edu",
    "@nursing.upenn.edu",
    "@gse.upenn.edu",
    "@design.upenn.edu",
    "@sp2.upenn.edu",
    "@law.upenn.edu",
    "@pennmedicine.upenn.edu",
  ];
  const lowerEmail = email.toLowerCase();
  return pennDomains.some((domain) => lowerEmail.endsWith(domain));
};

const isValidPassword = (
  password: string,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain an uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number");
  }

  return { valid: errors.length === 0, errors };
};

const passwordsMatch = (password: string, confirm: string): boolean => {
  return password === confirm;
};

// Name validation
const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};

const formatDisplayName = (firstName: string, lastName: string): string => {
  return `${firstName.trim()} ${lastName.trim()}`;
};

const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName.trim()[0] || "";
  const last = lastName.trim()[0] || "";
  return (first + last).toUpperCase();
};

describe("Email Validation", () => {
  test("accepts valid email format", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name@domain.org")).toBe(true);
    expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
  });

  test("rejects invalid email format", () => {
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user domain.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("Penn Email Validation", () => {
  test("accepts Penn email domains", () => {
    expect(isPennEmail("student@upenn.edu")).toBe(true);
    expect(isPennEmail("student@wharton.upenn.edu")).toBe(true);
    expect(isPennEmail("student@seas.upenn.edu")).toBe(true);
    expect(isPennEmail("student@sas.upenn.edu")).toBe(true);
    expect(isPennEmail("student@nursing.upenn.edu")).toBe(true);
    expect(isPennEmail("student@gse.upenn.edu")).toBe(true);
    expect(isPennEmail("student@design.upenn.edu")).toBe(true);
    expect(isPennEmail("student@sp2.upenn.edu")).toBe(true);
    expect(isPennEmail("student@law.upenn.edu")).toBe(true);
    expect(isPennEmail("student@pennmedicine.upenn.edu")).toBe(true);
  });

  test("handles case insensitivity", () => {
    expect(isPennEmail("Student@UPENN.EDU")).toBe(true);
    expect(isPennEmail("Student@Wharton.Upenn.Edu")).toBe(true);
  });

  test("rejects non-Penn emails", () => {
    expect(isPennEmail("user@gmail.com")).toBe(false);
    expect(isPennEmail("user@drexel.edu")).toBe(false);
    expect(isPennEmail("user@temple.edu")).toBe(false);
    expect(isPennEmail("user@upenn.edu.fake.com")).toBe(false);
  });
});

describe("Password Validation", () => {
  test("accepts strong password", () => {
    const result = isValidPassword("Password123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rejects short password", () => {
    const result = isValidPassword("Pass1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters");
  });

  test("rejects password without uppercase", () => {
    const result = isValidPassword("password123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain an uppercase letter",
    );
  });

  test("rejects password without lowercase", () => {
    const result = isValidPassword("PASSWORD123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain a lowercase letter");
  });

  test("rejects password without number", () => {
    const result = isValidPassword("PasswordABC");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must contain a number");
  });

  test("collects multiple errors", () => {
    const result = isValidPassword("abc");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe("Password Confirmation", () => {
  test("matches identical passwords", () => {
    expect(passwordsMatch("Password123", "Password123")).toBe(true);
  });

  test("rejects different passwords", () => {
    expect(passwordsMatch("Password123", "Password456")).toBe(false);
  });

  test("is case sensitive", () => {
    expect(passwordsMatch("Password123", "password123")).toBe(false);
  });
});

describe("Name Validation", () => {
  test("accepts valid names", () => {
    expect(isValidName("John")).toBe(true);
    expect(isValidName("Jo")).toBe(true);
    expect(isValidName("Mary Anne")).toBe(true);
  });

  test("rejects too short names", () => {
    expect(isValidName("J")).toBe(false);
    expect(isValidName("")).toBe(false);
  });

  test("trims whitespace", () => {
    expect(isValidName("  Jo  ")).toBe(true);
    expect(isValidName("   J   ")).toBe(false);
  });
});

describe("Display Name Formatting", () => {
  test("formats full name", () => {
    expect(formatDisplayName("John", "Doe")).toBe("John Doe");
  });

  test("trims whitespace", () => {
    expect(formatDisplayName("  John  ", "  Doe  ")).toBe("John Doe");
  });
});

describe("Initials Generation", () => {
  test("generates initials from names", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
    expect(getInitials("Alice", "Smith")).toBe("AS");
  });

  test("handles single name", () => {
    expect(getInitials("John", "")).toBe("J");
    expect(getInitials("", "Doe")).toBe("D");
  });

  test("handles empty names", () => {
    expect(getInitials("", "")).toBe("");
  });

  test("uppercases initials", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });
});

describe("Form Validation Flow", () => {
  interface RegistrationForm {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
  }

  const validateRegistrationForm = (form: RegistrationForm): string[] => {
    const errors: string[] = [];

    if (!isValidEmail(form.email)) {
      errors.push("Invalid email format");
    } else if (!isPennEmail(form.email)) {
      errors.push("Must use a Penn email address");
    }

    const passwordValidation = isValidPassword(form.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }

    if (!passwordsMatch(form.password, form.confirmPassword)) {
      errors.push("Passwords do not match");
    }

    if (!isValidName(form.firstName)) {
      errors.push("First name must be at least 2 characters");
    }

    if (!isValidName(form.lastName)) {
      errors.push("Last name must be at least 2 characters");
    }

    return errors;
  };

  test("validates complete valid form", () => {
    const form: RegistrationForm = {
      email: "student@upenn.edu",
      password: "Password123",
      confirmPassword: "Password123",
      firstName: "John",
      lastName: "Doe",
    };
    expect(validateRegistrationForm(form)).toHaveLength(0);
  });

  test("catches non-Penn email", () => {
    const form: RegistrationForm = {
      email: "student@gmail.com",
      password: "Password123",
      confirmPassword: "Password123",
      firstName: "John",
      lastName: "Doe",
    };
    const errors = validateRegistrationForm(form);
    expect(errors).toContain("Must use a Penn email address");
  });

  test("catches password mismatch", () => {
    const form: RegistrationForm = {
      email: "student@upenn.edu",
      password: "Password123",
      confirmPassword: "Password456",
      firstName: "John",
      lastName: "Doe",
    };
    const errors = validateRegistrationForm(form);
    expect(errors).toContain("Passwords do not match");
  });

  test("catches multiple errors", () => {
    const form: RegistrationForm = {
      email: "invalid",
      password: "weak",
      confirmPassword: "different",
      firstName: "J",
      lastName: "D",
    };
    const errors = validateRegistrationForm(form);
    expect(errors.length).toBeGreaterThan(1);
  });
});
