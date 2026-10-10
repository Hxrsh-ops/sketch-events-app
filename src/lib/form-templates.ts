import { RegistrationFormSchema } from "@/types";

/**
 * Reference Configuration modeled directly from the Diet CODE Registration Form PDF
 */
export const DIET_CODE_TEMPLATE: RegistrationFormSchema = {
  version: 1,
  teamConfig: {
    enabled: true,
    minSize: 1,
    maxSize: 3,
    teamNameRequired: true,
    teamSizeFieldId: "team_size",
  },
  sections: [
    {
      id: "sec_event_intro",
      title: "Diet CODE — Event Introduction",
      description:
        "Diet CODE is a 3-hour beginner-friendly technology event where participants learn how to turn ideas into digital solutions and build functional websites using no-code/low-code platforms. With an interactive learning session followed by a time-bound website-building challenge, the event encourages creativity, teamwork, problem-solving, and innovation. No prior coding experience is required.\n\nSKETCH MAIL: sketch.srm@gmail.com • POC: 9444404013 • DATE: 26th SEPTEMBER 2026 • FOLLOW SKETCHSRM ON INSTAGRAM FOR MORE UPDATES",
      fields: [
        {
          id: "team_name",
          type: "text",
          label: "TEAM NAME",
          description: "Enter your official team name for competition leaderboards",
          placeholder: "e.g., Syntax Mavericks",
          required: true,
        },
        {
          id: "team_size",
          type: "radio",
          label: "TEAM SIZE",
          description: "Mark only one oval. Select total number of participants in your team.",
          required: true,
          options: [
            { label: "1 (Solo Technologist)", value: "1" },
            { label: "2 (Duo)", value: "2" },
            { label: "3 (Trio)", value: "3" },
          ],
        },
      ],
    },
    {
      id: "sec_leader",
      title: "Team Leader Details",
      description: "Primary point of contact for project submission and check-in desk verification.",
      fields: [
        {
          id: "leader_name",
          type: "text",
          label: "TEAM LEADER NAME",
          placeholder: "e.g., Aarav Sharma",
          required: true,
        },
        {
          id: "department",
          type: "select",
          label: "DEPARTMENT OF STUDY",
          description: "Select your active university major",
          required: true,
          options: [
            { label: "Computer Science & Engineering (CSE)", value: "CSE" },
            { label: "Artificial Intelligence & Machine Learning (AIML)", value: "AIML" },
            { label: "Data Science & Computing (C-Tech)", value: "Data Science" },
            { label: "Electronics & Communication Engineering (ECE)", value: "ECE" },
            { label: "Electrical & Electronics Engineering (EEE)", value: "EEE" },
            { label: "Information Technology (IT)", value: "IT" },
            { label: "Design, Visual Arts & Media Studies", value: "Design" },
            { label: "Other Academic Department", value: "Other" },
          ],
        },
        {
          id: "register_number",
          type: "text",
          label: "REGISTER NUMBER",
          placeholder: "e.g., RA2311003010142",
          description: "Official University Student Registration ID",
          required: true,
        },
        {
          id: "leader_phone",
          type: "phone",
          label: "TEAM LEADER PHONE NUMBER",
          placeholder: "e.g., +91 98765 43210",
          required: true,
        },
        {
          id: "leader_email",
          type: "email",
          label: "SRM EMAIL ID",
          placeholder: "e.g., as9921@srmist.edu.in",
          description: "Verification pass and desk credentials will be dispatched to this email",
          required: true,
        },
      ],
    },
    {
      id: "sec_member_1",
      title: "Team Member 1",
      description: "Required when Team Size is 2 or 3.",
      fields: [
        {
          id: "member_1_name",
          type: "text",
          label: "TEAM MEMBER 1 NAME",
          placeholder: "Full Name",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "not_equals",
            value: "1",
          },
        },
        {
          id: "member_1_phone",
          type: "phone",
          label: "TEAM MEMBER 1 PHONE NUMBER",
          placeholder: "+91 98765 43210",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "not_equals",
            value: "1",
          },
        },
        {
          id: "member_1_email",
          type: "email",
          label: "TEAM MEMBER 1 SRM MAIL ID",
          placeholder: "member1@srmist.edu.in",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "not_equals",
            value: "1",
          },
        },
      ],
    },
    {
      id: "sec_member_2",
      title: "Team Member 2",
      description: "Required when Team Size is 3.",
      fields: [
        {
          id: "member_2_name",
          type: "text",
          label: "TEAM MEMBER 2 NAME",
          placeholder: "Full Name",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "equals",
            value: "3",
          },
        },
        {
          id: "member_2_phone",
          type: "phone",
          label: "TEAM MEMBER 2 PHONE NUMBER",
          placeholder: "+91 98765 43210",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "equals",
            value: "3",
          },
        },
        {
          id: "member_2_email",
          type: "email",
          label: "TEAM MEMBER 2 SRM MAIL ID",
          placeholder: "member2@srmist.edu.in",
          required: true,
          conditional: {
            targetFieldId: "team_size",
            operator: "equals",
            value: "3",
          },
        },
      ],
    },
    {
      id: "sec_community",
      title: "Community & Updates",
      description: "Stay connected for challenge problem statements and timings.",
      fields: [
        {
          id: "whatsapp_notice",
          type: "info",
          label: "JOIN OUR WHATSAPP GROUP FOR UPDATES!",
          description:
            "Connect directly with event mentors, check-in desk marshals, and announcement channels:\nhttps://chat.whatsapp.com/Bx0YDxNSG595VhfaqWycgT?mode=gi_t",
        },
      ],
    },
  ],
};

