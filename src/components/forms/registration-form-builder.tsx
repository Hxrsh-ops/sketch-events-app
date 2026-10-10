"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings2,
  Eye,
  FileText,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  ChevronRight,
  Radio,
  CheckSquare,
  Globe,
  Calendar,
  Info,
  ClipboardList,
  Files,
  Users,
  HelpCircle,
  Layers,
  Smartphone,
  Monitor,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  RegistrationFormSchema,
  FormSection,
  FormField,
  FormFieldType,
  FormFieldOption,
  ConditionalRule,
} from "@/types";
import {
  DIET_CODE_TEMPLATE,
  STANDARD_INDIVIDUAL_TEMPLATE,
  HACKATHON_TEAM_TEMPLATE,
  cloneFormSchema,
} from "@/lib/form-templates";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";

interface RegistrationFormBuilderProps {
  schema: RegistrationFormSchema;
  onChange: (schema: RegistrationFormSchema) => void;
  participationMode: string;
}

const FIELD_TYPE_DEFINITIONS: {
  type: FormFieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    type: "text",
    label: "Short Text",
    icon: FileText,
    description: "Names, student IDs, headlines",
  },
  {
    type: "textarea",
    label: "Paragraph",
    icon: AlignLeft,
    description: "Bio, ideas, accessibility requests",
  },
  {
    type: "email",
    label: "Email Address",
    icon: Mail,
    description: "University or personal email",
  },
  {
    type: "phone",
    label: "Phone / WhatsApp",
    icon: Phone,
    description: "Mobile contact number",
  },
  {
    type: "number",
    label: "Number",
    icon: Hash,
    description: "Year, team size, numeric score",
  },
  {
    type: "select",
    label: "Dropdown Select",
    icon: ChevronDown,
    description: "Department, major, campus branch",
  },
  {
    type: "radio",
    label: "Single Choice",
    icon: Radio,
    description: "Dietary, track, 1-of-N options",
  },
  {
    type: "checkbox",
    label: "Multiple Choice",
    icon: CheckSquare,
    description: "Skills, checkboxes, terms",
  },
  {
    type: "url",
    label: "Web Link / URL",
    icon: Globe,
    description: "Portfolio, GitHub, Figma, LinkedIn",
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    description: "Birthdate, pass validity, milestone",
  },
  {
    type: "info",
    label: "Notice / Callout",
    icon: Info,
    description: "WhatsApp link, instructions, rules",
  },
];

