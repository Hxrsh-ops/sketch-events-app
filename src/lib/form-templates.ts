import { RegistrationFormSchema, FormFieldOption } from "@/types";

/**
 * Official SRMIST Ramapuram academic structure and department/program offerings.
 * Organized strictly by Faculty and School groupings.
 */
export const SRMIST_RAMAPURAM_DEPARTMENTS: FormFieldOption[] = [
  // =========================================================================
  // Faculty of Engineering & Technology
  // =========================================================================
  {
    label: "Computer Science & Engineering (CSE)",
    value: "Computer Science & Engineering (CSE)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Artificial Intelligence (AI)",
    value: "Artificial Intelligence (AI)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Artificial Intelligence & Machine Learning (AIML)",
    value: "Artificial Intelligence & Machine Learning (AIML)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Big Data Analytics (BDA)",
    value: "Big Data Analytics (BDA)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Cyber Security",
    value: "Cyber Security (FET)",
    group: "Faculty of Engineering & Technology",
    description: "Faculty of Engineering & Technology",
  },
  {
    label: "Cloud Computing",
    value: "Cloud Computing",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Gaming Technology",
    value: "Gaming Technology",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Internet of Things (IoT)",
    value: "Internet of Things (IoT)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Data Science",
    value: "Data Science (FET)",
    group: "Faculty of Engineering & Technology",
    description: "Faculty of Engineering & Technology",
  },
  {
    label: "Computer Science & Business Systems (CSBS)",
    value: "Computer Science & Business Systems (CSBS)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Information Technology (IT)",
    value: "Information Technology (IT)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Electronics & Communication Engineering (ECE)",
    value: "Electronics & Communication Engineering (ECE)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Electronics and Computer Engineering",
    value: "Electronics and Computer Engineering",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Mechanical Engineering",
    value: "Mechanical Engineering",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Mechanical and Automation Engineering",
    value: "Mechanical and Automation Engineering",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Civil Engineering",
    value: "Civil Engineering",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Electrical & Electronics Engineering (EEE)",
    value: "Electrical & Electronics Engineering (EEE)",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Biomedical Engineering",
    value: "Biomedical Engineering",
    group: "Faculty of Engineering & Technology",
  },
  {
    label: "Biotechnology",
    value: "Biotechnology (FET)",
    group: "Faculty of Engineering & Technology",
    description: "Faculty of Engineering & Technology",
  },

  // =========================================================================
  // Faculty of Science & Humanities
  // =========================================================================
  {
    label: "Computer Science",
    value: "Computer Science (FSH)",
    group: "Faculty of Science & Humanities",
    description: "Faculty of Science & Humanities",
  },
  {
    label: "Cyber Security",
    value: "Cyber Security (FSH)",
    group: "Faculty of Science & Humanities",
    description: "Faculty of Science & Humanities",
  },
  {
    label: "Artificial Intelligence & Machine Learning",
    value: "Artificial Intelligence & Machine Learning (FSH)",
    group: "Faculty of Science & Humanities",
    description: "Faculty of Science & Humanities",
  },
  {
    label: "Applied Data Science",
    value: "Applied Data Science",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Computer Applications (BCA)",
    value: "Computer Applications (BCA)",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Commerce",
    value: "Commerce",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Corporate Secretaryship",
    value: "Corporate Secretaryship",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Accounting & Finance",
    value: "Accounting & Finance",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Information System Management",
    value: "Information System Management",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Visual Communication",
    value: "Visual Communication",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Film Technology",
    value: "Film Technology",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Journalism & Mass Communication",
    value: "Journalism & Mass Communication",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Fashion Designing",
    value: "Fashion Designing",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Biotechnology",
    value: "Biotechnology (FSH)",
    group: "Faculty of Science & Humanities",
    description: "Faculty of Science & Humanities",
  },
  {
    label: "English",
    value: "English",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Psychology",
    value: "Psychology",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Physics",
    value: "Physics",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Chemistry",
    value: "Chemistry",
    group: "Faculty of Science & Humanities",
  },
  {
    label: "Mathematics",
    value: "Mathematics",
    group: "Faculty of Science & Humanities",
  },

  // =========================================================================
  // School of Management
  // =========================================================================
  {
    label: "Business Administration (BBA)",
    value: "Business Administration (BBA)",
    group: "School of Management",
  },
  {
    label: "Management (MBA)",
    value: "Management (MBA)",
    group: "School of Management",
  },

  // =========================================================================
  // School of Environment, Architecture & Design
  // =========================================================================
  {
    label: "Architecture (B.Arch)",
    value: "Architecture (B.Arch)",
    group: "School of Environment, Architecture & Design",
  },
  {
    label: "Architecture (M.Arch)",
    value: "Architecture (M.Arch)",
    group: "School of Environment, Architecture & Design",
  },
  {
    label: "Design (B.Des)",
    value: "Design (B.Des)",
    group: "School of Environment, Architecture & Design",
  },

  // =========================================================================
  // Dental Sciences
  // =========================================================================
  {
    label: "Dental Surgery (BDS)",
    value: "Dental Surgery (BDS)",
    group: "Dental Sciences",
  },
  {
    label: "Endodontics",
    value: "Endodontics",
    group: "Dental Sciences",
  },
  {
    label: "Oral & Maxillofacial Surgery",
    value: "Oral & Maxillofacial Surgery",
    group: "Dental Sciences",
  },
  {
    label: "Orthodontics",
    value: "Orthodontics",
    group: "Dental Sciences",
  },
  {
    label: "Periodontology",
    value: "Periodontology",
    group: "Dental Sciences",
  },
  {
    label: "Prosthodontics",
    value: "Prosthodontics",
    group: "Dental Sciences",
  },
  {
    label: "Oral Medicine & Radiology",
    value: "Oral Medicine & Radiology",
    group: "Dental Sciences",
  },
  {
    label: "Oral Pathology",
    value: "Oral Pathology",
    group: "Dental Sciences",
  },
  {
    label: "Public Health Dentistry",
    value: "Public Health Dentistry",
    group: "Dental Sciences",
  },

  // =========================================================================
  // Other Option
  // =========================================================================
  {
    label: "Other Academic Department / Program",
    value: "Other",
    group: "Other",
  },
];

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
          description: "Select your active university major or academic program",
          required: true,
          options: SRMIST_RAMAPURAM_DEPARTMENTS,
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
          description: "Select your active university major or academic program",
          required: true,
          options: SRMIST_RAMAPURAM_DEPARTMENTS,
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
        description: "Select academic department or program",
        required: true,
        options: SRMIST_RAMAPURAM_DEPARTMENTS,
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