/**
 * Standard Individual Registration Template
 */
export const STANDARD_INDIVIDUAL_TEMPLATE: RegistrationFormSchema = {
  version: 1,
  sections: [
    {
      id: "sec_personal",
      title: "Attendee Information",
      description: "Core participant details for terminal check-in badge generation.",
      fields: [
        {
          id: "full_name",
          type: "text",
          label: "Full Name",
          placeholder: "e.g., Alex Morgan",
          required: true,
        },
        {
          id: "email",
          type: "email",
          label: "Email Address",
          placeholder: "e.g., alex.morgan@college.edu",
          description: "Your official QR event pass is delivered to this inbox",
          required: true,
        },
        {
          id: "phone",
          type: "phone",
          label: "Phone / WhatsApp Contact",
          placeholder: "e.g., +91 98765 43210",
          required: false,
        },
      ],
    },
    {
      id: "sec_academic",
      title: "Academic Background",
      description: "Department and seniority representation.",
      fields: [
        {
          id: "department",
          type: "select",
          label: "Department of Study",
          required: true,
          options: [
            { label: "Computer Science & Engineering", value: "Computer Science" },
            { label: "Visual Arts & Communication", value: "Visual Arts" },
            { label: "Industrial & Product Design", value: "Product Design" },
            { label: "Human-Computer Interaction (HCI)", value: "HCI" },
            { label: "Information Technology", value: "Information Technology" },
            { label: "Other Academic Department", value: "Other" },
          ],
        },
        {
          id: "academic_year",
          type: "select",
          label: "Academic Year",
          required: false,
          options: [
            { label: "1st Year (Freshman)", value: "1st Year" },
            { label: "2nd Year (Sophomore)", value: "2nd Year" },
            { label: "3rd Year (Junior)", value: "3rd Year" },
            { label: "4th Year (Senior)", value: "4th Year" },
            { label: "Postgraduate / Alumni", value: "Postgraduate / Alumni" },
          ],
        },
        {
          id: "portfolio_url",
          type: "url",
          label: "Portfolio or GitHub Profile",
          placeholder: "https://github.com/username or portfolio.com",
          required: false,
        },
      ],
    },
  ],
};

/**
 * Standard Multi-Stage Hackathon Template
 */
export const HACKATHON_TEAM_TEMPLATE: RegistrationFormSchema = {
  version: 1,
  teamConfig: {
    enabled: true,
    minSize: 2,
    maxSize: 4,
    teamNameRequired: true,
    memberFields: [
      {
        id: "member_name",
        type: "text",
        label: "Member Full Name",
        placeholder: "Full Name",
        required: true,
      },
      {
        id: "member_email",
        type: "email",
        label: "Member Email",
        placeholder: "member@college.edu",
        required: true,
      },
      {
        id: "member_dept",
        type: "select",
        label: "Department",
        required: true,
        options: [
          { label: "Computer Science", value: "Computer Science" },
          { label: "Design / UI", value: "Design" },
          { label: "Information Technology", value: "IT" },
          { label: "Other", value: "Other" },
        ],
      },
    ],
  },
  sections: [
    {
      id: "sec_team_profile",
      title: "Team Overview",
      description: "Define team identity and challenge focus.",
      fields: [
        {
          id: "team_name",
          type: "text",
          label: "Team Name",
          placeholder: "e.g., Pixel Forge",
          required: true,
        },
        {
          id: "hackathon_track",
          type: "select",
          label: "Challenge Track",
          description: "Primary problem statement domain",
          required: true,
          options: [
            { label: "Generative UI & Design Systems", value: "Generative UI" },
            { label: "AI & Autonomous Agents", value: "AI Agents" },
            { label: "Campus Life & Student Tools", value: "Campus Tools" },
            { label: "Open Innovation", value: "Open Innovation" },
          ],
        },
      ],
    },
    {
      id: "sec_captain",
      title: "Team Captain Information",
      description: "The team captain serves as project owner and primary desk check-in holder.",
      fields: [
        {
          id: "captain_name",
          type: "text",
          label: "Captain Full Name",
          placeholder: "e.g., Maya Patel",
          required: true,
        },
        {
          id: "captain_email",
          type: "email",
          label: "Captain Email Address",
          placeholder: "e.g., maya@college.edu",
          required: true,
        },
        {
          id: "captain_phone",
          type: "phone",
          label: "Captain Phone Contact",
          placeholder: "+91 98765 43210",
          required: true,
        },
        {
          id: "project_repo",
          type: "url",
          label: "Proposed GitHub / Figma Link",
          placeholder: "https://github.com/...",
          required: false,
        },
      ],
    },
  ],
};

/**
 * Returns a deep copy of a schema template to prevent mutations
 */
export function cloneFormSchema(schema: RegistrationFormSchema): RegistrationFormSchema {
  return JSON.parse(JSON.stringify(schema));
}
