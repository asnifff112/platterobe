import path from "path";
import fs from "fs";

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

import { verifyAdminCredentials, createSessionToken, verifySessionToken } from "../src/lib/auth";

console.log("==================================================");
console.log("PLATTEROBE END-TO-END AUTHENTICATION FLOW TEST");
console.log("==================================================");

const targetEmail = "platterobe@gmail.com";
const activePassword = process.env.ADMIN_PASSWORD;

if (!activePassword) {
  console.error("FAIL: ADMIN_PASSWORD is not set in environment");
  process.exit(1);
}

// 1. Verify New Active Credentials
console.log("\n[TEST 1] Verifying active administrator login credentials:");
const validResult = verifyAdminCredentials(targetEmail, activePassword);
if (!validResult.isValid || !validResult.user) {
  console.error("FAIL: verifyAdminCredentials failed for active password");
  process.exit(1);
}
if (validResult.user.role !== "admin") {
  console.error("FAIL: Expected admin role, got: " + validResult.user.role);
  process.exit(1);
}
console.log("  [PASS] Successfully verified active admin login:", validResult.user.email, "| Role:", validResult.user.role);

// 2. Case Insensitivity & Trimming
console.log("\n[TEST 2] Verifying case-insensitivity and email whitespace trimming:");
const upperResult = verifyAdminCredentials("  PLATTEROBE@GMAIL.COM  ", activePassword);
if (!upperResult.isValid) {
  console.error("FAIL: Case-insensitive login failed");
  process.exit(1);
}
console.log("  [PASS] Upper-case and padded email handled successfully");

// 3. Reject Old / Deprecated Password
console.log("\n[TEST 3] Verifying rejection of deprecated initial password:");
const oldPassResult = verifyAdminCredentials(targetEmail, "platterobe2026!");
if (oldPassResult.isValid) {
  console.error("FAIL: Old password was accepted! Security breach.");
  process.exit(1);
}
console.log("  [PASS] Old password correctly rejected");

// 4. Reject Wrong Password
console.log("\n[TEST 4] Verifying rejection of incorrect password:");
const wrongPassResult = verifyAdminCredentials(targetEmail, "wrongSecretPassword123!");
if (wrongPassResult.isValid) {
  console.error("FAIL: Incorrect password was accepted! Security breach.");
  process.exit(1);
}
console.log("  [PASS] Incorrect password correctly rejected");

// 5. Reject Invalid / Non-existent User
console.log("\n[TEST 5] Verifying rejection of non-admin / non-existent accounts:");
const nonExistentResult = verifyAdminCredentials("intruder@example.com", activePassword);
if (nonExistentResult.isValid) {
  console.error("FAIL: Non-existent account was accepted! Security breach.");
  process.exit(1);
}
console.log("  [PASS] Non-existent user correctly rejected");

// 6. Test Session Token Creation & Verification
console.log("\n[TEST 6] Verifying session token creation and HMAC validation:");
const sessionToken = createSessionToken(validResult.user.id, validResult.user.email, validResult.user.role);
const verifiedSession = verifySessionToken(sessionToken);

if (!verifiedSession.isValid || verifiedSession.email !== targetEmail || verifiedSession.role !== "admin") {
  console.error("FAIL: Session token verification failed");
  process.exit(1);
}
console.log("  [PASS] Session token generated and verified (Role:", verifiedSession.role, ")");

// 7. Test Session Token Tampering Defense
console.log("\n[TEST 7] Verifying defense against tampered session tokens:");
const tamperedToken = sessionToken.slice(0, -4) + "abcd";
const tamperedResult = verifySessionToken(tamperedToken);
if (tamperedResult.isValid) {
  console.error("FAIL: Tampered session token was accepted! Security breach.");
  process.exit(1);
}
console.log("  [PASS] Tampered session token correctly rejected");

console.log("\n==================================================");
console.log("ALL 7 END-TO-END AUTH CHECKS PASSED SUCCESSFULLY!");
console.log("==================================================");
