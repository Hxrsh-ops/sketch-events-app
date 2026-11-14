"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Palette,
  Sparkles,
  Layers,
  Save,
  CheckCircle,
  Copy,
  Upload,
  Calendar,
  Eye,
  Sliders,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Undo2,
  Redo2,
  Check,
  FileText,
  Printer,
  Mail,
  ChevronDown,
  Scissors,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Type,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TicketTemplate, TicketTemplateVersion, EventItem } from "@/types";
import {
  saveTemplateDraftAction,
  publishTemplateVersionAction,
  assignEventTemplateAction,
  createTicketTemplateAction,
  getTicketTemplateAction,
  uploadTicketBackgroundAction,
} from "@/app/actions/ticket-actions";
import { TicketDesignData, CanvasElement } from "@/lib/validations/ticket-schemas";
import { UnifiedTicketCard } from "@/components/ticket/unified-ticket-card";
import { generateUnifiedTicketSvg } from "@/lib/ticket/ticket-renderer";
import { ColorPickerField } from "@/components/ui/circular-color-picker";

interface StudioClientProps {
  initialTemplates: TicketTemplate[];
  initialEvents: EventItem[];
  initialError?: string | null;
  isPreview: boolean;
}

const STARTER_TEMPLATES: Record<string, TicketDesignData> = {
  "cinematic-midnight": {
    layout: "cinematic-horizontal",
    canvas: { width: 800, height: 380, unit: "px" },
    theme: {
      background: "#111315",
      surface: "#181B1E",
      accent: "#E2B857",
      textColor: "#F3F4F6",
      secondaryTextColor: "#9CA3AF",
      borderColor: "#2C3136",
      fontFamily: "cinematic",
    },
    stub: {
      perforationPosition: "right",
      stubWidth: 240,
      badgeText: "ENTRY PASS",
      showPerforationDots: true,
    },
    qr: {
      size: 180,
      label: "SCAN TO VERIFY",
      rotating: true,
      refreshIntervalSec: 30,
    },
    elements: [
      {
        id: "el-title",
        type: "text",
        x: 40,
        y: 60,
        width: 480,
        height: 48,
        zIndex: 2,
        isLocked: true,
        bindingKey: "event_title",
        text: "Sample Event Name",
        fontSize: 26,
        fontWeight: "extrabold",
        color: "#F3F4F6",
        alignment: "left",
      },
      {
        id: "el-badge",
        type: "badge",
        x: 40,
        y: 28,
        width: 140,
        height: 24,
        zIndex: 2,
        isLocked: false,
        bindingKey: "category",
        text: "ADMIT ONE",
        fontSize: 10,
        fontWeight: "bold",
        color: "#E2B857",
        alignment: "left",
      },
      {
        id: "el-attendee",
        type: "text",
        x: 40,
        y: 130,
        width: 300,
        height: 36,
        zIndex: 2,
        isLocked: true,
        bindingKey: "attendee_name",
        text: "Participant Name",
        fontSize: 18,
        fontWeight: "bold",
        color: "#F3F4F6",
        alignment: "left",
      },
      {
        id: "el-ticket-no",
        type: "text",
        x: 40,
        y: 290,
        width: 260,
        height: 30,
        zIndex: 2,
        isLocked: true,
        bindingKey: "ticket_number",
        text: "TKT-2026-0001",
        fontSize: 12,
        fontWeight: "medium",
        color: "#E2B857",
        alignment: "left",
      },
      {
        id: "el-venue",
        type: "text",
        x: 40,
        y: 195,
        width: 320,
        height: 26,
        zIndex: 1,
        isLocked: false,
        bindingKey: "venue",
        text: "Convention Center &bull; Main Hall",
        fontSize: 12,
        fontWeight: "medium",
        color: "#9CA3AF",
        alignment: "left",
      },
    ],
  },
  "minimal-carbon": {
    layout: "modern-compact",
    canvas: { width: 800, height: 380, unit: "px" },
    theme: {
      background: "#0A0B0D",
      surface: "#141619",
      accent: "#38BDF8",
      textColor: "#F1F5F9",
      secondaryTextColor: "#64748B",
      borderColor: "#1E293B",
      fontFamily: "sans",
    },
    stub: {
      perforationPosition: "right",
      stubWidth: 220,
      badgeText: "GENERAL ADMISSION",
      showPerforationDots: true,
    },
    qr: {
      size: 160,
      label: "SCAN TO VERIFY",
      rotating: true,
      refreshIntervalSec: 30,
    },
    elements: [],
  },
  "vip-emerald": {
    layout: "cinematic-horizontal",
    canvas: { width: 800, height: 380, unit: "px" },
    theme: {
      background: "#0B110D",
      surface: "#111B14",
      accent: "#10B981",
      textColor: "#ECFDF5",
      secondaryTextColor: "#6EE7B7",
      borderColor: "#064E3B",
      fontFamily: "cinematic",
    },
    stub: {
      perforationPosition: "right",
      stubWidth: 240,
      badgeText: "STAGE PASS",
      showPerforationDots: true,
    },
    qr: {
      size: 180,
      label: "SCAN TO VERIFY",
      rotating: true,
      refreshIntervalSec: 30,
    },
    elements: [],
  },
  "electric-pulse": {
    layout: "modern-compact",
    canvas: { width: 800, height: 380, unit: "px" },
    theme: {
      background: "#0E0C16",
      surface: "#171424",
      accent: "#A855F7",
      textColor: "#FAF5FF",
      secondaryTextColor: "#C084FC",
      borderColor: "#3B0764",
      fontFamily: "mono",
    },
    stub: {
      perforationPosition: "right",
      stubWidth: 230,
      badgeText: "CYBER PASS",
      showPerforationDots: true,
    },
    qr: {
      size: 170,
      label: "LIVE SECURE KEY",
      rotating: true,
      refreshIntervalSec: 30,
    },
    elements: [],
  },
};

