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
  Radio,
  CheckSquare,
  Globe,
  Calendar,
  Info,
  Files,
  Users,
  Monitor,
  Smartphone,
  Check,
  AlertTriangle,
  RotateCcw,
  X,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Sliders,
  ExternalLink,
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
    description: "Names, student IDs, single-line answers",
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
    description: "Skills, checkboxes, agreements",
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
    description: "Instructions, guidance, rules",
  },
];

export function RegistrationFormBuilder({
  schema,
  onChange,
  participationMode,
}: RegistrationFormBuilderProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>(() => schema.sections[0]?.id || "");
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({
    team_size: "2",
  });
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Template detection
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

  // Ensure activeSectionId is always valid
  const effectiveActiveSectionId =
    schema.sections.find((s) => s.id === activeSectionId)?.id ||
    schema.sections[schema.sections.length - 1]?.id ||
    "";

  // Helper to update schema
  const updateSchema = (next: RegistrationFormSchema) => {
    setIsCustomized(true);
    onChange(next);
  };

  // Add a new section
  const handleAddSection = () => {
    const newSectionId = `sec_${Date.now()}`;
    const newSection: FormSection = {
      id: newSectionId,
      title: `Section ${schema.sections.length + 1}`,
      description: "",
      fields: [],
    };
    updateSchema({
      ...schema,
      sections: [...schema.sections, newSection],
    });
    setActiveSectionId(newSectionId);
  };

  // Move section up/down
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= schema.sections.length) return;
    const copy = [...schema.sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    updateSchema({ ...schema, sections: copy });
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
    if (activeSectionId === sectionId) {
      setActiveSectionId(updated[0]?.id || "");
    }
  };

  // Add a field to the specified or active section
  const handleAddField = (sectionId: string, type: FormFieldType) => {
    const targetId = sectionId || effectiveActiveSectionId;
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
      if (s.id === targetId) {
        return {
          ...s,
          fields: [...s.fields, newField],
        };
      }
      return s;
    });

    updateSchema({ ...schema, sections: updated });
    setActiveSectionId(targetId);
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

  // Load Presets
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
      const cleanSchema: RegistrationFormSchema = {
        version: 1,
        sections: [
          {
            id: `sec_main_${Date.now()}`,
            title: "Attendee Information",
            description: "Attendee profile details for registration and check-in",
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
      };
      onChange(cleanSchema);
      setActiveTemplate("clean");
    }
    setIsCustomized(false);
    setPendingTemplate(null);
    setWarningMessage(null);
  };

  // Preceding fields for conditional visibility
  const getEligibleConditionalTargets = (currentFieldId: string) => {
    const eligible: { id: string; label: string; options?: FormFieldOption[] }[] = [];
    let stop = false;

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.id === currentFieldId) {
          stop = true;
          break;
        }
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

  const activeSection = schema.sections.find((s) => s.id === effectiveActiveSectionId) || schema.sections[0];

  return (
    <div className="space-y-5 w-full">
      {/* Overwrite Confirmation Dialog */}
      {pendingTemplate && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-[#17191C] text-white p-3.5 shadow-md border border-[#25292F]">
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
              className="px-3 py-1 text-xs rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => executeLoadTemplate(pendingTemplate)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-[#17191C] hover:bg-white/90 transition-colors shadow-xs"
            >
              Confirm & Overwrite
            </button>
          </div>
        </div>
      )}

      {/* Warning Notice Banner */}
      {warningMessage && (
        <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700">
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

      {/* Top Bar: Template Quick-Actions & Live Preview Trigger */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-[#E5E7E9] bg-white p-3 shadow-xs">
        {/* Template Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#858B93] mr-1">
            Templates:
          </span>

          <button
            type="button"
            onClick={() => requestLoadTemplate("diet_code")}
            aria-pressed={activeTemplate === "diet_code"}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-[#17191C] ${
              activeTemplate === "diet_code"
                ? "bg-[#17191C] text-white shadow-xs"
                : "border border-[#E5E7E9] bg-[#F6F7F8] text-[#34383D] hover:bg-[#EAECEF] hover:text-[#17191C]"
            }`}
          >
            <Files className="h-3.5 w-3.5" />
            <span>Diet CODE Reference</span>
            {activeTemplate === "diet_code" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                Customized
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => requestLoadTemplate("individual")}
            aria-pressed={activeTemplate === "individual"}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-[#17191C] ${
              activeTemplate === "individual"
                ? "bg-[#17191C] text-white shadow-xs"
                : "border border-[#E5E7E9] bg-[#F6F7F8] text-[#34383D] hover:bg-[#EAECEF] hover:text-[#17191C]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Standard Individual</span>
            {activeTemplate === "individual" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                Customized
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => requestLoadTemplate("team")}
            aria-pressed={activeTemplate === "team"}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all outline-none focus-visible:ring-1 focus-visible:ring-[#17191C] ${
              activeTemplate === "team"
                ? "bg-[#17191C] text-white shadow-xs"
                : "border border-[#E5E7E9] bg-[#F6F7F8] text-[#34383D] hover:bg-[#EAECEF] hover:text-[#17191C]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Multi-Member Team</span>
            {activeTemplate === "team" && isCustomized && (
              <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                Customized
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => requestLoadTemplate("clean")}
            aria-pressed={activeTemplate === "clean"}
            className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-[#D4D7DC] px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTemplate === "clean"
                ? "bg-[#17191C] text-white"
                : "text-[#858B93] hover:text-[#17191C] hover:bg-[#F6F7F8]"
            }`}
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Form Controls: Total Count & PROMINENT PREVIEW BUTTON */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <span className="text-xs text-[#858B93] font-medium hidden sm:inline">
            {schema.sections.length} {schema.sections.length === 1 ? "Section" : "Sections"} &bull; {totalFields} Fields
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSection}
            className="rounded-lg text-xs font-semibold gap-1.5 h-8 border-[#E5E7E9] text-[#17191C]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Section</span>
          </Button>

          {/* Prominent Preview Form Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="rounded-lg text-xs font-semibold gap-1.5 h-8 px-3.5 bg-[#17191C] text-white hover:bg-[#25292F] shadow-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview Form</span>
          </Button>
        </div>
      </div>

      {/* HORIZONTAL FORM ELEMENT TOOLBAR (Near the top of workspace) */}
      <div className="sticky top-16 z-20 rounded-xl border border-[#E5E7E9] bg-white p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#858B93]">
              Form Elements:
            </span>
            <span className="text-xs text-[#17191C] font-semibold truncate hidden sm:inline">
              Click any element to add to{" "}
              <span className="text-[#17191C] underline font-bold">
                {activeSection?.title || "Active Section"}
              </span>
            </span>
          </div>

          {/* Quick Target Section Switcher if multi-section */}
          {schema.sections.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-[#858B93]">
              <span className="text-[10px] uppercase font-bold text-[#858B93] hidden md:inline">Target:</span>
              <select
                value={effectiveActiveSectionId}
                onChange={(e) => setActiveSectionId(e.target.value)}
                className="h-7 rounded-lg border border-[#E5E7E9] bg-[#F6F7F8] px-2 text-xs font-semibold text-[#17191C] focus:outline-none focus:ring-1 focus:ring-[#17191C]"
              >
                {schema.sections.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    Sec {idx + 1}: {s.title || "Untitled"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Scrollable Toolbar Items */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {FIELD_TYPE_DEFINITIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => handleAddField(effectiveActiveSectionId, item.type)}
                className="group flex items-center gap-2 rounded-lg border border-[#E5E7E9] bg-[#F8F9FA] px-2.5 py-1.5 text-xs font-medium text-[#17191C] hover:bg-white hover:border-[#17191C] hover:shadow-xs transition-all shrink-0 select-none"
                title={`Add ${item.label}: ${item.description}`}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white border border-[#E5E7E9] text-[#777E86] group-hover:bg-[#17191C] group-hover:text-white transition-colors">
                  <Icon className="h-3 w-3" />
                </div>
                <span className="whitespace-nowrap">{item.label}</span>
                <Plus className="h-3 w-3 text-[#858B93] group-hover:text-[#17191C] shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN FORM EDITOR: Spacious Vertical Document Workspace */}
      <div className="w-full space-y-6">
        {schema.sections.map((section, sIdx) => {
          const isActive = section.id === effectiveActiveSectionId;

          return (
            <div
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              className={`rounded-xl border transition-all duration-150 p-5 sm:p-6 space-y-5 bg-white ${
                isActive
                  ? "border-[#17191C] ring-1 ring-[#17191C]/10 shadow-xs"
                  : "border-[#E5E7E9] hover:border-[#CBD0D6] shadow-xs"
              }`}
            >
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#E5E7E9] pb-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F6F7F8] border border-[#E5E7E9] text-[#17191C]">
                      SECTION {sIdx + 1}
                    </span>
                    {isActive ? (
                      <span className="text-[9.5px] font-bold text-[#17191C] uppercase tracking-wider bg-[#EAECEF] px-2 py-0.5 rounded-md">
                        Active Workspace
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSectionId(section.id);
                        }}
                        className="text-[10px] text-[#858B93] hover:text-[#17191C] underline font-medium"
                      >
                        Set Active
                      </button>
                    )}
                  </div>

                  {/* Editable Section Title */}
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      handleUpdateSection(section.id, "title", e.target.value)
                    }
                    placeholder="Section Title (e.g. Attendee Information)..."
                    className="w-full text-base sm:text-lg font-bold text-[#17191C] bg-transparent border-b border-transparent hover:border-[#E5E7E9] focus:border-[#17191C] focus:outline-none transition-colors"
                  />

                  {/* Editable Section Description */}
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
                    placeholder="Optional description / instructions for attendees in this section..."
                    className="w-full text-xs sm:text-sm text-[#858B93] bg-transparent border-b border-transparent hover:border-[#E5E7E9] focus:border-[#17191C] focus:outline-none transition-colors"
                  />
                </div>

                {/* Section Action Controls */}
                <div className="flex items-center gap-1 self-start sm:self-auto shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveSection(sIdx, "up");
                    }}
                    disabled={sIdx === 0}
                    className="p-1.5 text-[#858B93] hover:text-[#17191C] disabled:opacity-30 rounded-lg hover:bg-[#F6F7F8] transition-colors"
                    title="Move section up"
                    aria-label="Move section up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveSection(sIdx, "down");
                    }}
                    disabled={sIdx === schema.sections.length - 1}
                    className="p-1.5 text-[#858B93] hover:text-[#17191C] disabled:opacity-30 rounded-lg hover:bg-[#F6F7F8] transition-colors"
                    title="Move section down"
                    aria-label="Move section down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSection(section.id);
                    }}
                    className="p-1.5 text-[#858B93] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
                    title="Delete section"
                    aria-label="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Vertically Arranged Form Fields */}
              <div className="space-y-3">
                {section.fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E5E7E9] bg-[#F8F9FA] p-6 text-center text-xs text-[#858B93] space-y-2">
                    <p>No form fields in this section yet.</p>
                    <p className="text-[11px] text-[#A4A9AF]">
                      Select an element from the toolbar above to add a question here.
                    </p>
                  </div>
                ) : (
                  section.fields.map((field, fIdx) => {
                    const isExpanded = expandedFieldId === field.id;
                    const eligibleTargets = getEligibleConditionalTargets(field.id);
                    const typeDef = FIELD_TYPE_DEFINITIONS.find((t) => t.type === field.type);
                    const FieldIcon = typeDef?.icon || FileText;

                    return (
                      <div
                        key={field.id}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? "border-[#17191C] bg-[#F8F9FA] shadow-xs"
                            : "border-[#E5E7E9] bg-white hover:border-[#CBD0D6]"
                        }`}
                      >
                        {/* Compact Field Row */}
                        <div className="flex items-center justify-between p-3.5 gap-3">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedFieldId(isExpanded ? null : field.id);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F6F7F8] border border-[#E5E7E9] text-[#777E86]">
                              <FieldIcon className="h-3.5 w-3.5" />
                            </div>

                            <span className="rounded-md bg-[#F6F7F8] border border-[#E5E7E9] px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-[#17191C] shrink-0">
                              {field.type}
                            </span>

                            <span className="text-xs font-semibold text-[#17191C] truncate">
                              {field.label}
                            </span>

                            {field.required && (
                              <span className="text-rose-600 text-xs font-bold shrink-0" title="Compulsory field">
                                *
                              </span>
                            )}

                            {field.conditional && (
                              <span className="text-[10px] bg-slate-100 text-[#17191C] border border-[#E5E7E9] font-semibold px-2 py-0.5 rounded-full shrink-0">
                                conditional
                              </span>
                            )}
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleMoveField(section.id, fIdx, "up")}
                              disabled={fIdx === 0}
                              className="p-1 text-[#858B93] hover:text-[#17191C] disabled:opacity-30 rounded hover:bg-[#EAECEF]"
                              title="Move field up"
                              aria-label="Move field up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveField(section.id, fIdx, "down")}
                              disabled={fIdx === section.fields.length - 1}
                              className="p-1 text-[#858B93] hover:text-[#17191C] disabled:opacity-30 rounded hover:bg-[#EAECEF]"
                              title="Move field down"
                              aria-label="Move field down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateField(section.id, field)}
                              className="p-1 text-[#858B93] hover:text-[#17191C] rounded hover:bg-[#EAECEF]"
                              title="Duplicate field"
                              aria-label="Duplicate field"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteField(section.id, field.id)}
                              className="p-1 text-[#858B93] hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Delete field"
                              aria-label="Delete field"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                              className={`p-1 rounded transition-colors ml-1 ${
                                isExpanded
                                  ? "bg-[#17191C] text-white"
                                  : "text-[#858B93] hover:text-[#17191C] hover:bg-[#EAECEF]"
                              }`}
                              title={isExpanded ? "Collapse settings" : "Configure field"}
                              aria-label="Configure field"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Field Editor */}
                        {isExpanded && (
                          <div className="border-t border-[#E5E7E9] p-4 sm:p-5 space-y-4 bg-white rounded-b-xl text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#17191C] mb-1">
                                  Field Label *
                                </label>
                                <Input
                                  value={field.label}
                                  onChange={(e) =>
                                    handleUpdateField(section.id, field.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. Department, Full Name, Portfolio URL..."
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-[#17191C] mb-1">
                                  Placeholder Text
                                </label>
                                <Input
                                  value={field.placeholder || ""}
                                  onChange={(e) =>
                                    handleUpdateField(section.id, field.id, {
                                      placeholder: e.target.value,
                                    })
                                  }
                                  placeholder="Optional ghost text inside field..."
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-[#17191C] mb-1">
                                Helper Guidance / Description
                              </label>
                              <Input
                                value={field.description || ""}
                                onChange={(e) =>
                                  handleUpdateField(section.id, field.id, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Instructions, formatting guidelines or hints..."
                              />
                            </div>

                            {/* Required Switch */}
                            {field.type !== "info" && (
                              <div className="flex items-center justify-between pt-2 border-t border-[#F0F1F2]">
                                <div>
                                  <span className="font-semibold text-[#17191C] block">
                                    Compulsory Question (Required)
                                  </span>
                                  <span className="text-[11px] text-[#858B93]">
                                    Attendee cannot submit form without filling this field
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
                              <div className="border-t border-[#F0F1F2] pt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[11px] uppercase tracking-wider text-[#17191C]">
                                    Choices / Options
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddOption(section.id, field.id)}
                                    className="text-xs font-semibold text-[#17191C] hover:underline flex items-center gap-1"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>Add Option</span>
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {(field.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-[#858B93] w-5 text-right">
                                        {optIdx + 1}.
                                      </span>
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
                                        className="h-8 text-xs flex-1"
                                      />
                                      {field.options && field.options.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveOption(section.id, field.id, optIdx)
                                          }
                                          className="p-1 text-[#858B93] hover:text-rose-600 rounded"
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
                            <div className="border-t border-[#F0F1F2] pt-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-[#17191C] block">
                                    Conditional Visibility Rule
                                  </span>
                                  <span className="text-[11px] text-[#858B93]">
                                    Show this field only when a preceding answer matches criteria
                                  </span>
                                </div>
                                <CustomSwitch
                                  checked={Boolean(field.conditional)}
                                  onChange={(checked) => {
                                    if (checked) {
                                      if (eligibleTargets.length > 0) {
                                        const first = eligibleTargets[0];
                                        handleUpdateField(section.id, field.id, {
                                          conditional: {
                                            targetFieldId: first.id,
                                            operator: "equals",
                                            value: first.options?.[0]?.value || "",
                                          },
                                        });
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
                                <div className="rounded-xl border border-[#E5E7E9] bg-[#F8F9FA] p-3.5 space-y-3">
                                  {eligibleTargets.length === 0 ? (
                                    <p className="text-[11px] text-[#858B93]">
                                      No preceding fields are available to build a rule. Add other fields before this one first.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#858B93] mb-1">
                                          When Field
                                        </label>
                                        <CustomSelect
                                          options={eligibleTargets.map((t) => ({
                                            value: t.id,
                                            label: t.label,
                                          }))}
                                          value={field.conditional.targetFieldId}
                                          onChange={(val) => {
                                            const target = eligibleTargets.find((t) => t.id === val);
                                            handleUpdateField(section.id, field.id, {
                                              conditional: {
                                                ...field.conditional!,
                                                targetFieldId: val,
                                                value: target?.options?.[0]?.value || "",
                                              },
                                            });
                                          }}
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#858B93] mb-1">
                                          Condition
                                        </label>
                                        <CustomSelect
                                          options={[
                                            { value: "equals", label: "Equals" },
                                            { value: "not_equals", label: "Does Not Equal" },
                                            { value: "contains", label: "Contains" },
                                          ]}
                                          value={field.conditional.operator}
                                          onChange={(val) =>
                                            handleUpdateField(section.id, field.id, {
                                              conditional: {
                                                ...field.conditional!,
                                                operator: val as "equals" | "not_equals" | "contains",
                                              },
                                            })
                                          }
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-[10px] font-bold uppercase text-[#858B93] mb-1">
                                          Value
                                        </label>
                                        {(() => {
                                          const currentTarget = eligibleTargets.find(
                                            (t) => t.id === field.conditional?.targetFieldId
                                          );
                                          if (
                                            currentTarget &&
                                            currentTarget.options &&
                                            currentTarget.options.length > 0
                                          ) {
                                            return (
                                              <CustomSelect
                                                options={currentTarget.options.map((o) => ({
                                                  value: o.value,
                                                  label: o.label,
                                                }))}
                                                value={field.conditional.value}
                                                onChange={(val) =>
                                                  handleUpdateField(section.id, field.id, {
                                                    conditional: {
                                                      ...field.conditional!,
                                                      value: val,
                                                    },
                                                  })
                                                }
                                              />
                                            );
                                          }
                                          return (
                                            <Input
                                              value={field.conditional.value}
                                              onChange={(e) =>
                                                handleUpdateField(section.id, field.id, {
                                                  conditional: {
                                                    ...field.conditional!,
                                                    value: e.target.value,
                                                  },
                                                })
                                              }
                                              placeholder="Target value..."
                                              className="h-8.5 text-xs"
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
          );
        })}
      </div>

      {/* Add New Section Footer Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleAddSection}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[#D4D7DC] bg-white text-xs font-semibold text-[#17191C] hover:border-[#17191C] hover:bg-[#F8F9FA] transition-all shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Another Form Section</span>
        </button>
      </div>

      {/* LIVE PREVIEW MODAL (Spacious, interactive registration view) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-[#E5E7E9] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7E9] px-6 py-4 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F6F7F8] border border-[#E5E7E9] text-[#17191C]">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17191C]">Live Form Preview</h3>
                  <p className="text-[11px] text-[#858B93]">
                    Interactive test mode synchronized with your live builder schema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Desktop / Mobile Switcher */}
                <div className="flex items-center gap-1 bg-[#F6F7F8] p-1 rounded-lg border border-[#E5E7E9]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      previewDevice === "desktop"
                        ? "bg-white text-[#17191C] shadow-xs"
                        : "text-[#858B93] hover:text-[#17191C]"
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      previewDevice === "mobile"
                        ? "bg-white text-[#17191C] shadow-xs"
                        : "text-[#858B93] hover:text-[#17191C]"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#858B93] hover:text-[#17191C] hover:bg-[#F6F7F8] transition-colors"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with Scrollable Simulated View */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#F8F9FA]">
              <div
                className={`mx-auto transition-all ${
                  previewDevice === "mobile"
                    ? "max-w-[380px] bg-white rounded-2xl border-4 border-[#17191C] p-5 shadow-xl"
                    : "max-w-2xl bg-white rounded-xl border border-[#E5E7E9] p-6 sm:p-8 shadow-xs"
                }`}
              >
                <div className="mb-4 pb-3 border-b border-[#E5E7E9] flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#858B93]">
                    Official Registration View
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                    Interactive Mode
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

            {/* Modal Footer */}
            <div className="border-t border-[#E5E7E9] px-6 py-3 bg-white flex items-center justify-between shrink-0">
              <span className="text-xs text-[#858B93]">
                Changes are automatically preserved when returning to editing.
              </span>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-lg text-xs font-semibold"
              >
                Return to Editing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