export function RegistrationFormBuilder({
  schema,
  onChange,
  participationMode,
}: RegistrationFormBuilderProps) {
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({
    team_size: "2",
  });
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Initial template detection
  const detectInitialTemplate = (): "diet_code" | "individual" | "team" | "clean" => {
    if (
      schema.teamConfig?.teamSizeFieldId === "team_size" ||
      schema.sections.some((s) => s.title.toLowerCase().includes("diet code"))
    ) {
      return "diet_code";
    }
    if (schema.teamConfig?.enabled || participationMode === "team") {
      return "team";
    }
    return "individual";
  };

  const [activeTemplate, setActiveTemplate] = useState<"diet_code" | "individual" | "team" | "clean" | null>(detectInitialTemplate);
  const [isCustomized, setIsCustomized] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<"diet_code" | "individual" | "team" | "clean" | null>(null);

  // Helper to update schema
  const updateSchema = (next: RegistrationFormSchema) => {
    setIsCustomized(true);
    onChange(next);
  };

  // Add a new section
  const handleAddSection = () => {
    const newSection: FormSection = {
      id: `sec_${Date.now()}`,
      title: `Section ${schema.sections.length + 1}`,
      description: "",
      fields: [],
    };
    updateSchema({
      ...schema,
      sections: [...schema.sections, newSection],
    });
  };

  // Update section title/description
  const handleUpdateSection = (
    sectionId: string,
    key: "title" | "description",
    val: string
  ) => {
    const updated = schema.sections.map((s) =>
      s.id === sectionId ? { ...s, [key]: val } : s
    );
    updateSchema({ ...schema, sections: updated });
  };

  // Delete section
  const handleDeleteSection = (sectionId: string) => {
    if (schema.sections.length <= 1) {
      setWarningMessage("At least one form section is required.");
      return;
    }
    const updated = schema.sections.filter((s) => s.id !== sectionId);
    updateSchema({ ...schema, sections: updated });
  };

  // Add a field to the specified section
  const handleAddField = (sectionId: string, type: FormFieldType) => {
    const typeDef = FIELD_TYPE_DEFINITIONS.find((t) => t.type === type);
    const uniqueId = `f_${type}_${Date.now().toString(36)}`;

    const newField: FormField = {
      id: uniqueId,
      type,
      label: typeDef ? typeDef.label : "New Field",
      placeholder: "",
      description: "",
      required: type !== "info",
      options:
        type === "select" || type === "radio" || type === "checkbox"
          ? [
              { label: "Option 1", value: "opt_1" },
              { label: "Option 2", value: "opt_2" },
            ]
          : undefined,
    };

    const updated = schema.sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: [...s.fields, newField],
        };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
    setExpandedFieldId(uniqueId);
  };

  // Duplicate a field
  const handleDuplicateField = (sectionId: string, field: FormField) => {
    const clone: FormField = {
      ...JSON.parse(JSON.stringify(field)),
      id: `f_${field.type}_${Date.now().toString(36)}`,
      label: `${field.label} (Copy)`,
    };

    const updated = schema.sections.map((s) => {
      if (s.id === sectionId) {
        const idx = s.fields.findIndex((f) => f.id === field.id);
        const copy = [...s.fields];
        copy.splice(idx + 1, 0, clone);
        return { ...s, fields: copy };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
    setExpandedFieldId(clone.id);
  };

  // Delete a field (with warning check for conditional references)
  const handleDeleteField = (sectionId: string, fieldId: string) => {
    // Check if any other field references this in a conditional rule
    const allFields = schema.sections.flatMap((s) => s.fields);
    const dependent = allFields.find(
      (f) => f.conditional && f.conditional.targetFieldId === fieldId
    );

    if (dependent) {
      setWarningMessage(
        `Field cannot be removed yet because "${dependent.label}" conditionally depends on it. Remove the conditional rule first.`
      );
      return;
    }

    const updated = schema.sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.filter((f) => f.id !== fieldId),
        };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
    if (expandedFieldId === fieldId) {
      setExpandedFieldId(null);
    }
  };

  // Move field up or down
  const handleMoveField = (
    sectionId: string,
    fieldIndex: number,
    direction: "up" | "down"
  ) => {
    const targetIdx = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;

    const updated = schema.sections.map((s) => {
      if (s.id === sectionId) {
        if (targetIdx < 0 || targetIdx >= s.fields.length) return s;
        const copy = [...s.fields];
        const [moved] = copy.splice(fieldIndex, 1);
        copy.splice(targetIdx, 0, moved);
        return { ...s, fields: copy };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
  };

  // Update field configuration
  const handleUpdateField = (
    sectionId: string,
    fieldId: string,
    partial: Partial<FormField>
  ) => {
    const updated = schema.sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          fields: s.fields.map((f) =>
            f.id === fieldId ? { ...f, ...partial } : f
          ),
        };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
  };

  // Options editor for choice types
  const handleAddOption = (sectionId: string, fieldId: string) => {
    const section = schema.sections.find((s) => s.id === sectionId);
    const field = section?.fields.find((f) => f.id === fieldId);
    const options = field?.options || [];
    const nextNum = options.length + 1;

    handleUpdateField(sectionId, fieldId, {
      options: [
        ...options,
        { label: `Option ${nextNum}`, value: `opt_${Date.now().toString(36)}` },
      ],
    });
  };

  const handleUpdateOption = (
    sectionId: string,
    fieldId: string,
    optIdx: number,
    label: string,
    value: string
  ) => {
    const section = schema.sections.find((s) => s.id === sectionId);
    const field = section?.fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;

    const copy = [...field.options];
    copy[optIdx] = { label, value: value || label.toLowerCase().replace(/\s+/g, "_") };
    handleUpdateField(sectionId, fieldId, { options: copy });
  };

  const handleRemoveOption = (
    sectionId: string,
    fieldId: string,
    optIdx: number
  ) => {
    const section = schema.sections.find((s) => s.id === sectionId);
    const field = section?.fields.find((f) => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 1) return;

    const copy = field.options.filter((_, i) => i !== optIdx);
    handleUpdateField(sectionId, fieldId, { options: copy });
  };

  // Load Presets with unsaved change safety
  const requestLoadTemplate = (t: "diet_code" | "individual" | "team" | "clean") => {
    if (isCustomized) {
      setPendingTemplate(t);
    } else {
      executeLoadTemplate(t);
    }
  };

  const executeLoadTemplate = (templateType: "diet_code" | "individual" | "team" | "clean") => {
    if (templateType === "diet_code") {
      onChange(cloneFormSchema(DIET_CODE_TEMPLATE));
      setActiveTemplate("diet_code");
    } else if (templateType === "individual") {
      onChange(cloneFormSchema(STANDARD_INDIVIDUAL_TEMPLATE));
      setActiveTemplate("individual");
    } else if (templateType === "team") {
      onChange(cloneFormSchema(HACKATHON_TEAM_TEMPLATE));
      setActiveTemplate("team");
    } else {
      onChange({
        version: 1,
        sections: [
          {
            id: `sec_main_${Date.now()}`,
            title: "General Information",
            description: "Attendee profile details",
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
                placeholder: "e.g., alex@college.edu",
                required: true,
              },
            ],
          },
        ],
      });
      setActiveTemplate("clean");
    }
    setIsCustomized(false);
    setPendingTemplate(null);
    setWarningMessage(null);
  };

  // All fields before a given field (used to prevent circular conditional references)
  const getEligibleConditionalTargets = (currentFieldId: string) => {
    const eligible: { id: string; label: string; options?: FormFieldOption[] }[] = [];
    let stop = false;

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.id === currentFieldId) {
          stop = true;
          break;
        }
        // Only select, radio, or checkbox or text make sensible conditional triggers
        if (field.type !== "info") {
          eligible.push({
            id: field.id,
            label: field.label,
            options: field.options,
          });
        }
      }
      if (stop) break;
    }
    return eligible;
  };

  const totalFields = schema.sections.reduce(
    (acc, s) => acc + s.fields.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Pending Template Overwrite Confirmation Dialog */}
      {pendingTemplate && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-[#25292F] text-white p-3.5 shadow-md border border-[#30353A]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-xs">
              Current form contains custom edits. Loading the{" "}
              <strong className="underline">
                {pendingTemplate === "diet_code"
                  ? "Diet CODE Reference"
                  : pendingTemplate === "individual"
                  ? "Standard Individual"
                  : pendingTemplate === "team"
                  ? "Multi-Member Team"
                  : "Clean Layout"}
              </strong>{" "}
              template will replace all existing questions.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setPendingTemplate(null)}
              className="px-3 py-1 text-xs rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => executeLoadTemplate(pendingTemplate)}
              className="px-3 py-1 text-xs font-bold rounded-full bg-white text-[#17191C] hover:bg-white/90 transition-colors shadow-xs"
            >
              Confirm & Overwrite
            </button>
          </div>
        </div>
      )}

      {/* Warning Notice Banner */}
      {warningMessage && (
        <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-[11px] font-bold underline hover:no-underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Bar: Template Quick-Actions & Mobile Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
            Templates:
          </span>

          {/* Diet CODE Reference Button */}
          <button
            type="button"
            onClick={() => requestLoadTemplate("diet_code")}
            aria-pressed={activeTemplate === "diet_code"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              activeTemplate === "diet_code"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                : "border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#22262A]"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            <span>Diet CODE Reference</span>
            {activeTemplate === "diet_code" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 dark:text-amber-800 border border-amber-500/30">
                Customized
              </span>
            )}
          </button>

          {/* Standard Individual Button */}
          <button
            type="button"
            onClick={() => requestLoadTemplate("individual")}
            aria-pressed={activeTemplate === "individual"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              activeTemplate === "individual"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                : "border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#22262A]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Standard Individual</span>
            {activeTemplate === "individual" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 dark:text-amber-800 border border-amber-500/30">
                Customized
              </span>
            )}
          </button>

          {/* Multi-Member Team Button */}
          <button
            type="button"
            onClick={() => requestLoadTemplate("team")}
            aria-pressed={activeTemplate === "team"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              activeTemplate === "team"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                : "border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] text-[#17191C] dark:text-[#F1F2F3] hover:bg-[#F4F5F6] dark:hover:bg-[#22262A]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Multi-Member Team</span>
            {activeTemplate === "team" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 dark:text-amber-800 border border-amber-500/30">
                Customized
              </span>
            )}
          </button>

          {/* Reset Clean Button */}
          <button
            type="button"
            onClick={() => requestLoadTemplate("clean")}
            aria-pressed={activeTemplate === "clean"}
            className={`inline-flex items-center gap-1 rounded-full border border-dashed border-[#D4D7DC] dark:border-[#30353A] px-2.5 py-1 text-xs transition-colors ${
              activeTemplate === "clean"
                ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315]"
                : "text-[#8A9098] dark:text-[#7D858F] hover:text-[#17191C] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* View Mode Toggle for Responsive Screen Sizes */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex rounded-full border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                activeTab === "builder"
                  ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                  : "text-[#656B73] dark:text-[#8A9098]"
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Canvas ({totalFields})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition-all ${
                activeTab === "preview"
                  ? "bg-[#25292F] dark:bg-[#E8EAED] text-white dark:text-[#111315] shadow-xs"
                  : "text-[#656B73] dark:text-[#8A9098]"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Live Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Responsive 3-Part or Tabbed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Field Library Palette (lg: 3 cols) */}
        <div
          className={`lg:col-span-3 space-y-3 ${
            activeTab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#262A2E] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[#25292F] dark:text-[#E8EAED]" />
                Field Library
              </span>
              <span className="text-[10px] text-[#8A9098] font-mono">
                {FIELD_TYPE_DEFINITIONS.length} Types
              </span>
            </div>

            <p className="text-[11px] text-[#656B73] dark:text-[#8A9098] leading-tight">
              Click any element below to add it into your current active section:
            </p>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {FIELD_TYPE_DEFINITIONS.map((item) => {
                const Icon = item.icon;
                const targetSecId =
                  schema.sections[schema.sections.length - 1]?.id;

                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      if (targetSecId) handleAddField(targetSecId, item.type);
                    }}
                    className="group flex items-center justify-between rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] px-3 py-2 text-left text-xs transition-all hover:border-[#25292F] dark:hover:border-[#E8EAED] hover:bg-white dark:hover:bg-[#1B1E21] hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-[#25292F] border border-[#E5E7EA] dark:border-[#30353A] text-[#17191C] dark:text-[#F1F2F3] group-hover:bg-[#25292F] dark:group-hover:bg-[#E8EAED] group-hover:text-white dark:group-hover:text-[#111315] transition-colors">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-[#17191C] dark:text-[#F1F2F3] truncate">
                          {item.label}
                        </div>
                      </div>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-[#8A9098] group-hover:text-[#17191C] dark:group-hover:text-[#F1F2F3] shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#E5E7EA] dark:border-[#262A2E] pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
                className="w-full rounded-full border-[#E5E7EA] dark:border-[#30353A] text-xs font-semibold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Form Section</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Center Column: Form Canvas (lg: 5 cols or full when in builder) */}
        <div
          className={`space-y-4 ${
            activeTab === "preview"
              ? "hidden lg:block lg:col-span-4"
              : "lg:col-span-5"
          }`}
        >
          {schema.sections.map((section, sIdx) => (
            <div
              key={section.id}
              className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 sm:p-5 shadow-sm space-y-4"
            >
              {/* Section Header Editor */}
              <div className="flex items-start justify-between gap-3 border-b border-[#E5E7EA] dark:border-[#262A2E] pb-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] dark:text-[#656B73]">
                      Section {sIdx + 1}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      handleUpdateSection(section.id, "title", e.target.value)
                    }
                    placeholder="Section Title..."
                    className="w-full font-bold text-sm text-[#17191C] dark:text-[#F1F2F3] bg-transparent border-b border-transparent hover:border-[#E5E7EA] dark:hover:border-[#30353A] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    value={section.description || ""}
                    onChange={(e) =>
                      handleUpdateSection(
                        section.id,
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Optional description / helper banner..."
                    className="w-full text-xs text-[#656B73] dark:text-[#8A9098] bg-transparent border-b border-transparent hover:border-[#E5E7EA] dark:hover:border-[#30353A] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSection(section.id)}
                  className="text-[#8A9098] hover:text-red-500 p-1 rounded-lg transition-colors"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Fields List */}
              <div className="space-y-2.5">
                {section.fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E5E7EA] dark:border-[#30353A] p-4 text-center text-xs text-[#8A9098]">
                    No fields in this section yet. Click a field in the library to add one.
                  </div>
                ) : (
                  section.fields.map((field, fIdx) => {
                    const isExpanded = expandedFieldId === field.id;
                    const eligibleTargets = getEligibleConditionalTargets(
                      field.id
                    );

                    return (
                      <div
                        key={field.id}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? "border-[#25292F] dark:border-[#E8EAED] bg-[#F9FAFB] dark:bg-[#151719] shadow-xs"
                            : "border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] hover:border-[#25292F]/50 dark:hover:border-[#E8EAED]/50"
                        }`}
                      >
                        {/* Compact Field Row */}
                        <div className="flex items-center justify-between p-3 gap-2">
                          <div
                            onClick={() =>
                              setExpandedFieldId(
                                isExpanded ? null : field.id
                              )
                            }
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none"
                          >
                            <span className="rounded-md bg-[#EAECEF] dark:bg-[#25292F] px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase text-[#25292F] dark:text-[#E8EAED]">
                              {field.type}
                            </span>
                            <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3] truncate">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="text-red-500 text-xs font-bold">
                                *
                              </span>
                            )}
                            {field.conditional && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold px-1.5 py-0.5 rounded-full">
                                conditional
                              </span>
                            )}
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveField(section.id, fIdx, "up")
                              }
                              disabled={fIdx === 0}
                              className="p-1 text-[#8A9098] hover:text-[#17191C] dark:hover:text-[#F1F2F3] disabled:opacity-30 rounded"
                              aria-label="Move field up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveField(section.id, fIdx, "down")
                              }
                              disabled={fIdx === section.fields.length - 1}
                              className="p-1 text-[#8A9098] hover:text-[#17191C] dark:hover:text-[#F1F2F3] disabled:opacity-30 rounded"
                              aria-label="Move field down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDuplicateField(section.id, field)
                              }
                              className="p-1 text-[#8A9098] hover:text-[#17191C] dark:hover:text-[#F1F2F3] rounded"
                              aria-label="Duplicate field"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteField(section.id, field.id)
                              }
                              className="p-1 text-[#8A9098] hover:text-red-500 rounded"
                              aria-label="Delete field"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Field Editor */}
                        {isExpanded && (
                          <div className="border-t border-[#E5E7EA] dark:border-[#30353A] p-3.5 space-y-3 bg-white dark:bg-[#1B1E21] rounded-b-xl text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] mb-1">
                                  Field Label *
                                </label>
                                <Input
                                  value={field.label}
                                  onChange={(e) =>
                                    handleUpdateField(section.id, field.id, {
                                      label: e.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] mb-1">
                                  Placeholder
                                </label>
                                <Input
                                  value={field.placeholder || ""}
                                  onChange={(e) =>
                                    handleUpdateField(section.id, field.id, {
                                      placeholder: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[#17191C] dark:text-[#F1F2F3] mb-1">
                                Helper Description
                              </label>
                              <Input
                                value={field.description || ""}
                                onChange={(e) =>
                                  handleUpdateField(section.id, field.id, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Instructions or format hints..."
                              />
                            </div>

                            {/* Required Switch */}
                            {field.type !== "info" && (
                              <div className="flex items-center justify-between pt-1">
                                <div>
                                  <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3] block">
                                    Compulsory Question
                                  </span>
                                  <span className="text-[11px] text-[#656B73] dark:text-[#8A9098]">
                                    Participant cannot submit without completing this
                                  </span>
                                </div>
                                <CustomSwitch
                                  checked={Boolean(field.required)}
                                  onChange={(checked) =>
                                    handleUpdateField(section.id, field.id, {
                                      required: checked,
                                    })
                                  }
                                />
                              </div>
                            )}

                            {/* Options Editor for Choice Fields */}
                            {(field.type === "select" ||
                              field.type === "radio" ||
                              field.type === "checkbox") && (
                              <div className="border-t border-[#E5E7EA] dark:border-[#30353A] pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] uppercase tracking-wider text-[#17191C] dark:text-[#F1F2F3]">
                                    Choices / Options
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddOption(section.id, field.id)
                                    }
                                    className="text-xs font-semibold text-[#25292F] dark:text-[#E8EAED] hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Option</span>
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {(field.options || []).map((opt, optIdx) => (
                                    <div
                                      key={optIdx}
                                      className="flex items-center gap-2"
                                    >
                                      <Input
                                        value={opt.label}
                                        onChange={(e) =>
                                          handleUpdateOption(
                                            section.id,
                                            field.id,
                                            optIdx,
                                            e.target.value,
                                            opt.value
                                          )
                                        }
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="h-8 text-xs"
                                      />
                                      {field.options &&
                                        field.options.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveOption(
                                                section.id,
                                                field.id,
                                                optIdx
                                              )
                                            }
                                            className="p-1 text-[#8A9098] hover:text-red-500 rounded"
                                            aria-label="Remove option"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Conditional Visibility Rules */}
                            <div className="border-t border-[#E5E7EA] dark:border-[#30353A] pt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-[#17191C] dark:text-[#F1F2F3] block">
                                    Conditional Visibility
                                  </span>
                                  <span className="text-[11px] text-[#656B73] dark:text-[#8A9098]">
                                    Show this field only when a previous answer matches
                                  </span>
                                </div>
                                <CustomSwitch
                                  checked={Boolean(field.conditional)}
                                  onChange={(checked) => {
                                    if (checked) {
                                      if (eligibleTargets.length > 0) {
                                        const first = eligibleTargets[0];
                                        handleUpdateField(
                                          section.id,
                                          field.id,
                                          {
                                            conditional: {
                                              targetFieldId: first.id,
                                              operator: "equals",
                                              value:
                                                first.options?.[0]?.value || "",
                                            },
                                          }
                                        );
                                      }
                                    } else {
                                      handleUpdateField(section.id, field.id, {
                                        conditional: undefined,
                                      });
                                    }
                                  }}
                                />
                              </div>

                              {field.conditional && (
                                <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-3 space-y-2">
                                  {eligibleTargets.length === 0 ? (
                                    <p className="text-[11px] text-[#8A9098]">
                                      No preceding fields are available to build a rule. Add other fields before this one first.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#8A9098] mb-1">
                                          When Field
                                        </label>
                                        <CustomSelect
                                          options={eligibleTargets.map((t) => ({
                                            value: t.id,
                                            label: t.label,
                                          }))}
                                          value={
                                            field.conditional.targetFieldId
                                          }
                                          onChange={(val) => {
                                            const target = eligibleTargets.find(
                                              (t) => t.id === val
                                            );
                                            handleUpdateField(
                                              section.id,
                                              field.id,
                                              {
                                                conditional: {
                                                  ...field.conditional!,
                                                  targetFieldId: val,
                                                  value:
                                                    target?.options?.[0]
                                                      ?.value || "",
                                                },
                                              }
                                            );
                                          }}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#8A9098] mb-1">
                                          Condition
                                        </label>
                                        <CustomSelect
                                          options={[
                                            { value: "equals", label: "Equals" },
                                            {
                                              value: "not_equals",
                                              label: "Does Not Equal",
                                            },
                                            {
                                              value: "contains",
                                              label: "Contains",
                                            },
                                          ]}
                                          value={field.conditional.operator}
                                          onChange={(val) =>
                                            handleUpdateField(
                                              section.id,
                                              field.id,
                                              {
                                                conditional: {
                                                  ...field.conditional!,
                                                  operator: val as
                                                    | "equals"
                                                    | "not_equals"
                                                    | "contains",
                                                },
                                              }
                                            )
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#8A9098] mb-1">
                                          Value
                                        </label>
                                        {(() => {
                                          const currentTarget = eligibleTargets.find(
                                            (t) =>
                                              t.id ===
                                              field.conditional?.targetFieldId
                                          );
                                          if (
                                            currentTarget &&
                                            currentTarget.options &&
                                            currentTarget.options.length > 0
                                          ) {
                                            return (
                                              <CustomSelect
                                                options={currentTarget.options.map(
                                                  (o) => ({
                                                    value: o.value,
                                                    label: o.label,
                                                  })
                                                )}
                                                value={
                                                  field.conditional.value
                                                }
                                                onChange={(val) =>
                                                  handleUpdateField(
                                                    section.id,
                                                    field.id,
                                                    {
                                                      conditional: {
                                                        ...field.conditional!,
                                                        value: val,
                                                      },
                                                    }
                                                  )
                                                }
                                              />
                                            );
                                          }
                                          return (
                                            <Input
                                              value={field.conditional.value}
                                              onChange={(e) =>
                                                handleUpdateField(
                                                  section.id,
                                                  field.id,
                                                  {
                                                    conditional: {
                                                      ...field.conditional!,
                                                      value: e.target.value,
                                                    },
                                                  }
                                                )
                                              }
                                              placeholder="Target value..."
                                              className="h-8 text-xs"
                                            />
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Live Form Preview (lg: 4 cols or full when preview tab active) */}
        <div
          className={`space-y-4 ${
            activeTab === "builder"
              ? "hidden lg:block lg:col-span-4"
              : "lg:col-span-7"
          }`}
        >
          <div className="sticky top-20 rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EA] dark:border-[#262A2E] pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#17191C] dark:text-[#F1F2F3] flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#25292F] dark:text-[#E8EAED]" />
                  Live Participant Preview
                </span>
                <p className="text-[11px] text-[#656B73] dark:text-[#8A9098]">
                  Interactive preview responding to values & rules
                </p>
              </div>

              {/* Device Width Switcher */}
              <div className="flex items-center gap-1 bg-[#F4F5F6] dark:bg-[#151719] p-1 rounded-full border border-[#E5E7EA] dark:border-[#30353A]">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1 rounded-full ${
                    previewDevice === "desktop"
                      ? "bg-white dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] shadow-xs"
                      : "text-[#8A9098]"
                  }`}
                  aria-label="Desktop preview"
                >
                  <Monitor className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1 rounded-full ${
                    previewDevice === "mobile"
                      ? "bg-white dark:bg-[#25292F] text-[#17191C] dark:text-[#F1F2F3] shadow-xs"
                      : "text-[#8A9098]"
                  }`}
                  aria-label="Mobile preview"
                >
                  <Smartphone className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Simulated Frame */}
            <div
              className={`mx-auto rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F4F5F6] dark:bg-[#111315] p-3 sm:p-4 overflow-y-auto max-h-[640px] transition-all ${
                previewDevice === "mobile" ? "max-w-[340px]" : "w-full"
              }`}
            >
              <div className="mb-3 border-b border-[#E5E7EA] dark:border-[#262A2E] pb-2 text-center">
                <span className="text-[10px] font-mono uppercase text-[#8A9098]">
                  Client Registration Preview
                </span>
              </div>

              <DynamicFormRenderer
                schema={schema}
                values={previewValues}
                onChange={(fId, val) =>
                  setPreviewValues((prev) => ({ ...prev, [fId]: val }))
                }
                isPreview
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
