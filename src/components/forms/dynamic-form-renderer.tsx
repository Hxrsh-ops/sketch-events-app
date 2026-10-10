"use client";

import { useId } from "react";
import {
  Info,
  Calendar,
  Globe,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  FileText,
  CheckSquare,
  Radio,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  RegistrationFormSchema,
  FormField,
  FormSection,
  ConditionalRule,
} from "@/types";

interface DynamicFormRendererProps {
  schema: RegistrationFormSchema;
  values: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  isPreview?: boolean;
}

/**
 * Checks if a field should be visible according to its conditional rule
 */
export function isFieldVisible(
  field: FormField,
  formValues: Record<string, unknown>
): boolean {
  if (!field.conditional) return true;

  const { targetFieldId, operator, value } = field.conditional;
  const targetVal = formValues[targetFieldId];

  // If target hasn't been set yet
  if (targetVal === undefined || targetVal === null || targetVal === "") {
    if (operator === "not_equals") return true;
    return false;
  }

  const strTargetVal = String(targetVal).trim();
  const strExpectedVal = String(value).trim();

  switch (operator) {
    case "equals":
      return strTargetVal.toLowerCase() === strExpectedVal.toLowerCase();
    case "not_equals":
      return strTargetVal.toLowerCase() !== strExpectedVal.toLowerCase();
    case "contains":
      return strTargetVal.toLowerCase().includes(strExpectedVal.toLowerCase());
    default:
      return true;
  }
}