export default function StudioClient({
  initialTemplates,
  initialEvents,
  initialError,
  isPreview,
}: StudioClientProps) {
  const [templates, setTemplates] = useState<TicketTemplate[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplates[0]?.id || "77777777-7777-7777-7777-777777770001"
  );
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(1);
  const [editorMode, setEditorMode] = useState<"customizer" | "visual" | "preview">("customizer");
  const [previewTab, setPreviewTab] = useState<"ticket" | "email" | "print">("ticket");

  // Design state with undo/redo history
  const [design, setDesign] = useState<TicketDesignData>(STARTER_TEMPLATES["cinematic-midnight"]);
  const [history, setHistory] = useState<TicketDesignData[]>([STARTER_TEMPLATES["cinematic-midnight"]]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Selected element for advanced canvas editor
  const [selectedElementId, setSelectedElementId] = useState<string | null>("el-title");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showSafeMargins, setShowSafeMargins] = useState<boolean>(true);
  const [showSyntheticData, setShowSyntheticData] = useState<boolean>(true);

  // Sample Preview Values state
  const [sampleData, setSampleData] = useState({
    eventTitle: "Annual Design & Tech Summit 2026",
    attendeeName: "Aditi Rao",
    ticketNumber: "TKT-2026-8849-GL",
    teamName: "CodeCraft Orbit",
    venue: "University Central Auditorium, Zone 1",
    startDate: "2026-11-21T10:00:00Z",
    category: "KEYNOTE & SHOWCASE",
    status: "CONFIRMED",
  });

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Helper to get current text of an element (handles dynamic vs custom text)
  const getElementCurrentText = (el: CanvasElement): string => {
    if (typeof el.sampleValue === "string") {
      return el.sampleValue;
    }
    if (typeof el.text === "string") {
      return el.text;
    }
    if (el.bindingKey && el.bindingKey !== "custom") {
      switch (el.bindingKey) {
        case "event_title":
          return sampleData.eventTitle;
        case "attendee_name":
          return sampleData.attendeeName;
        case "ticket_number":
          return sampleData.ticketNumber;
        case "venue":
          return sampleData.venue;
        case "team_name":
          return sampleData.teamName || "";
        case "category":
          return sampleData.category;
        case "status":
          return sampleData.status;
        default:
          return "";
      }
    }
    return "";
  };

  // Helper to update text content or sample value immediately
  const handleUpdateElementText = (id: string, newText: string) => {
    updateDesign((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id !== id) return el;
        if (el.bindingKey && el.bindingKey !== "custom") {
          return {
            ...el,
            sampleValue: newText,
            text: newText,
          };
        } else {
          return {
            ...el,
            text: newText,
          };
        }
      }),
    }));

    // Synchronize sampleData if dynamic field
    const targetEl = design.elements.find((e) => e.id === id);
    if (targetEl?.bindingKey && targetEl.bindingKey !== "custom") {
      setSampleData((prev) => {
        const next = { ...prev };
        if (targetEl.bindingKey === "event_title") next.eventTitle = newText;
        else if (targetEl.bindingKey === "attendee_name") next.attendeeName = newText;
        else if (targetEl.bindingKey === "ticket_number") next.ticketNumber = newText;
        else if (targetEl.bindingKey === "venue") next.venue = newText;
        else if (targetEl.bindingKey === "team_name") next.teamName = newText;
        else if (targetEl.bindingKey === "category") next.category = newText;
        else if (targetEl.bindingKey === "status") next.status = newText;
        return next;
      });
    }
  };

  // Duplicate Element
  const handleDuplicateElement = (id: string) => {
    const elToDup = design.elements.find((el) => el.id === id);
    if (!elToDup) return;
    const newId = `el-${Date.now()}`;
    const duplicated: CanvasElement = {
      ...elToDup,
      id: newId,
      x: Math.min(design.canvas.width - elToDup.width, elToDup.x + 15),
      y: Math.min(design.canvas.height - elToDup.height, elToDup.y + 15),
      isLocked: false,
    };
    updateDesign((prev) => ({
      ...prev,
      elements: [...prev.elements, duplicated],
    }));
    setSelectedElementId(newId);
  };

  // Layer Ordering Handlers
  const handleBringToFront = (id: string) => {
    updateDesign((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1 || idx === prev.elements.length - 1) return prev;
      const el = prev.elements[idx];
      const rest = prev.elements.filter((e) => e.id !== id);
      return { ...prev, elements: [...rest, el] };
    });
  };

  const handleSendToBack = (id: string) => {
    updateDesign((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1 || idx === 0) return prev;
      const el = prev.elements[idx];
      const rest = prev.elements.filter((e) => e.id !== id);
      return { ...prev, elements: [el, ...rest] };
    });
  };

  const handleBringForward = (id: string) => {
    updateDesign((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx === -1 || idx === prev.elements.length - 1) return prev;
      const copy = [...prev.elements];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return { ...prev, elements: copy };
    });
  };

  const handleSendBackward = (id: string) => {
    updateDesign((prev) => {
      const idx = prev.elements.findIndex((e) => e.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev.elements];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return { ...prev, elements: copy };
    });
  };

  // Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Background Image Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  // Selected event for assignment
  const [targetEventId, setTargetEventId] = useState<string>(initialEvents[0]?.id || "");

  // Handle Background Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadTicketBackgroundAction(formData);

      if (res.success && res.data) {
        updateDesign((prev) => ({
          ...prev,
          backgroundImage: {
            url: res.data.url,
            fit: prev.backgroundImage?.fit || "cover",
            position: prev.backgroundImage?.position || "center",
            overlayColor: prev.backgroundImage?.overlayColor || "#000000",
            overlayOpacity: prev.backgroundImage?.overlayOpacity ?? 0.25,
          },
        }));
        setFeedback({ type: "success", text: "Ticket background uploaded successfully." });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to upload image." });
      }
    } catch {
      setFeedback({ type: "error", text: "Network error during background upload." });
    } finally {
      setIsUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleRemoveBg = () => {
    updateDesign((prev) => ({
      ...prev,
      backgroundImage: undefined,
    }));
    setFeedback({ type: "success", text: "Background image removed." });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Update design with undo/redo support
  const updateDesign = (updater: (prev: TicketDesignData) => TicketDesignData) => {
    setDesign((prev) => {
      const next = updater(prev);
      const newHistory = history.slice(0, historyIdx + 1);
      newHistory.push(next);
      if (newHistory.length > 25) newHistory.shift();
      setHistory(newHistory);
      setHistoryIdx(newHistory.length - 1);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setDesign(history[historyIdx - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setDesign(history[historyIdx + 1]);
    }
  };

  // Keyboard navigation for canvas editor (Accessibility Requirement)
  useEffect(() => {
    if (editorMode !== "visual" || !selectedElementId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept arrow keys or typing if user is focused inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;

        updateDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id !== selectedElementId) return el;
            let nx = el.x;
            let ny = el.y;
            if (e.key === "ArrowLeft") nx = Math.max(0, el.x - step);
            if (e.key === "ArrowRight") nx = Math.min(prev.canvas.width - el.width, el.x + step);
            if (e.key === "ArrowUp") ny = Math.max(0, el.y - step);
            if (e.key === "ArrowDown") ny = Math.min(prev.canvas.height - el.height, el.y + step);
            return { ...el, x: nx, y: ny };
          }),
        }));
      }

      if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateElement(selectedElementId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorMode, selectedElementId]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await saveTemplateDraftAction({
        templateId: selectedTemplateId,
        designData: design,
      });
      if (res.success) {
        setFeedback({ type: "success", text: "Draft design changes saved." });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "Unexpected network error while saving draft." });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Publish Immutable Version
  const handlePublish = async () => {
    setIsPublishing(true);
    setFeedback(null);
    try {
      const res = await publishTemplateVersionAction({
        templateId: selectedTemplateId,
        designData: design,
      });
      if (res.success && res.data) {
        setActiveVersionNumber(res.data.versionNumber);
        setFeedback({
          type: "success",
          text: `Immutable Version ${res.data.versionNumber} published. Existing passes remain locked to their issuance version.`,
        });
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to publish version." });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to publish template version." });
    } finally {
      setIsPublishing(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  // Handle Assign to Event
  const handleAssignToEvent = async () => {
    if (!targetEventId) {
      setFeedback({ type: "error", text: "Please select an event to assign this template." });
      return;
    }
    setIsAssigning(true);
    setFeedback(null);
    try {
      // Automatically publish current design version first so assigned event gets latest changes
      let versionToAssign: string | null = null;
      const pubRes = await publishTemplateVersionAction({
        templateId: selectedTemplateId,
        designData: design,
        notes: "Auto-published version on event assignment",
      });

      if (pubRes.success && pubRes.data?.versionId) {
        versionToAssign = pubRes.data.versionId;
        setActiveVersionNumber(pubRes.data.versionNumber);
      } else {
        const tplRes = await getTicketTemplateAction(selectedTemplateId);
        if (tplRes.success && tplRes.data?.versions?.length) {
          versionToAssign = tplRes.data.versions[tplRes.data.versions.length - 1].id;
        }
      }

      if (!versionToAssign) {
        versionToAssign = "88888888-8888-8888-8888-888888880001";
      }

      const res = await assignEventTemplateAction({
        eventId: targetEventId,
        templateVersionId: versionToAssign,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Ticket design successfully assigned to event. Attendees will receive this exact pass.",
        });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "Failed to assign template." });
    } finally {
      setIsAssigning(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Selected element helper
  const selectedElement = useMemo(
    () => design.elements.find((el) => el.id === selectedElementId),
    [design.elements, selectedElementId]
  );

  const [isExportingSvg, setIsExportingSvg] = useState(false);

  const handleExportSvg = async () => {
    setIsExportingSvg(true);
    try {
      const svg = await generateUnifiedTicketSvg({
        design,
        event: {
          title: sampleData.eventTitle,
          category: sampleData.category,
          venue: sampleData.venue,
          venueMode: "in-person",
          startDate: sampleData.startDate,
        },
        attendee: {
          name: sampleData.attendeeName,
          ticketNumber: sampleData.ticketNumber,
          teamName: sampleData.teamName,
        },
      });

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-template-test.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", text: "Ticket template SVG exported successfully." });
    } catch {
      setFeedback({ type: "error", text: "Failed to export ticket SVG." });
    } finally {
      setIsExportingSvg(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddElement = (bindingKey: any, defaultText: string) => {
    const newId = `el-${Date.now()}`;
    const newEl: CanvasElement = {
      id: newId,
      type: "text",
      x: 60,
      y: 60,
      width: 280,
      height: 36,
      zIndex: 2,
      isLocked: false,
      bindingKey,
      text: defaultText,
      fontSize: bindingKey === "event_title" ? 24 : 14,
      fontWeight: bindingKey === "event_title" ? "bold" : "medium",
      color: "#F3F4F6",
      alignment: "left",
    };

    updateDesign((prev) => ({
      ...prev,
      elements: [...prev.elements, newEl],
    }));
    setSelectedElementId(newId);
  };

  const handleDeleteElement = (id: string) => {
    updateDesign((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pb-12 max-w-[1440px] mx-auto text-[#17191C]">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[#858B93] uppercase">
            SKETCHHUB WORKSPACE / FORM GENERATOR &amp; PASS STUDIO
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17191C] flex items-center gap-2.5">
              <Ticket className="h-6 w-6 text-[#17191C]" />
              Form Generator &amp; Pass Studio
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold border-[#E5E7E9] bg-white text-[#17191C]">
              v{activeVersionNumber} Published
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#858B93]">
            Create personalized event passes, customize visual themes, and publish immutable template versions.
          </p>
        </div>

        {/* Global Studio Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSvg}
            disabled={isExportingSvg}
            className="rounded-lg h-9 px-3.5 text-xs font-semibold gap-1.5 border-[#E5E7E9] text-[#17191C]"
          >
            <Download className="h-3.5 w-3.5 text-[#777E86]" />
            <span>Export SVG</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="rounded-lg h-9 px-4 text-xs font-semibold gap-1.5 border-[#E5E7E9] text-[#17191C]"
          >
            <Save className="h-3.5 w-3.5 text-[#777E86]" />
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
            className="rounded-lg h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs bg-[#17191C] text-white hover:bg-[#25292F]"
          >
            <Sparkles className="h-3.5 w-3.5 text-white/80" />
            <span>{isPublishing ? "Publishing..." : "Publish Version"}</span>
          </Button>
        </div>
      </div>

      {/* Database Schema Notice Banner */}
      {initialError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-300">Database Schema Notice</div>
            <div className="text-amber-200/90">{initialError}</div>
            <div className="text-[11px] text-[#A6ADB5] pt-0.5">
              The connected database requires Migration 00007. When ready to synchronize remote Supabase, run:{" "}
              <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                npx supabase db push
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Studio Navigation & Mode Selector */}
      <div className="flex items-center justify-between border-b border-[#E5E7E9]  pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#F6F7F8]  rounded-xl border border-[#E5E7E9] ">
          <button
            onClick={() => setEditorMode("customizer")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              editorMode === "customizer"
                ? "bg-white  text-[#34383D]  shadow-sm"
                : "text-[#858B93]  hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Template Customizer</span>
          </button>

          <button
            onClick={() => setEditorMode("visual")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              editorMode === "visual"
                ? "bg-white  text-[#34383D]  shadow-sm"
                : "text-[#858B93]  hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span>Visual Canvas Editor</span>
          </button>

          <button
            onClick={() => setEditorMode("preview")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              editorMode === "preview"
                ? "bg-white  text-[#34383D]  shadow-sm"
                : "text-[#858B93]  hover:text-[#34383D] dark:hover:text-[#F1F2F3]"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Omnichannel Previews</span>
          </button>
        </div>

        {/* Starter Layout Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#858B93]  font-medium hidden sm:inline">
            Preset:
          </span>
          <select
            value={design.theme.accent === "#E2B857" ? "cinematic-midnight" : design.theme.accent === "#38BDF8" ? "minimal-carbon" : design.theme.accent === "#10B981" ? "vip-emerald" : "electric-pulse"}
            onChange={(e) => {
              const preset = STARTER_TEMPLATES[e.target.value];
              if (preset) updateDesign(() => preset);
            }}
            className="text-xs font-semibold bg-white  border border-[#E5E7E9]  rounded-xl px-3 py-1.5 text-[#34383D] "
          >
            <option value="cinematic-midnight">Cinematic Midnight Premiere</option>
            <option value="minimal-carbon">Minimal Carbon Stub</option>
            <option value="vip-emerald">VIP Emerald Gala</option>
            <option value="electric-pulse">Modern Electric Pulse</option>
          </select>
        </div>
      </div>

      {/* Main Studio Body */}
      {editorMode === "customizer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Controls Panel */}
          <div className="lg:col-span-4 space-y-5">
            {/* Visual Tokens Card */}
            <Card className="rounded-xl border-[#E5E7E9]  shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-500" />
                  Color Palette & Atmosphere
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3.5 text-xs">
                {/* Accent Color */}
                <ColorPickerField
                  label="Accent Color"
                  value={design.theme.accent}
                  onChange={(hex) =>
                    updateDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, accent: hex },
                    }))
                  }
                />

                {/* Surface Base */}
                <ColorPickerField
                  label="Surface Base"
                  value={design.theme.surface}
                  onChange={(hex) =>
                    updateDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, surface: hex },
                    }))
                  }
                />

                {/* Text Color */}
                <ColorPickerField
                  label="Text Color"
                  value={design.theme.textColor || "#F3F4F6"}
                  onChange={(hex) =>
                    updateDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, textColor: hex },
                    }))
                  }
                />

                {/* Background Color */}
                <ColorPickerField
                  label="Background Color"
                  value={design.theme.background || "#111315"}
                  onChange={(hex) =>
                    updateDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, background: hex },
                    }))
                  }
                />

                {/* Border Color */}
                <ColorPickerField
                  label="Border Color"
                  value={design.theme.borderColor || "#2C3136"}
                  onChange={(hex) =>
                    updateDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, borderColor: hex },
                    }))
                  }
                />

                <div>
                  <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                    Typography Mode
                  </label>
                  <select
                    value={design.theme.fontFamily}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, fontFamily: e.target.value as any },
                      }))
                    }
                    className="w-full text-xs font-semibold bg-white  border border-[#E5E7E9]  rounded-xl px-3 py-2 text-[#34383D] "
                  >
                    <option value="cinematic">Cinematic Display (Bold Editorial)</option>
                    <option value="sans">Modern Geometric Sans</option>
                    <option value="mono">Cyber Monospace Terminal</option>
                    <option value="serif">Classic Formal Serif</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Background Settings */}
            <Card className="rounded-xl border-[#E5E7E9]  shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-sky-500" />
                    Ticket Background
                  </span>
                  {design.backgroundImage && (
                    <Badge variant="outline" className="text-[10px] text-sky-600 dark:text-sky-400 border-sky-500/30">
                      Active Image
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4 text-xs">
                {/* Upload Action */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingBg}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-xl text-xs font-semibold h-9 flex items-center justify-center gap-2"
                  >
                    {isUploadingBg ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>{design.backgroundImage ? "Replace Image" : "Upload Image"}</span>
                      </>
                    )}
                  </Button>

                  {design.backgroundImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveBg}
                      title="Remove background image"
                      className="h-9 px-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-[#858B93] ">
                  PNG, JPEG, WebP up to 5MB. Verified server-side.
                </p>

                {design.backgroundImage && (
                  <div className="space-y-3 pt-2 border-t border-[#E5E7E9] ">
                    {/* Fit Mode */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                        Image Fit
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateDesign((prev) => ({
                              ...prev,
                              backgroundImage: {
                                ...prev.backgroundImage!,
                                fit: "cover",
                              },
                            }))
                          }
                          className={`py-1.5 px-3 text-xs font-semibold rounded-xl border text-center transition-colors ${
                            design.backgroundImage.fit === "cover"
                              ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "border-[#E5E7E9]  hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          }`}
                        >
                          Cover / Fill
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateDesign((prev) => ({
                              ...prev,
                              backgroundImage: {
                                ...prev.backgroundImage!,
                                fit: "contain",
                              },
                            }))
                          }
                          className={`py-1.5 px-3 text-xs font-semibold rounded-xl border text-center transition-colors ${
                            design.backgroundImage.fit === "contain"
                              ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "border-[#E5E7E9]  hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          }`}
                        >
                          Contain / Fit
                        </button>
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                        Alignment Position
                      </label>
                      <select
                        value={design.backgroundImage.position || "center"}
                        onChange={(e) =>
                          updateDesign((prev) => ({
                            ...prev,
                            backgroundImage: {
                              ...prev.backgroundImage!,
                              position: e.target.value as any,
                            },
                          }))
                        }
                        className="w-full text-xs font-semibold bg-white  border border-[#E5E7E9]  rounded-xl px-3 py-2 text-[#34383D] "
                      >
                        <option value="center">Center</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                    </div>

                    {/* Contrast Overlay Color & Opacity */}
                    <div>
                      <div className="mb-2">
                        <ColorPickerField
                          label="Readability Contrast Overlay"
                          value={design.backgroundImage.overlayColor || "#000000"}
                          onChange={(hex) =>
                            updateDesign((prev) => ({
                              ...prev,
                              backgroundImage: {
                                ...prev.backgroundImage!,
                                overlayColor: hex,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-[#858B93] ">
                          <span>Dimming Opacity</span>
                          <span className="font-mono font-bold">
                            {Math.round((design.backgroundImage.overlayOpacity ?? 0.25) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="0.95"
                          step="0.05"
                          value={design.backgroundImage.overlayOpacity ?? 0.25}
                          onChange={(e) =>
                            updateDesign((prev) => ({
                              ...prev,
                              backgroundImage: {
                                ...prev.backgroundImage!,
                                overlayOpacity: parseFloat(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-sky-500 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Perforated Stub Settings */}
            <Card className="rounded-xl border-[#E5E7E9]  shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-amber-500" />
                  Perforated Admission Stub
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                    Stub Badge Title
                  </label>
                  <input
                    type="text"
                    value={design.stub.badgeText}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        stub: { ...prev.stub, badgeText: e.target.value },
                      }))
                    }
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-[#E5E7E9]  bg-[#F9FAFB] dark:bg-[#15171A]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                    Perforation Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          stub: { ...prev.stub, perforationPosition: "right" },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-colors ${
                        design.stub.perforationPosition === "right"
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-[#E5E7E9]  hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      Right Side Stub
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          stub: { ...prev.stub, perforationPosition: "none" },
                        }))
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-colors ${
                        design.stub.perforationPosition === "none"
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-[#E5E7E9]  hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      }`}
                    >
                      Seamless Card
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Assignment Card */}
            <Card className="rounded-xl border-[#E5E7E9]  shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  Assign to Operational Event
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-[#858B93]  uppercase block mb-1.5">
                    Target Event
                  </label>
                  <select
                    value={targetEventId}
                    onChange={(e) => setTargetEventId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white  border border-[#E5E7E9]  rounded-xl px-3 py-2 text-[#34383D] "
                  >
                    {initialEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.lifecycle})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAssignToEvent}
                  disabled={isAssigning}
                  className="w-full rounded-xl text-xs font-semibold h-9"
                >
                  {isAssigning ? "Linking..." : "Confirm Event Assignment"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Live Preview Canvas */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#858B93]  uppercase tracking-wider">
                  Live Synthetic Preview
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                  Sample Data Bound
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSyntheticData(!showSyntheticData)}
                  className="text-xs text-[#858B93]  hover:text-[#34383D] dark:hover:text-[#F1F2F3] font-medium"
                >
                  {showSyntheticData ? "Show Variable Keys" : "Show Sample Data"}
                </button>
              </div>
            </div>

            {/* Rendered Cinematic Ticket Card */}
            <div className="p-4 sm:p-8 rounded-xl bg-[#F8F9FA] border border-[#23272C] flex items-center justify-center overflow-x-auto">
              <RenderedTicketCard
                design={design}
                showSyntheticData={showSyntheticData}
                sampleData={sampleData}
              />
            </div>

            {/* Security Guarantee Note */}
            <div className="p-4 rounded-xl bg-[#F9FAFB]  border border-[#E5E7E9]  flex items-start gap-3 text-xs text-[#858B93] ">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#34383D]  block mb-0.5">
                  Version History & Immutability
                </strong>
                When an organizer publishes a template, a permanent frozen version is stored. Already-issued participant passes can never be unexpectedly distorted or broken by future template edits.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Canvas Editor Mode */}
      {editorMode === "visual" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Canvas Tools Toolbar */}
          <div className="lg:col-span-12 flex items-center justify-between p-3 bg-white  rounded-xl border border-[#E5E7E9]  shadow-sm flex-wrap gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIdx >= history.length - 1}
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-medium px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(1)}
                className="h-8 text-xs px-2"
              >
                Reset Zoom
              </Button>
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              {/* Quick Add Dynamic Fields */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("attendee_name", "Participant Name")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Attendee Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("event_title", "Event Title")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Event Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("ticket_number", "TKT-2026-0001")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Ticket ID
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("venue", "Event Venue Hall")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Venue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("start_date", "Event Date & Time")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Date
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddElement("custom", "Custom Notice")}
                  className="h-8 text-[11px] font-semibold px-2.5 rounded-lg border-[#E5E7E9]"
                >
                  <Plus className="h-3 w-3 mr-1 text-amber-500" />
                  Custom
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-[#858B93]  cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSafeMargins}
                  onChange={(e) => setShowSafeMargins(e.target.checked)}
                  className="rounded border-[#E5E7E9] "
                />
                <span>Safe Print Margins</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSyntheticData(!showSyntheticData)}
                className="text-xs text-[#858B93] hover:text-[#17191C] dark:hover:text-white font-medium"
              >
                {showSyntheticData ? "Show Variable Keys" : "Show Sample Data"}
              </button>
            </div>
          </div>

          {/* Interactive Canvas Workspace */}
          <div className="lg:col-span-8 p-6 sm:p-12 bg-[#0A0B0D] rounded-3xl border border-[#23272C] flex items-center justify-center overflow-auto min-h-[480px]">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
              }}
            >
              <InteractiveCanvas
                design={design}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                showSafeMargins={showSafeMargins}
                showSyntheticData={showSyntheticData}
                zoomLevel={zoomLevel}
                onUpdateElementPosition={(id, x, y) => {
                  updateDesign((prev) => ({
                    ...prev,
                    elements: prev.elements.map((el) => (el.id === id ? { ...el, x, y } : el)),
                  }));
                }}
                onUpdateElementSize={(id, width, height) => {
                  updateDesign((prev) => ({
                    ...prev,
                    elements: prev.elements.map((el) => (el.id === id ? { ...el, width, height } : el)),
                  }));
                }}
                getElementCurrentText={getElementCurrentText}
                onUpdateElementText={handleUpdateElementText}
                inlineEditingId={inlineEditingId}
                onSetInlineEditingId={setInlineEditingId}
              />
            </div>
          </div>

          {/* Element Inspector Panel */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="rounded-xl border-[#E5E7E9] dark:border-[#23272C] shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Element Properties</span>
                  <div className="flex items-center gap-1.5">
                    {selectedElement && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicateElement(selectedElement.id)}
                          title="Duplicate element (Ctrl+D)"
                          className="h-7 text-xs gap-1 px-2 border-[#E5E7E9] dark:border-[#23272C]"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Duplicate</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteElement(selectedElement.id)}
                          title="Delete element (Del)"
                          className="h-7 text-xs text-rose-500 hover:text-rose-600 gap-1 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4 text-xs">
                {selectedElement ? (
                  <>
                    {/* Primary Text Content / Preview Value Input */}
                    <div className="space-y-1.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="element-text-input"
                          className="text-[11px] font-bold text-amber-500 uppercase flex items-center gap-1.5"
                        >
                          <Type className="h-3.5 w-3.5" />
                          <span>{selectedElement.bindingKey ? "Preview / Sample Text" : "Text Content"}</span>
                        </label>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold ${
                            selectedElement.bindingKey
                              ? "text-amber-500 border-amber-500/40 bg-amber-500/10"
                              : "text-sky-400 border-sky-400/40 bg-sky-400/10"
                          }`}
                        >
                          {selectedElement.bindingKey ? `Variable: {{${selectedElement.bindingKey}}}` : "Custom Text"}
                        </Badge>
                      </div>
                      <input
                        id="element-text-input"
                        ref={textInputRef}
                        type="text"
                        value={getElementCurrentText(selectedElement)}
                        onChange={(e) => handleUpdateElementText(selectedElement.id, e.target.value)}
                        placeholder={selectedElement.bindingKey ? "Enter preview value..." : "Enter text content..."}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-amber-500/30 bg-background focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium text-foreground"
                      />
                      {selectedElement.bindingKey ? (
                        <p className="text-[10px] text-[#858B93] leading-tight">
                          Live sample value. When tickets are issued to attendees, this is replaced by the actual {selectedElement.bindingKey.replace(/_/g, " ")}.
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#858B93] leading-tight">
                          Static text displayed on every ticket. Supports full backspace, delete, and special characters.
                        </p>
                      )}
                    </div>

                    {/* Dynamic Variable Binding Selector */}
                    <div>
                      <span className="text-[11px] font-semibold text-[#858B93] uppercase block mb-1">
                        Dynamic Field Binding
                      </span>
                      <select
                        value={selectedElement.bindingKey || "custom"}
                        onChange={(e) => {
                          const val = e.target.value === "custom" ? undefined : (e.target.value as any);
                          updateDesign((prev) => ({
                            ...prev,
                            elements: prev.elements.map((el) =>
                              el.id === selectedElement.id ? { ...el, bindingKey: val } : el
                            ),
                          }));
                        }}
                        className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                      >
                        <option value="custom">No Dynamic Binding (Custom Static Text)</option>
                        <option value="event_title">event_title (Event Title)</option>
                        <option value="attendee_name">attendee_name (Attendee / Participant Name)</option>
                        <option value="ticket_number">ticket_number (Ticket ID / Pass Number)</option>
                        <option value="venue">venue (Venue / Location)</option>
                        <option value="start_date">start_date (Event Date & Time)</option>
                        <option value="team_name">team_name (Team / Organization)</option>
                        <option value="category">category (Ticket Category / Tier)</option>
                        <option value="status">status (Ticket Status)</option>
                      </select>
                    </div>

                    {/* Coordinates (X, Y) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          X Position (px)
                        </label>
                        <input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, x: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Y Position (px)
                        </label>
                        <input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, y: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>
                    </div>

                    {/* Dimensions (Width, Height) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          min="20"
                          value={selectedElement.width}
                          onChange={(e) => {
                            const val = Math.max(20, Number(e.target.value));
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, width: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          min="16"
                          value={selectedElement.height}
                          onChange={(e) => {
                            const val = Math.max(16, Number(e.target.value));
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, height: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="text-[11px] text-[#858B93] block mb-1">
                        Font Family (Theme)
                      </label>
                      <select
                        value={design.theme.fontFamily || "sans"}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          updateDesign((prev) => ({
                            ...prev,
                            theme: {
                              ...prev.theme,
                              fontFamily: val,
                            },
                          }));
                        }}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                      >
                        <option value="cinematic">Cinematic Display (Bold Editorial)</option>
                        <option value="sans">Modern Sans (Inter/Helvetica)</option>
                        <option value="mono">Cyber Monospace Terminal</option>
                        <option value="serif">Classic Formal Serif</option>
                      </select>
                    </div>

                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Font Size ({selectedElement.fontSize || 16}px)
                        </label>
                        <input
                          type="number"
                          min="8"
                          max="96"
                          value={selectedElement.fontSize || 16}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, fontSize: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Font Weight
                        </label>
                        <select
                          value={selectedElement.fontWeight || "normal"}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, fontWeight: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="semibold">Semibold</option>
                          <option value="bold">Bold</option>
                          <option value="extrabold">Extra Bold</option>
                        </select>
                      </div>
                    </div>

                    {/* Alignment & Text Color */}
                    <div className="grid grid-cols-2 gap-2.5 items-end">
                      <div>
                        <label className="text-[11px] text-[#858B93] block mb-1">
                          Alignment
                        </label>
                        <div className="flex rounded-lg border border-[#E5E7E9] dark:border-[#23272C] p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "left" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "left" || !selectedElement.alignment
                                ? "bg-amber-500 text-black font-bold"
                                : "text-[#858B93] hover:text-foreground"
                            }`}
                          >
                            <AlignLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "center" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "center"
                                ? "bg-amber-500 text-black font-bold"
                                : "text-[#858B93] hover:text-foreground"
                            }`}
                          >
                            <AlignCenter className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "right" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "right"
                                ? "bg-amber-500 text-black font-bold"
                                : "text-[#858B93] hover:text-foreground"
                            }`}
                          >
                            <AlignRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <ColorPickerField
                          label="Text Color"
                          value={selectedElement.color || "#F3F4F6"}
                          onChange={(hex) => {
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, color: hex } : el
                              ),
                            }));
                          }}
                          align="right"
                        />
                      </div>
                    </div>

                    {/* Letter Spacing, Line Height, Rotation */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-[#858B93] block mb-1">
                          Spacing (px)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="-5"
                          max="20"
                          value={selectedElement.letterSpacing ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, letterSpacing: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#858B93] block mb-1">
                          Line Height
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.8"
                          max="3"
                          value={selectedElement.lineHeight ?? 1.2}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, lineHeight: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-[#858B93] block mb-1">
                          Rotation (deg)
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="-180"
                          max="180"
                          value={selectedElement.rotation ?? 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, rotation: val } : el
                              ),
                            }));
                          }}
                          className="w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-[#E5E7E9] dark:border-[#23272C] bg-[#F9FAFB] dark:bg-[#15171A]"
                        />
                      </div>
                    </div>

                    {/* Layer Ordering Controls */}
                    <div className="pt-2 border-t border-[#E5E7E9] dark:border-[#23272C]">
                      <span className="text-[11px] font-semibold text-[#858B93] uppercase block mb-1.5">
                        Layer Ordering
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBringToFront(selectedElement.id)}
                          className="h-8 text-[10px] px-1 flex flex-col items-center justify-center gap-0.5 border-[#E5E7E9] dark:border-[#23272C]"
                          title="Bring to Front"
                        >
                          <ChevronsUp className="h-3 w-3" />
                          <span className="truncate">To Front</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBringForward(selectedElement.id)}
                          className="h-8 text-[10px] px-1 flex flex-col items-center justify-center gap-0.5 border-[#E5E7E9] dark:border-[#23272C]"
                          title="Bring Forward"
                        >
                          <ArrowUp className="h-3 w-3" />
                          <span className="truncate">Forward</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendBackward(selectedElement.id)}
                          className="h-8 text-[10px] px-1 flex flex-col items-center justify-center gap-0.5 border-[#E5E7E9] dark:border-[#23272C]"
                          title="Send Backward"
                        >
                          <ArrowDown className="h-3 w-3" />
                          <span className="truncate">Backward</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendToBack(selectedElement.id)}
                          className="h-8 text-[10px] px-1 flex flex-col items-center justify-center gap-0.5 border-[#E5E7E9] dark:border-[#23272C]"
                          title="Send to Back"
                        >
                          <ChevronsDown className="h-3 w-3" />
                          <span className="truncate">To Back</span>
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[#8E95A0] italic text-center py-4">
                    Click an element on the canvas to inspect and configure its attributes.
                  </p>
                )}

                {/* Canvas Layers List */}
                <div className="pt-3 border-t border-[#E5E7E9] dark:border-[#23272C] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#858B93] uppercase">
                      Canvas Elements ({design.elements.length})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newId = `el-custom-${Date.now()}`;
                        const newElement: CanvasElement = {
                          id: newId,
                          type: "text",
                          x: 40,
                          y: 240,
                          width: 220,
                          height: 30,
                          zIndex: design.elements.length + 1,
                          isLocked: false,
                          text: "New Text Element",
                          fontSize: 14,
                          fontWeight: "normal",
                          color: "#F3F4F6",
                          alignment: "left",
                        };
                        updateDesign((prev) => ({
                          ...prev,
                          elements: [...prev.elements, newElement],
                        }));
                        setSelectedElementId(newId);
                      }}
                      className="h-6 text-[10px] gap-1 px-2 text-amber-500 hover:text-amber-400"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Text</span>
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {design.elements.map((el, idx) => {
                      const isSelected = el.id === selectedElementId;
                      const textLabel = getElementCurrentText(el) || el.text || el.bindingKey || "Untitled";
                      return (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 font-semibold"
                              : "hover:bg-neutral-800/40 border border-transparent text-[#858B93]"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] text-muted-foreground w-4">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[140px]">{textLabel}</span>
                          </div>
                          <span className="font-mono text-[9px] uppercase px-1 rounded bg-neutral-800 text-neutral-400">
                            {el.bindingKey || "static"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Omnichannel Preview Mode */}
      {editorMode === "preview" && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[#E5E7E9]  pb-3">
            <button
              onClick={() => setPreviewTab("ticket")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                previewTab === "ticket"
                  ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] "
                  : "text-[#858B93] "
              }`}
            >
              <Ticket className="h-4 w-4" />
              <span>Cinematic Live Pass</span>
            </button>
            <button
              onClick={() => setPreviewTab("email")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                previewTab === "email"
                  ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] "
                  : "text-[#858B93] "
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Transactional Email View</span>
            </button>
            <button
              onClick={() => setPreviewTab("print")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 ${
                previewTab === "print"
                  ? "bg-[#E3E5E8] text-[#34383D] border border-[#E5E7E9] "
                  : "text-[#858B93] "
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Printable A4 / Badge Pass</span>
            </button>
          </div>

          {previewTab === "ticket" && (
            <div className="p-8 bg-[#F8F9FA] rounded-3xl border border-[#23272C] flex items-center justify-center">
              <RenderedTicketCard design={design} showSyntheticData={true} sampleData={sampleData} />
            </div>
          )}

          {previewTab === "email" && (
            <div className="max-w-[600px] mx-auto p-6 bg-white  rounded-3xl border border-[#E5E7E9]  shadow-sm space-y-4">
              <div className="border-b border-[#E5E7E9]  pb-3 text-xs text-[#858B93] ">
                <strong>Subject:</strong> Your Pass for {sampleData.eventTitle || "Sample Event Summit"}
              </div>
              <p className="text-sm">
                Hello <strong>{sampleData.attendeeName || "Sample Attendee"}</strong>,
              </p>
              <p className="text-xs text-[#858B93]  leading-relaxed">
                Your registration is confirmed. Tap the button below when arriving at the venue to present your entry pass. Official vector ticket pass attached to your confirmation.
              </p>
              <div className="p-4 rounded-xl bg-[#111315] text-white text-center space-y-2">
                <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  ENTRY PASS
                </span>
                <div className="font-mono text-base font-extrabold text-white">
                  {sampleData.ticketNumber || "TKT-2026-8849-GL"}
                </div>
                <div className="pt-2">
                  <a
                    href="#live-ticket"
                    className="inline-block px-5 py-2.5 rounded-full bg-amber-500 text-black font-bold text-xs shadow-md"
                  >
                    Open Live Ticket &amp; QR
                  </a>
                </div>
              </div>
            </div>
          )}

          {previewTab === "print" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white  rounded-xl border border-[#E5E7E9] ">
                <div>
                  <div className="font-bold text-sm text-[#34383D] ">Printable Landscape Admission Pass</div>
                  <div className="text-xs text-[#858B93] ">Landscape A4/letter ready. Zero surrounding UI or admin controls when printed.</div>
                </div>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 font-semibold text-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Ticket</span>
                </Button>
              </div>

              <div className="p-8 bg-[#F8F9FA] rounded-3xl border border-[#23272C] flex items-center justify-center overflow-x-auto">
                <RenderedTicketCard design={design} showSyntheticData={true} sampleData={sampleData} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Subcomponent: Rendered Ticket Preview (Uses Single Unified Ticket Component)
function RenderedTicketCard({
  design,
  showSyntheticData,
  sampleData,
}: {
  design: TicketDesignData;
  showSyntheticData: boolean;
  sampleData?: {
    eventTitle?: string;
    attendeeName?: string;
    ticketNumber?: string;
    venue?: string;
    teamName?: string;
    category?: string;
    status?: string;
  };
}) {
  return (
    <UnifiedTicketCard
      design={design}
      event={{
        title: sampleData?.eventTitle || "Annual Design & Tech Summit 2026",
        category: sampleData?.category || "KEYNOTE & SHOWCASE",
        venue: sampleData?.venue || "University Central Auditorium, Zone 1",
        venueMode: "in-person",
        startDate: "2026-11-21T10:00:00Z",
      }}
      attendee={{
        name: sampleData?.attendeeName || "Aditi Rao",
        ticketNumber: sampleData?.ticketNumber || "TKT-2026-8849-GL",
        teamName: sampleData?.teamName || "CodeCraft Orbit",
        ticketStatus: (sampleData?.status as any) || "active",
        attendanceStatus: "not_attended",
      }}
      qr={{
        type: "synthetic",
      }}
      showVariableKeys={!showSyntheticData}
    />
  );
}

// Subcomponent: Interactive Visual Canvas with Drag-and-Drop, Inline Editing, and Resizing
function InteractiveCanvas({
  design,
  selectedElementId,
  onSelectElement,
  showSafeMargins,
  showSyntheticData,
  zoomLevel = 1,
  onUpdateElementPosition,
  onUpdateElementSize,
  getElementCurrentText,
  onUpdateElementText,
  inlineEditingId,
  onSetInlineEditingId,
}: {
  design: TicketDesignData;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  showSafeMargins: boolean;
  showSyntheticData: boolean;
  zoomLevel?: number;
  onUpdateElementPosition?: (id: string, x: number, y: number) => void;
  onUpdateElementSize?: (id: string, width: number, height: number) => void;
  getElementCurrentText?: (el: CanvasElement) => string;
  onUpdateElementText?: (id: string, text: string) => void;
  inlineEditingId?: string | null;
  onSetInlineEditingId?: (id: string | null) => void;
}) {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startElX: number; startElY: number } | null>(null);

  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    if (!onUpdateElementPosition) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElX: el.x,
      startElY: el.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      const dx = (moveEvent.clientX - dragStartRef.current.startMouseX) / zoomLevel;
      const dy = (moveEvent.clientY - dragStartRef.current.startMouseY) / zoomLevel;

      const rawX = dragStartRef.current.startElX + dx;
      const rawY = dragStartRef.current.startElY + dy;
      // Snap to 5px grid
      const snappedX = Math.round(rawX / 5) * 5;
      const snappedY = Math.round(rawY / 5) * 5;

      const clampedX = Math.max(0, Math.min(design.canvas.width - el.width, snappedX));
      const clampedY = Math.max(0, Math.min(design.canvas.height - el.height, snappedY));

      onUpdateElementPosition(el.id, clampedX, clampedY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    if (!onUpdateElementSize) return;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startWidth = el.width;
    const startHeight = el.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / (zoomLevel || 1);
      const dy = (moveEvent.clientY - startMouseY) / (zoomLevel || 1);
      const newWidth = Math.max(30, Math.round((startWidth + dx) / 5) * 5);
      const newHeight = Math.max(16, Math.round((startHeight + dy) / 5) * 5);
      onUpdateElementSize(el.id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      style={{
        width: `${design.canvas.width}px`,
        height: `${design.canvas.height}px`,
        backgroundColor: design.theme.background,
        borderColor: design.theme.borderColor,
      }}
      className="relative rounded-xl border shadow-2xl overflow-hidden select-none"
    >
      {/* Background Image Layer if present */}
      {design.backgroundImage?.url && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${design.backgroundImage.url})`,
            backgroundSize: design.backgroundImage.fit || "cover",
            backgroundPosition: design.backgroundImage.position || "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: design.backgroundImage.overlayColor || "#000000",
              opacity: design.backgroundImage.overlayOpacity ?? 0.4,
            }}
          />
        </div>
      )}

      {/* Safe Print Margins Guide */}
      {showSafeMargins && (
        <div className="absolute inset-4 border border-dashed border-emerald-500/30 rounded-xl pointer-events-none z-50">
          <span className="absolute top-1 left-2 text-[8px] font-mono font-bold text-emerald-500/60 uppercase">
            Safe Printable Boundary
          </span>
        </div>
      )}

      {/* Render Canvas Elements with Dragging, Inline Edit & Resize */}
      {design.elements.map((el) => {
        const isSelected = el.id === selectedElementId;
        const isInlineEditing = inlineEditingId === el.id;
        const currentText = getElementCurrentText ? getElementCurrentText(el) : (el.sampleValue ?? el.text ?? "");
        const displayText = showSyntheticData
          ? (currentText || (el.bindingKey ? `{{${el.bindingKey}}}` : ""))
          : (el.bindingKey ? `{{${el.bindingKey}}}` : (el.text ?? ""));

        return (
          <div
            key={el.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectElement(el.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onSelectElement(el.id);
              onSetInlineEditingId?.(el.id);
            }}
            onMouseDown={(e) => {
              if (isInlineEditing) return;
              handleElementMouseDown(e, el);
            }}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
              zIndex: el.zIndex,
              color: el.color || design.theme.textColor,
              fontSize: `${el.fontSize || 14}px`,
              fontWeight: el.fontWeight || "normal",
              textAlign: el.alignment || "left",
              letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
              lineHeight: el.lineHeight ? `${el.lineHeight}` : undefined,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: "center center",
            }}
            className={`transition-shadow flex items-center relative ${
              isInlineEditing ? "cursor-text ring-2 ring-amber-400" : "cursor-move"
            } ${
              isSelected
                ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-neutral-900 rounded bg-amber-500/10"
                : "hover:ring-1 hover:ring-amber-500/50 rounded"
            }`}
            title="Click to select, drag to reposition, double-click to inline edit text"
          >
            {isInlineEditing ? (
              <input
                autoFocus
                type="text"
                value={currentText}
                onChange={(e) => onUpdateElementText?.(el.id, e.target.value)}
                onBlur={() => onSetInlineEditingId?.(null)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === "Escape") {
                    onSetInlineEditingId?.(null);
                  }
                }}
                className="w-full h-full bg-black/80 text-white rounded px-1 outline-none ring-1 ring-amber-400"
                style={{
                  color: el.color || design.theme.textColor,
                  fontSize: `${el.fontSize || 14}px`,
                  fontWeight: el.fontWeight || "normal",
                  textAlign: el.alignment || "left",
                }}
              />
            ) : (
              <span className="truncate w-full select-none">
                {displayText || <span className="opacity-40 italic">[Empty]</span>}
              </span>
            )}

            {/* Resize Handle */}
            {isSelected && !isInlineEditing && onUpdateElementSize && (
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, el)}
                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 border border-black rounded-sm cursor-se-resize z-30 shadow"
                title="Drag to resize"
              />
            )}
          </div>
        );
      })}

      {/* Perforated Stub Element */}
      {design.stub.perforationPosition === "right" && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: `${design.stub.stubWidth}px`,
            backgroundColor: design.theme.surface,
            borderLeft: "1px dashed #3A4048",
          }}
          className="p-6 flex flex-col items-center justify-between text-center pointer-events-none"
        >
          <span
            style={{ color: design.theme.accent }}
            className="text-[9px] font-bold uppercase tracking-wider"
          >
            {design.stub.badgeText}
          </span>
          <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center p-1">
            <QrCode className="h-20 w-20 text-black" />
          </div>
          <span className="text-[9px] text-[#858B93] font-mono">
            SECURE QR CODE
          </span>
        </div>
      )}
    </div>
  );
}


