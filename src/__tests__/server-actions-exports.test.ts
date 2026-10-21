import { describe, it, expect } from "vitest";
import * as eventActions from "@/app/actions/event-actions";
import * as registrationActions from "@/app/actions/registration-actions";
import * as roundActions from "@/app/actions/round-actions";
import * as certificateActions from "@/app/actions/certificate-actions";
import * as communicationActions from "@/app/actions/communication-actions";
import * as exportActions from "@/app/actions/export-actions";
import * as participantActions from "@/app/actions/participant-actions";
import * as searchActions from "@/app/actions/search-actions";

describe("Server Actions Export Compliance ('use server' rules)", () => {
  const actionModules = [
    { name: "event-actions", module: eventActions },
    { name: "registration-actions", module: registrationActions },
    { name: "round-actions", module: roundActions },
    { name: "certificate-actions", module: certificateActions },
    { name: "communication-actions", module: communicationActions },
    { name: "export-actions", module: exportActions },
    { name: "participant-actions", module: participantActions },
    { name: "search-actions", module: searchActions },
  ];

  actionModules.forEach(({ name, module }) => {
    it(`strictly exports only async functions in ${name}`, () => {
      const exportKeys = Object.keys(module);
      expect(exportKeys.length).toBeGreaterThan(0);

      exportKeys.forEach((key) => {
        const exportedItem = (module as Record<string, unknown>)[key];
        // Must be a function, never an object, schema, or constant
        expect(
          typeof exportedItem,
          `Export '${key}' in ${name} must be a function, but found ${typeof exportedItem}`
        ).toBe("function");
      });
    });
  });
});
