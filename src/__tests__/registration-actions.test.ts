/**
 * SKETCHHUB — Registration Systems Type and Schema Tests
 */

import {
  individualRegistrationSchema,
  teamRegistrationSchema,
  teamMemberSchema,
  RegistrationActionInput,
} from "../app/actions/registration-actions";

describeSchemaTests();

function describeSchemaTests() {
  // Test valid individual schema
  const validIndividual: RegistrationActionInput = {
    eventSlug: "typography-motion-expo",
    mode: "individual",
    attendeeName: "Ananya Sharma",
    email: "ananya@srmist.edu.in",
    answers: {},
  };
  const indResult = individualRegistrationSchema.safeParse(validIndividual);
  if (!indResult.success) {
    throw new Error("Failed individual schema parsing");
  }

  // Test valid team schema
  const validTeam: RegistrationActionInput = {
    eventSlug: "diet-code-2026",
    mode: "team",
    attendeeName: "Aarav Patel",
    email: "aarav@srmist.edu.in",
    teamName: "Syntax Mavericks",
    teamMembers: [
      {
        name: "Rohan Varma",
        email: "rohan@srmist.edu.in",
      },
    ],
    answers: {},
  };
  const teamResult = teamRegistrationSchema.safeParse(validTeam);
  if (!teamResult.success) {
    throw new Error("Failed team schema parsing");
  }

  // Test invalid email
  const invalidEmailResult = teamMemberSchema.safeParse({
    name: "John",
    email: "not-an-email",
  });
  if (invalidEmailResult.success) {
    throw new Error("Schema should have rejected invalid email");
  }
}
