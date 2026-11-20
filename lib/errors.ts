export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "DuplicateEmailError";
  }
}

export class DuplicateCodeError extends Error {
  constructor() {
    super("Referral code already used");
    this.name = "DuplicateCodeError";
  }
}