export function DynamicFormRenderer({
  schema,
  values,
  onChange,
  errors = {},
  disabled = false,
  isPreview = false,
}: DynamicFormRendererProps) {
  const baseId = useId();

  if (!schema || !schema.sections || schema.sections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EA] dark:border-[#30353A] p-8 text-center text-xs text-[#8A9098]">
        No registration fields have been added yet. Add fields from the library to build the form.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {schema.sections.map((section, sIdx) => {
        // Filter fields that are visible
        const visibleFields = section.fields.filter((field) =>
          isFieldVisible(field, values)
        );

        // If no fields are visible in this section, hide the section
        if (visibleFields.length === 0 && !section.description) {
          return null;
        }

        return (
          <div
            key={section.id || `sec-${sIdx}`}
            className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 sm:p-5 space-y-4"
          >
            {/* Section Header */}
            {(section.title || section.description) && (
              <div className="border-b border-[#E5E7EA] dark:border-[#262A2E] pb-3">
                {section.title && (
                  <h3 className="text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] tracking-tight">
                    {section.title}
                  </h3>
                )}
                {section.description && (
                  <p className="mt-1 text-xs text-[#656B73] dark:text-[#8A9098] whitespace-pre-line leading-relaxed">
                    {section.description}
                  </p>
                )}
              </div>
            )}

            {/* Section Fields */}
            <div className="space-y-4">
              {visibleFields.map((field) => {
                const fieldId = field.id;
                const value = values[fieldId];
                const error = errors[fieldId];
                const htmlId = `${baseId}-${fieldId}`;

                return (
                  <div key={fieldId} className="space-y-1.5">
                    {/* Informational Callout Type */}
                    {field.type === "info" ? (
                      <div className="rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-[#25292F] dark:text-[#E8EAED] shrink-0" />
                          <h4 className="text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]">
                            {field.label}
                          </h4>
                        </div>
                        {field.description && (
                          <p className="text-xs text-[#656B73] dark:text-[#8A9098] whitespace-pre-line leading-relaxed pl-6">
                            {field.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Standard Field Label */}
                        <div className="flex items-baseline justify-between">
                          <label
                            htmlFor={htmlId}
                            className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]"
                          >
                            {field.label}
                            {field.required && (
                              <span className="text-red-500 ml-1 font-bold">*</span>
                            )}
                          </label>
                          {field.required ? (
                            <span className="text-[10px] uppercase font-bold text-red-500/80">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8A9098] dark:text-[#656B73]">
                              Optional
                            </span>
                          )}
                        </div>

                        {/* Helper Description */}
                        {field.description && (
                          <p className="text-[11px] text-[#656B73] dark:text-[#8A9098] leading-tight">
                            {field.description}
                          </p>
                        )}

                        {/* Render Field Input based on Type */}
                        <div>
                          {field.type === "text" && (
                            <Input
                              id={htmlId}
                              type="text"
                              placeholder={field.placeholder || "Enter text..."}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "textarea" && (
                            <textarea
                              id={htmlId}
                              rows={3}
                              placeholder={field.placeholder || "Enter details..."}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={`w-full rounded-2xl border bg-white dark:bg-[#1B1E21] p-3 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] transition-all focus:outline-none focus:ring-1 ${
                                error
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : "border-[#E5E7EA] dark:border-[#30353A] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                              }`}
                            />
                          )}

                          {field.type === "email" && (
                            <Input
                              id={htmlId}
                              type="email"
                              placeholder={field.placeholder || "e.g., alex@college.edu"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "phone" && (
                            <Input
                              id={htmlId}
                              type="tel"
                              placeholder={field.placeholder || "e.g., +91 98765 43210"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "number" && (
                            <Input
                              id={htmlId}
                              type="number"
                              min={field.validation?.min}
                              max={field.validation?.max}
                              placeholder={field.placeholder || "0"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "url" && (
                            <Input
                              id={htmlId}
                              type="url"
                              placeholder={field.placeholder || "https://..."}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "date" && (
                            <Input
                              id={htmlId}
                              type="date"
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={error ? "border-red-500 ring-1 ring-red-500" : ""}
                            />
                          )}

                          {field.type === "select" && (
                            <CustomSelect
                              options={
                                field.options?.map((opt) => ({
                                  value: opt.value,
                                  label: opt.label,
                                })) || []
                              }
                              value={(value as string) || ""}
                              onChange={(val) => onChange(fieldId, val)}
                              className={error ? "border-red-500" : ""}
                            />
                          )}

                          {field.type === "radio" && (
                            <div className="space-y-2 pt-1">
                              {(field.options || []).map((opt) => {
                                const isSelected = value === opt.value;
                                return (
                                  <label
                                    key={opt.value}
                                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer select-none ${
                                      isSelected
                                        ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                                        : "border-[#E5E7EA] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 hover:bg-white dark:hover:bg-[#1B1E21]"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={htmlId}
                                      value={opt.value}
                                      checked={isSelected}
                                      onChange={() => onChange(fieldId, opt.value)}
                                      disabled={disabled}
                                      className="h-4 w-4 accent-[#25292F] dark:accent-[#E8EAED]"
                                    />
                                    <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "checkbox" && (
                            <div className="space-y-2 pt-1">
                              {field.options && field.options.length > 0 ? (
                                field.options.map((opt) => {
                                  const currentArr = Array.isArray(value) ? value : [];
                                  const isChecked = currentArr.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer select-none ${
                                        isChecked
                                          ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                                          : "border-[#E5E7EA] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 hover:bg-white dark:hover:bg-[#1B1E21]"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            onChange(fieldId, [...currentArr, opt.value]);
                                          } else {
                                            onChange(
                                              fieldId,
                                              currentArr.filter((v: unknown) => v !== opt.value)
                                            );
                                          }
                                        }}
                                        disabled={disabled}
                                        className="h-4 w-4 rounded border-[#E5E7EA] dark:border-[#30353A] accent-[#25292F] dark:accent-[#E8EAED]"
                                      />
                                      <span className="text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]">
                                        {opt.label}
                                      </span>
                                    </label>
                                  );
                                })
                              ) : (
                                <label className="flex items-center gap-3 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(value)}
                                    onChange={(e) => onChange(fieldId, e.target.checked)}
                                    disabled={disabled}
                                    className="h-4 w-4 rounded border-[#E5E7EA] dark:border-[#30353A] accent-[#25292F] dark:accent-[#E8EAED]"
                                  />
                                  <span className="text-xs font-medium text-[#17191C] dark:text-[#F1F2F3]">
                                    {field.placeholder || "I agree to the above condition"}
                                  </span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Error Message */}
                        {error && (
                          <p className="text-[11px] font-medium text-red-600 dark:text-red-400">
                            {error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
