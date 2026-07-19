const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email?.trim());
}

export function validatePasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  if (score === 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';

  return { checks, isValid: score === 4, strength, score };
}

export function validateSignIn({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateSignUp({ name, email, role, studentId, password, confirmPassword }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Full name is required';
  if (!email.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
  if (!role) errors.role = 'Please select a role';
  if (role === 'student' && !studentId?.trim()) {
    errors.studentId = 'Student ID is required';
  }
  if (!password) errors.password = 'Password is required';
  else if (!validatePasswordStrength(password).isValid) {
    errors.password = 'Password does not meet requirements';
  }
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
}
