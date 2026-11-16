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
  variant?: "default" | "retro";
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
  variant = "retro",
}: DynamicFormRendererProps) {
  const baseId = useId();
  const isRetro = variant === "retro";

  if (!schema || !schema.sections || schema.sections.length === 0) {
    return (
      <div
        className={
          isRetro
            ? "rounded-2xl border-2 border-dashed border-ink/40 bg-cream-plus p-8 text-center text-xs font-quicksand font-bold text-ink/70"
            : "rounded-2xl border border-dashed border-[#E5E7EA] dark:border-[#30353A] p-8 text-center text-xs text-[#8A9098]"
        }
      >
        No registration fields have been added yet. Add fields from the library to build the form.
      </div>
    );
  }

  return (
    <div className={isRetro ? "space-y-6" : "space-y-6"}>
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
            className={
              isRetro
                ? "rounded-3xl border-2 border-ink bg-cream-plus p-6 sm:p-8 shadow-brutal-card space-y-6"
                : "rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] bg-[#F9FAFB] dark:bg-[#151719] p-4 sm:p-5 space-y-4"
            }
          >
            {/* Section Header */}
            {(section.title || section.description) && (
              <div
                className={
                  isRetro
                    ? "border-b-2 border-ink/15 pb-4"
                    : "border-b border-[#E5E7EA] dark:border-[#262A2E] pb-3"
                }
              >
                {section.title && (
                  <h3
                    className={
                      isRetro
                        ? "font-peachy font-black text-2xl text-ink tracking-tight"
                        : "text-sm font-bold text-[#17191C] dark:text-[#F1F2F3] tracking-tight"
                    }
                  >
                    {section.title}
                  </h3>
                )}
                {section.description && (
                  <p
                    className={
                      isRetro
                        ? "mt-1.5 text-xs font-quicksand font-bold text-ink/70 whitespace-pre-line leading-relaxed"
                        : "mt-1 text-xs text-[#656B73] dark:text-[#8A9098] whitespace-pre-line leading-relaxed"
                    }
                  >
                    {section.description}
                  </p>
                )}
              </div>
            )}

            {/* Section Fields */}
            <div className={isRetro ? "space-y-5" : "space-y-4"}>
              {visibleFields.map((field) => {
                const fieldId = field.id;
                const value = values[fieldId];
                const error = errors[fieldId];
                const htmlId = `${baseId}-${fieldId}`;

                return (
                  <div key={fieldId} className={isRetro ? "space-y-2" : "space-y-1.5"}>
                    {/* Informational Callout Type */}
                    {field.type === "info" ? (
                      <div
                        className={
                          isRetro
                            ? "rounded-2xl border-2 border-ink bg-retro-yellow/20 p-4 space-y-2 shadow-brutal-flat"
                            : "rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3.5 space-y-1.5"
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Info
                            className={
                              isRetro
                                ? "h-4 w-4 text-ink shrink-0 stroke-[2.5]"
                                : "h-4 w-4 text-[#25292F] dark:text-[#E8EAED] shrink-0"
                            }
                          />
                          <h4
                            className={
                              isRetro
                                ? "font-quicksand font-black text-xs uppercase tracking-wider text-ink"
                                : "text-xs font-bold text-[#17191C] dark:text-[#F1F2F3]"
                            }
                          >
                            {field.label}
                          </h4>
                        </div>
                        {field.description && (
                          <p
                            className={
                              isRetro
                                ? "text-xs font-quicksand font-semibold text-ink/80 whitespace-pre-line leading-relaxed pl-6"
                                : "text-xs text-[#656B73] dark:text-[#8A9098] whitespace-pre-line leading-relaxed pl-6"
                            }
                          >
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
                            className={
                              isRetro
                                ? "text-xs font-quicksand font-black uppercase tracking-wider text-ink"
                                : "text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]"
                            }
                          >
                            {field.label}
                            {field.required && (
                              <span className={isRetro ? "text-retro-pink ml-1 font-black" : "text-red-500 ml-1 font-bold"}>
                                *
                              </span>
                            )}
                          </label>
                          {field.required ? (
                            <span
                              className={
                                isRetro
                                  ? "text-[10px] uppercase font-quicksand font-black text-retro-pink bg-retro-pink/15 px-2 py-0.5 rounded-full border border-retro-pink/30"
                                  : "text-[10px] uppercase font-bold text-red-500/80"
                              }
                            >
                              Required
                            </span>
                          ) : (
                            <span
                              className={
                                isRetro
                                  ? "text-[10px] uppercase font-quicksand font-bold text-ink/50"
                                  : "text-[10px] text-[#8A9098] dark:text-[#656B73]"
                              }
                            >
                              Optional
                            </span>
                          )}
                        </div>

                        {/* Helper Description */}
                        {field.description && (
                          <p
                            className={
                              isRetro
                                ? "text-xs font-quicksand font-semibold text-ink/65 leading-tight"
                                : "text-[11px] text-[#656B73] dark:text-[#8A9098] leading-tight"
                            }
                          >
                            {field.description}
                          </p>
                        )}

                        {/* Render Field Input based on Type */}
                        <div>
                          {field.type === "text" && (
                            <input
                              id={htmlId}
                              type="text"
                              placeholder={field.placeholder || "Enter text..."}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
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
                              className={
                                isRetro
                                  ? `retro-input w-full rounded-xl border-2 border-ink bg-[#FFFDF7] p-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full rounded-2xl border bg-white dark:bg-[#1B1E21] p-3 text-xs text-[#17191C] dark:text-[#F1F2F3] placeholder:text-[#8A9098] transition-all focus:outline-none focus:ring-1 ${
                                      error
                                        ? "border-red-500 ring-1 ring-red-500"
                                        : "border-[#E5E7EA] dark:border-[#30353A] focus:border-[#25292F] dark:focus:border-[#E8EAED] focus:ring-[#25292F] dark:focus:ring-[#E8EAED]"
                                    }`
                              }
                            />
                          )}

                          {field.type === "email" && (
                            <input
                              id={htmlId}
                              type="email"
                              placeholder={field.placeholder || "e.g., alex@college.edu"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
                            />
                          )}

                          {field.type === "phone" && (
                            <input
                              id={htmlId}
                              type="tel"
                              placeholder={field.placeholder || "e.g., +91 98765 43210"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
                            />
                          )}

                          {field.type === "number" && (
                            <input
                              id={htmlId}
                              type="number"
                              min={field.validation?.min}
                              max={field.validation?.max}
                              placeholder={field.placeholder || "0"}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
                            />
                          )}

                          {field.type === "url" && (
                            <input
                              id={htmlId}
                              type="url"
                              placeholder={field.placeholder || "https://..."}
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
                            />
                          )}

                          {field.type === "date" && (
                            <input
                              id={htmlId}
                              type="date"
                              value={(value as string) || ""}
                              onChange={(e) => onChange(fieldId, e.target.value)}
                              disabled={disabled}
                              className={
                                isRetro
                                  ? `retro-input w-full h-12 rounded-xl border-2 border-ink bg-[#FFFDF7] px-4 text-sm font-quicksand font-bold text-ink placeholder:text-ink/40 shadow-brutal-flat hover:bg-[#F8F4EA] focus:outline-none focus:ring-2 focus:ring-retro-pink focus:border-ink transition-all ${
                                      error ? "border-red-600 bg-red-50 ring-2 ring-red-500" : ""
                                    }`
                                  : `w-full ${error ? "border-red-500 ring-1 ring-red-500" : ""}`
                              }
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
                              variant={isRetro ? "retro" : "default"}
                              className={
                                isRetro
                                  ? error ? "ring-2 ring-red-500 rounded-xl" : ""
                                  : error
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                          )}

                          {field.type === "radio" && (
                            <div className="space-y-2.5 pt-1">
                              {(field.options || []).map((opt) => {
                                const isSelected = value === opt.value;
                                return (
                                  <label
                                    key={opt.value}
                                    className={
                                      isRetro
                                        ? `flex items-center gap-3.5 rounded-xl border-2 border-ink p-3.5 transition-all cursor-pointer select-none font-quicksand font-bold text-xs text-ink ${
                                            isSelected
                                              ? "bg-retro-yellow/40 shadow-brutal-flat"
                                              : "bg-cream-plus hover:bg-cream shadow-none"
                                          }`
                                        : `flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer select-none ${
                                            isSelected
                                              ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                                              : "border-[#E5E7EA] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 hover:bg-white dark:hover:bg-[#1B1E21]"
                                          }`
                                    }
                                  >
                                    <input
                                      type="radio"
                                      name={htmlId}
                                      value={opt.value}
                                      checked={isSelected}
                                      onChange={() => onChange(fieldId, opt.value)}
                                      disabled={disabled}
                                      className={
                                        isRetro
                                          ? "h-4 w-4 accent-ink"
                                          : "h-4 w-4 accent-[#25292F] dark:accent-[#E8EAED]"
                                      }
                                    />
                                    <span
                                      className={
                                        isRetro
                                          ? "text-xs font-quicksand font-bold text-ink"
                                          : "text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]"
                                      }
                                    >
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {field.type === "checkbox" && (
                            <div className="space-y-2.5 pt-1">
                              {field.options && field.options.length > 0 ? (
                                field.options.map((opt) => {
                                  const currentArr = Array.isArray(value) ? value : [];
                                  const isChecked = currentArr.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className={
                                        isRetro
                                          ? `flex items-center gap-3.5 rounded-xl border-2 border-ink p-3.5 transition-all cursor-pointer select-none font-quicksand font-bold text-xs text-ink ${
                                              isChecked
                                                ? "bg-retro-yellow/40 shadow-brutal-flat"
                                                : "bg-cream-plus hover:bg-cream shadow-none"
                                            }`
                                          : `flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer select-none ${
                                              isChecked
                                                ? "border-[#25292F] dark:border-[#E8EAED] bg-white dark:bg-[#1B1E21] shadow-xs"
                                                : "border-[#E5E7EA] dark:border-[#30353A] bg-white/60 dark:bg-[#1B1E21]/60 hover:bg-white dark:hover:bg-[#1B1E21]"
                                            }`
                                      }
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
                                        className={
                                          isRetro
                                            ? "h-4 w-4 rounded border-2 border-ink accent-ink"
                                            : "h-4 w-4 rounded border-[#E5E7EA] dark:border-[#30353A] accent-[#25292F] dark:accent-[#E8EAED]"
                                        }
                                      />
                                      <span
                                        className={
                                          isRetro
                                            ? "text-xs font-quicksand font-bold text-ink"
                                            : "text-xs font-semibold text-[#17191C] dark:text-[#F1F2F3]"
                                        }
                                      >
                                        {opt.label}
                                      </span>
                                    </label>
                                  );
                                })
                              ) : (
                                <label
                                  className={
                                    isRetro
                                      ? "flex items-center gap-3.5 rounded-xl border-2 border-ink bg-cream-plus p-3.5 cursor-pointer select-none shadow-brutal-flat"
                                      : "flex items-center gap-3 rounded-xl border border-[#E5E7EA] dark:border-[#30353A] bg-white dark:bg-[#1B1E21] p-3 cursor-pointer select-none"
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(value)}
                                    onChange={(e) => onChange(fieldId, e.target.checked)}
                                    disabled={disabled}
                                    className={
                                      isRetro
                                        ? "h-4 w-4 rounded border-2 border-ink accent-ink"
                                        : "h-4 w-4 rounded border-[#E5E7EA] dark:border-[#30353A] accent-[#25292F] dark:accent-[#E8EAED]"
                                    }
                                  />
                                  <span
                                    className={
                                      isRetro
                                        ? "text-xs font-quicksand font-bold text-ink"
                                        : "text-xs font-medium text-[#17191C] dark:text-[#F1F2F3]"
                                    }
                                  >
                                    {field.placeholder || "I agree to the above condition"}
                                  </span>
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Error Message */}
                        {error && (
                          <p
                            className={
                              isRetro
                                ? "text-xs font-quicksand font-black text-red-700 bg-red-100/90 border border-red-400 rounded-lg px-3 py-1 inline-block"
                                : "text-[11px] font-medium text-red-600 dark:text-red-400"
                            }
                          >
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
