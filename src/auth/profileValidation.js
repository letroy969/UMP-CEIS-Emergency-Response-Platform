const REGISTRATION_ROLES = new Set(["student", "staff", "responder", "admin"]);
const STUDENT_EMAIL = /^\d{9}@ump\.ac\.za$/;
const UMP_EMAIL = /^[^\s@]+@ump\.ac\.za$/;

export function validateRegistrationEmail(email, role = "student") {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!REGISTRATION_ROLES.has(role)) {
    throw new Error("Choose a valid account type.");
  }
  if (role === "student") {
    if (normalizedEmail.length !== 19 || !STUDENT_EMAIL.test(normalizedEmail)) {
      throw new Error("Student accounts require a 9-digit student number followed by @ump.ac.za (19 characters total), for example 230021646@ump.ac.za.");
    }
    return normalizedEmail;
  }
  if (normalizedEmail.length > 254 || !UMP_EMAIL.test(normalizedEmail)) {
    throw new Error(`Use your official UMP ${role} email address ending in @ump.ac.za.`);
  }
  return normalizedEmail;
}

export function normalizeEmergencyPhone(value) {
  const input = value.trim();
  const compact = input.replace(/[()\s.-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+27${compact.slice(1)}`;
  if (/^27\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

export function validateEmergencyContact(contact) {
  const name = contact.name.trim();
  const relationship = contact.relationship.trim();
  const phone = normalizeEmergencyPhone(contact.phone);
  if (name.length < 2 || name.length > 80) {
    throw new Error("Contact name must be between 2 and 80 characters.");
  }
  if (relationship.length < 2 || relationship.length > 50) {
    throw new Error("Relationship must be between 2 and 50 characters.");
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error("Enter a valid phone number, such as 082 123 4567 or +27821234567.");
  }
  return { name, relationship, phone };
}

export function validateStudentProfile(profile) {
  const fullName = profile.fullName.trim();
  const faculty = profile.faculty.trim();
  const department = profile.department.trim();
  const year = Number(profile.year);
  if (fullName.length < 2 || fullName.length > 100) {
    throw new Error("Name must be between 2 and 100 characters.");
  }
  if (faculty.length > 100 || department.length > 100) {
    throw new Error("Faculty and department must each be 100 characters or fewer.");
  }
  if (!Number.isInteger(year) || year < 1 || year > 8) {
    throw new Error("Study year must be a number between 1 and 8.");
  }
  return { fullName, faculty, department, year };
}
