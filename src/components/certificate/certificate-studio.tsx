"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Upload,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Save,
  CheckCircle2,
  Sparkles,
  Download,
  Plus,
  Eye,
  Layers,
  Palette,
  FileBadge,
  QrCode,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Copy,
  ChevronUp,
  ChevronDown,
  X,
  Pipette,
  Square,
  Move,
  RotateCw,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CertificateDesignData,
  CertificateElement,
  DEFAULT_CERTIFICATE_DESIGN,
  CertificateBindingKey,
  CertificateFontFamily,
  CertificateFontWeight,
  CertificateAlignment,
} from "@/types/certificate-template";
import { UnifiedCertificateCard } from "@/components/certificate/unified-certificate-card";
import { generateCertificateSvg } from "@/lib/certificate/certificate-renderer";
import {
  getActiveCertificateDesign,
  saveActiveCertificateDesign,
} from "@/lib/certificate/certificate-store";
import { ColorPickerField } from "@/components/ui/circular-color-picker";

interface CertificateStudioProps {
  initialDesign?: CertificateDesignData;
  onSave?: (design: CertificateDesignData) => void;
  className?: string;
}

export function CertificateStudio({
  initialDesign,
  onSave,
  className = "",
}: CertificateStudioProps) {
  // Initialize with stored or provided design
  const [design, setDesign] = useState<CertificateDesignData>(() => {
    if (initialDesign && initialDesign.elements && initialDesign.elements.length > 0) {
      return initialDesign;
    }
    return getActiveCertificateDesign();
  });

  const [history, setHistory] = useState<CertificateDesignData[]>([design]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>("cert-recipient-name");
  const [zoomLevel, setZoomLevel] = useState<number>(0.9);
  const [showSyntheticData, setShowSyntheticData] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const hasMovedRef = useRef(false);
  const dragStartPosRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);

  // Resizing state
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{
    handle: string;
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Current sample preview values helper
  const sampleValues = useMemo(() => {
    const recipientEl = design.elements.find((e) => e.bindingKey === "recipient_name");
    const recipientVal =
      typeof recipientEl?.sampleValue === "string"
        ? recipientEl.sampleValue
        : typeof design.sampleData?.recipientName === "string"
        ? design.sampleData.recipientName
        : "Aditi Rao";

    const eventEl = design.elements.find((e) => e.bindingKey === "event_title");
    const eventVal =
      typeof eventEl?.sampleValue === "string"
        ? eventEl.sampleValue
        : typeof design.sampleData?.eventTitle === "string"
        ? design.sampleData.eventTitle
        : "Annual Design & Tech Summit 2026";

    const certNumEl = design.elements.find((e) => e.bindingKey === "certificate_number");
    const certNumVal =
      typeof certNumEl?.sampleValue === "string"
        ? certNumEl.sampleValue
        : typeof design.sampleData?.certificateNumber === "string"
        ? design.sampleData.certificateNumber
        : "SKETCH-CERT-2026-8849";

    const dateEl = design.elements.find((e) => e.bindingKey === "issue_date");
    const dateVal =
      typeof dateEl?.sampleValue === "string"
        ? dateEl.sampleValue
        : typeof design.sampleData?.issueDate === "string"
        ? design.sampleData.issueDate
        : "November 21, 2026";

    const eventDateEl = design.elements.find((e) => e.bindingKey === "event_date");
    const eventDateVal =
      typeof eventDateEl?.sampleValue === "string"
        ? eventDateEl.sampleValue
        : typeof design.sampleData?.eventDate === "string"
        ? design.sampleData.eventDate
        : dateVal;

    return {
      recipientName: recipientVal,
      eventTitle: eventVal,
      certificateNumber: certNumVal,
      issueDate: dateVal,
      eventDate: eventDateVal,
    };
  }, [design.elements, design.sampleData]);

  // Selected element helper
  const selectedElement = useMemo(
    () => design.elements.find((el) => el.id === selectedElementId),
    [design.elements, selectedElementId]
  );

  // Push design changes to history
  const commitDesignToHistory = useCallback((nextDesign: CertificateDesignData) => {
    setDesign(nextDesign);
    setHistory((prev) => {
      const slice = prev.slice(0, historyIdx + 1);
      return [...slice, nextDesign];
    });
    setHistoryIdx((prev) => prev + 1);
  }, [historyIdx]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setDesign(history[prevIdx]);
    }
  }, [historyIdx, history]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setDesign(history[nextIdx]);
    }
  }, [historyIdx, history]);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedElementId(null);
        setInlineEditingId(null);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedElementId) return;

      const step = e.shiftKey ? 10 : 1;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedElementId ? { ...el, x: Math.max(0, el.x - step) } : el
          ),
        }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedElementId ? { ...el, x: Math.min(prev.canvas.width - 10, el.x + step) } : el
          ),
        }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedElementId ? { ...el, y: Math.max(0, el.y - step) } : el
          ),
        }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === selectedElementId ? { ...el, y: Math.min(prev.canvas.height - 10, el.y + step) } : el
          ),
        }));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, handleUndo, handleRedo]);

  // Focus properties text input when an element is selected
  useEffect(() => {
    if (selectedElement && selectedElement.type !== "qr" && selectedElement.type !== "mask") {
      // Gentle delayed focus if not already focused
      const timer = setTimeout(() => {
        if (document.activeElement?.tagName?.toLowerCase() !== "input") {
          textInputRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedElementId]);

  // Text Content getter
  const getElementCurrentText = (el: CertificateElement): string => {
    if (el.bindingKey === "recipient_name") {
      if (typeof el.sampleValue === "string") return el.sampleValue;
      if (typeof design.sampleData?.recipientName === "string") return design.sampleData.recipientName;
      return "Aditi Rao";
    }
    if (el.bindingKey === "event_title") {
      if (typeof el.sampleValue === "string") return el.sampleValue;
      if (typeof design.sampleData?.eventTitle === "string") return design.sampleData.eventTitle;
      return "Annual Design & Tech Summit 2026";
    }
    if (el.bindingKey === "certificate_number") {
      if (typeof el.sampleValue === "string") return el.sampleValue;
      if (typeof design.sampleData?.certificateNumber === "string") return design.sampleData.certificateNumber;
      return "SKETCH-CERT-2026-8849";
    }
    if (el.bindingKey === "issue_date") {
      if (typeof el.sampleValue === "string") return el.sampleValue;
      if (typeof design.sampleData?.issueDate === "string") return design.sampleData.issueDate;
      return "November 21, 2026";
    }
    if (el.bindingKey === "event_date") {
      if (typeof el.sampleValue === "string") return el.sampleValue;
      if (typeof design.sampleData?.eventDate === "string") return design.sampleData.eventDate;
      return "November 21, 2026";
    }
    return typeof el.text === "string" ? el.text : "";
  };

  // Immediate Text Content Updater
  const handleUpdateElementText = (elId: string, newText: string) => {
    const el = design.elements.find((item) => item.id === elId);
    if (!el) return;

    setDesign((prev) => {
      const nextSampleData = { ...(prev.sampleData || {}) };

      if (el.bindingKey === "recipient_name") {
        nextSampleData.recipientName = newText;
      } else if (el.bindingKey === "event_title") {
        nextSampleData.eventTitle = newText;
      } else if (el.bindingKey === "certificate_number") {
        nextSampleData.certificateNumber = newText;
      } else if (el.bindingKey === "issue_date") {
        nextSampleData.issueDate = newText;
      } else if (el.bindingKey === "event_date") {
        nextSampleData.eventDate = newText;
      }

      const nextElements = prev.elements.map((item) => {
        if (item.id === elId) {
          if (item.bindingKey !== "custom") {
            return { ...item, sampleValue: newText, text: newText };
          }
          return { ...item, text: newText };
        }
        return item;
      });

      return {
        ...prev,
        sampleData: nextSampleData,
        elements: nextElements,
      };
    });
  };

  // Binding Key Changer
  const handleBindingChange = (elId: string, newBinding: CertificateBindingKey) => {
    setDesign((prev) => {
      const nextElements = prev.elements.map((item) => {
        if (item.id === elId) {
          let sampleVal = item.sampleValue;
          if (newBinding === "recipient_name" && !sampleVal) sampleVal = "Aditi Rao";
          if (newBinding === "event_title" && !sampleVal) sampleVal = "Annual Design & Tech Summit 2026";
          if (newBinding === "certificate_number" && !sampleVal) sampleVal = "SKETCH-CERT-2026-8849";
          return {
            ...item,
            bindingKey: newBinding,
            sampleValue: sampleVal,
            type: newBinding === "qr_code" ? ("qr" as const) : ("text" as const),
          };
        }
        return item;
      });

      return { ...prev, elements: nextElements };
    });
  };

  // Template Upload Handler
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFeedback({ type: "error", text: "File exceeds 8MB limit. Please upload a smaller image." });
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setFeedback({ type: "error", text: "Supported template formats are PNG, JPEG, WebP, and SVG." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const newWidth = 842;
        const newHeight = Math.round(newWidth / aspect);

        const nextDesign: CertificateDesignData = {
          ...design,
          canvas: {
            width: newWidth,
            height: newHeight,
            unit: "px",
          },
          backgroundImage: {
            url: result,
            fit: "contain",
            position: "center",
            overlayOpacity: 0.1,
            fileName: file.name,
          },
        };

        commitDesignToHistory(nextDesign);
        setFeedback({
          type: "success",
          text: `Template "${file.name}" uploaded. Canvas set to ${newWidth}x${newHeight}px to maintain aspect ratio.`,
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveTemplate = () => {
    const nextDesign: CertificateDesignData = {
      ...design,
      backgroundImage: undefined,
    };
    commitDesignToHistory(nextDesign);
    setFeedback({ type: "success", text: "Template background removed." });
  };

  // Add Dynamic Field
  const handleAddField = (bindingKey: CertificateBindingKey, label: string) => {
    const newId = `cert-el-${Date.now()}`;
    const defaultText =
      bindingKey === "recipient_name"
        ? sampleValues.recipientName
        : bindingKey === "event_title"
        ? sampleValues.eventTitle
        : bindingKey === "certificate_number"
        ? sampleValues.certificateNumber
        : bindingKey === "issue_date"
        ? sampleValues.issueDate
        : bindingKey === "event_date"
        ? sampleValues.eventDate
        : label;

    const newEl: CertificateElement = {
      id: newId,
      type: bindingKey === "qr_code" ? "qr" : "text",
      bindingKey,
      text: defaultText,
      sampleValue: defaultText,
      x: Math.round(design.canvas.width / 2 - 180),
      y: Math.round(design.canvas.height / 2 - 20),
      width: bindingKey === "qr_code" ? 80 : 360,
      height: bindingKey === "qr_code" ? 80 : 44,
      zIndex: 4,
      fontSize: bindingKey === "recipient_name" ? 34 : bindingKey === "event_title" ? 22 : 14,
      fontWeight: bindingKey === "recipient_name" ? "bold" : "medium",
      fontFamily: "serif",
      color: "#FFFFFF",
      alignment: "center",
      isVisible: true,
    };

    commitDesignToHistory({
      ...design,
      elements: [...design.elements, newEl],
    });
    setSelectedElementId(newId);
  };

  // Add Mask / Covering Tool Box
  const handleAddMask = () => {
    const newId = `cert-mask-${Date.now()}`;
    const newEl: CertificateElement = {
      id: newId,
      type: "mask",
      bindingKey: "custom",
      x: Math.round(design.canvas.width / 2 - 160),
      y: Math.round(design.canvas.height / 2 - 25),
      width: 320,
      height: 50,
      zIndex: 2,
      backgroundColor: "#FFFFFF",
      opacity: 1,
      borderRadius: 4,
      isVisible: true,
    };

    commitDesignToHistory({
      ...design,
      elements: [...design.elements, newEl],
    });
    setSelectedElementId(newId);
    setFeedback({
      type: "success",
      text: "Mask region box added. Reposition, resize, or pick background color to cover underlying JPG text.",
    });
  };

  // Add Masked Text
  const handleAddMaskedText = () => {
    const newId = `cert-masked-text-${Date.now()}`;
    const newEl: CertificateElement = {
      id: newId,
      type: "text",
      bindingKey: "custom",
      text: "Replacement Text",
      x: Math.round(design.canvas.width / 2 - 160),
      y: Math.round(design.canvas.height / 2 - 20),
      width: 320,
      height: 44,
      zIndex: 4,
      fontSize: 16,
      fontWeight: "semibold",
      fontFamily: "sans",
      color: "#17191C",
      backgroundColor: "#FFFFFF",
      borderRadius: 4,
      alignment: "center",
      isVisible: true,
    };

    commitDesignToHistory({
      ...design,
      elements: [...design.elements, newEl],
    });
    setSelectedElementId(newId);
    setFeedback({
      type: "success",
      text: "Masked replacement text added with solid background fill.",
    });
  };

  // Delete Element
  const handleDeleteElement = (id: string) => {
    commitDesignToHistory({
      ...design,
      elements: design.elements.filter((el) => el.id !== id),
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    if (inlineEditingId === id) {
      setInlineEditingId(null);
    }
  };

  // Duplicate Element
  const handleDuplicateElement = (el: CertificateElement) => {
    const newId = `cert-el-${Date.now()}`;
    const clone: CertificateElement = {
      ...el,
      id: newId,
      x: Math.min(design.canvas.width - el.width, el.x + 20),
      y: Math.min(design.canvas.height - el.height, el.y + 20),
    };
    commitDesignToHistory({
      ...design,
      elements: [...design.elements, clone],
    });
    setSelectedElementId(newId);
  };

  // Reorder Element Layers
  const handleMoveLayer = (id: string, direction: "up" | "down") => {
    const idx = design.elements.findIndex((el) => el.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= design.elements.length) return;
    const newElements = [...design.elements];
    const temp = newElements[idx];
    newElements[idx] = newElements[targetIdx];
    newElements[targetIdx] = temp;
    commitDesignToHistory({ ...design, elements: newElements });
  };

  // Color Eyedropper Tool
  const handlePickColor = async (onColorPicked: (hex: string) => void) => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onColorPicked(result.sRGBHex);
        }
      } catch {
        // User dismissed eyedropper
      }
    } else {
      setFeedback({
        type: "error",
        text: "EyeDropper tool is not supported in this browser. Please use the color picker or palette presets.",
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Canvas Mouse Down: Selection & Smooth Dragging
  const handleElementMouseDown = (e: React.MouseEvent, elId: string) => {
    e.stopPropagation();
    if (inlineEditingId) return;

    setSelectedElementId(elId);
    isDraggingRef.current = false;
    hasMovedRef.current = false;

    const el = design.elements.find((item) => item.id === elId);
    if (!el) return;

    dragStartPosRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: el.x,
      elY: el.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPosRef.current) return;
      const dx = (moveEvent.clientX - dragStartPosRef.current.mouseX) / zoomLevel;
      const dy = (moveEvent.clientY - dragStartPosRef.current.mouseY) / zoomLevel;

      if (!hasMovedRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMovedRef.current = true;
        isDraggingRef.current = true;
      }

      if (hasMovedRef.current) {
        const rawX = dragStartPosRef.current.elX + dx;
        const rawY = dragStartPosRef.current.elY + dy;
        const snappedX = Math.round(rawX / 2) * 2;
        const snappedY = Math.round(rawY / 2) * 2;

        const clampedX = Math.max(0, Math.min(design.canvas.width - el.width, snappedX));
        const clampedY = Math.max(0, Math.min(design.canvas.height - el.height, snappedY));

        setDesign((prev) => ({
          ...prev,
          elements: prev.elements.map((item) =>
            item.id === elId ? { ...item, x: clampedX, y: clampedY } : item
          ),
        }));
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (hasMovedRef.current) {
        setDesign((current) => {
          setHistory((prev) => [...prev.slice(0, historyIdx + 1), current]);
          setHistoryIdx((prev) => prev + 1);
          return current;
        });
      }

      isDraggingRef.current = false;
      hasMovedRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Canvas Background Click: Hit-test overlapping elements or clear selection
  const handleCanvasContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current || isResizingRef.current || inlineEditingId) return;

    const containerRect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - containerRect.left) / zoomLevel;
    const clickY = (e.clientY - containerRect.top) / zoomLevel;

    // Find all elements containing this coordinate
    const hits = design.elements.filter((el) => {
      if (el.isVisible === false) return false;
      return (
        clickX >= el.x &&
        clickX <= el.x + el.width &&
        clickY >= el.y &&
        clickY <= el.y + el.height
      );
    });

    if (hits.length === 0) {
      setSelectedElementId(null);
    } else if (hits.length === 1) {
      setSelectedElementId(hits[0].id);
    } else {
      // Overlapping elements: cycle through them
      const currentIndex = hits.findIndex((h) => h.id === selectedElementId);
      if (currentIndex === -1 || currentIndex === hits.length - 1) {
        setSelectedElementId(hits[0].id);
      } else {
        setSelectedElementId(hits[currentIndex + 1].id);
      }
    }
  };

  // Interactive Resizing on Canvas
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string, el: CertificateElement) => {
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      handle,
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: el.x,
      y: el.y,
      w: el.width,
      h: el.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current || !resizeStartRef.current) return;
      const dx = (moveEvent.clientX - resizeStartRef.current.mouseX) / zoomLevel;
      const dy = (moveEvent.clientY - resizeStartRef.current.mouseY) / zoomLevel;

      let newX = resizeStartRef.current.x;
      let newY = resizeStartRef.current.y;
      let newW = resizeStartRef.current.w;
      let newH = resizeStartRef.current.h;

      if (handle.includes("e")) {
        newW = Math.max(30, resizeStartRef.current.w + dx);
      }
      if (handle.includes("s")) {
        newH = Math.max(16, resizeStartRef.current.h + dy);
      }
      if (handle.includes("w")) {
        const potentialW = resizeStartRef.current.w - dx;
        if (potentialW >= 30) {
          newW = potentialW;
          newX = resizeStartRef.current.x + dx;
        }
      }
      if (handle.includes("n")) {
        const potentialH = resizeStartRef.current.h - dy;
        if (potentialH >= 16) {
          newH = potentialH;
          newY = resizeStartRef.current.y + dy;
        }
      }

      newW = Math.round(newW);
      newH = Math.round(newH);
      newX = Math.round(newX);
      newY = Math.round(newY);

      setDesign((prev) => ({
        ...prev,
        elements: prev.elements.map((item) =>
          item.id === el.id
            ? { ...item, x: newX, y: newY, width: newW, height: newH }
            : item
        ),
      }));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      setDesign((current) => {
        setHistory((prev) => [...prev.slice(0, historyIdx + 1), current]);
        setHistoryIdx((prev) => prev + 1);
        return current;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Save template configuration to localStorage and onSave
  const handleSave = () => {
    saveActiveCertificateDesign(design);
    onSave?.(design);
    setFeedback({
      type: "success",
      text: "Certificate design template saved. All generated certificates and downloads will follow this active design.",
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Download Sample Certificate SVG (matching exact studio preview edits)
  const handleDownloadSample = async () => {
    setIsExporting(true);
    try {
      const svg = await generateCertificateSvg({
        design,
        certificate: {
          recipientName: sampleValues.recipientName,
          eventTitle: sampleValues.eventTitle,
          certificateNumber: sampleValues.certificateNumber,
          issuedAt: new Date().toISOString(),
          eventDate: sampleValues.eventDate,
        },
      });

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filenameBase =
        sampleValues.recipientName && sampleValues.recipientName.trim()
          ? sampleValues.recipientName.toLowerCase().replace(/\s+/g, "-")
          : "template";
      a.download = `certificate-${filenameBase}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setFeedback({ type: "success", text: "Sample certificate SVG downloaded with current edited text." });
    } catch {
      setFeedback({ type: "error", text: "Failed to generate certificate SVG." });
    } finally {
      setIsExporting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className={`certificate-studio-root space-y-6 ${className}`}>
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#181B1E] border border-[#E5E7EA] dark:border-[#30353A] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase">
              CERTIFICATE STUDIO
            </span>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              Active Template
            </Badge>
          </div>
          <h2 className="text-xl font-extrabold text-[#17191C] dark:text-[#F1F2F3] mt-0.5">
            Certificate Template &amp; Content Studio
          </h2>
          <p className="text-xs text-[#656B73] dark:text-[#8A9098]">
            Click any element on canvas to select and edit its text, typography, and positions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            disabled={isExporting}
            className="rounded-xl text-xs font-semibold h-9 gap-1.5"
            title="Download test SVG certificate matching exact preview"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export SVG Test</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="rounded-xl text-xs font-bold h-9 px-4 bg-[#17191C] dark:bg-white text-white dark:text-[#17191C] hover:bg-[#25292F] shadow-sm gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Template</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="underline text-[11px] ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Toolbar & Properties Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Certificate Theme & Atmosphere Palette */}
          <Card className="rounded-2xl border border-[#E5E7EA] dark:border-[#30353A] shadow-xs">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#17191C] dark:text-white">
                  <Palette className="h-4 w-4 text-amber-500" />
                  Certificate Theme &amp; Colors
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-500 font-mono">
                  Theme Tokens
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <ColorPickerField
                  label="Background Color"
                  value={design.theme?.background || "#0D1117"}
                  onChange={(hex) =>
                    setDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, background: hex },
                    }))
                  }
                />
                <ColorPickerField
                  label="Text Color"
                  value={design.theme?.textColor || "#FFFFFF"}
                  onChange={(hex) =>
                    setDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, textColor: hex },
                    }))
                  }
                  align="right"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <ColorPickerField
                  label="Accent Color"
                  value={design.theme?.accentColor || "#E2B857"}
                  onChange={(hex) =>
                    setDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, accentColor: hex },
                    }))
                  }
                />
                <ColorPickerField
                  label="Border Color"
                  value={design.theme?.borderColor || "#30363D"}
                  onChange={(hex) =>
                    setDesign((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, borderColor: hex },
                    }))
                  }
                  align="right"
                />
              </div>
            </CardContent>
          </Card>

          {/* Selected Element Properties Inspector */}
          <Card className="rounded-2xl border-2 border-amber-500/40 dark:border-amber-500/30 shadow-xs">
            <CardHeader className="pb-3 pt-4 px-5 border-b border-[#E5E7EA] dark:border-[#30353A]">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#17191C] dark:text-white">
                  <Sliders className="h-4 w-4 text-amber-500" />
                  Element Properties
                </span>
                {selectedElement && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateElement(selectedElement)}
                      title="Duplicate element"
                      className="h-7 w-7 p-0 text-[#8A9098] hover:text-[#17191C] dark:hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      title="Delete element"
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedElementId(null)}
                      title="Clear selection"
                      className="h-7 w-7 p-0 text-[#8A9098] hover:text-[#17191C]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 text-xs">
              {selectedElement ? (
                <div className="max-h-[720px] overflow-y-auto pr-1 space-y-4">
                  {/* 1. TEXT CONTENT / PREVIEW VALUE (PROMINENT AT TOP) */}
                  {selectedElement.type !== "qr" && selectedElement.type !== "mask" && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="element-text-input"
                          className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                        >
                          <Type className="h-4 w-4" />
                          <span>
                            1. {selectedElement.bindingKey !== "custom" ? "Preview Text Content" : "Text Content"}
                          </span>
                        </label>
                        <Badge className="bg-amber-500 text-black font-extrabold text-[10px] px-2 py-0.5">
                          {selectedElement.bindingKey !== "custom" ? "Dynamic Field" : "Static Text"}
                        </Badge>
                      </div>

                      <input
                        ref={textInputRef}
                        id="element-text-input"
                        type="text"
                        value={getElementCurrentText(selectedElement)}
                        onChange={(e) => handleUpdateElementText(selectedElement.id, e.target.value)}
                        placeholder="Type text content here..."
                        className="w-full h-11 px-3.5 rounded-lg border-2 border-amber-500 bg-white dark:bg-[#0D1117] text-[#17191C] dark:text-white font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />

                      <p className="text-[11px] text-[#656B73] dark:text-[#8A9098] leading-tight">
                        {selectedElement.bindingKey !== "custom"
                          ? "Editing this immediately updates the canvas preview and test SVG exports. In production issuance, each participant's actual record replaces this value."
                          : "This static custom text is permanently saved in your certificate template."}
                      </p>
                    </div>
                  )}

                  {/* 2. DYNAMIC FIELD BINDING */}
                  <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#E5E7EA] dark:border-[#30353A] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-[#8A9098]">
                        2. Dynamic Field Binding
                      </label>
                      <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-amber-600 dark:text-amber-400 font-bold">
                        {selectedElement.bindingKey !== "custom" ? `{{${selectedElement.bindingKey}}}` : "static"}
                      </code>
                    </div>

                    <select
                      value={selectedElement.bindingKey}
                      onChange={(e) => handleBindingChange(selectedElement.id, e.target.value as CertificateBindingKey)}
                      className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent text-xs font-semibold"
                    >
                      <option value="recipient_name">Participant Name (recipient_name)</option>
                      <option value="event_title">Event Name (event_title)</option>
                      <option value="certificate_number">Certificate ID (certificate_number)</option>
                      <option value="issue_date">Issue Date (issue_date)</option>
                      <option value="event_date">Event Date (event_date)</option>
                      <option value="custom">Static Custom Text (no variable binding)</option>
                    </select>
                  </div>

                  {/* 3. X POSITION AND Y POSITION */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                      3. Position Coordinates (px)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-[#8A9098] block mb-0.5">X Position</span>
                        <input
                          type="number"
                          value={selectedElement.x}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, x: val } : el
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A9098] block mb-0.5">Y Position</span>
                        <input
                          type="number"
                          value={selectedElement.y}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, y: val } : el
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. WIDTH AND HEIGHT */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                      4. Dimensions (px)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-[#8A9098] block mb-0.5">Width</span>
                        <input
                          type="number"
                          value={selectedElement.width}
                          onChange={(e) => {
                            const val = Math.max(20, Number(e.target.value));
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, width: val } : el
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#8A9098] block mb-0.5">Height</span>
                        <input
                          type="number"
                          value={selectedElement.height}
                          onChange={(e) => {
                            const val = Math.max(16, Number(e.target.value));
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, height: val } : el
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TYPOGRAPHY CONTROLS (5 to 10) */}
                  {selectedElement.type !== "qr" && selectedElement.type !== "mask" && (
                    <>
                      {/* 5. FONT FAMILY */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                          5. Font Family
                        </label>
                        <select
                          value={selectedElement.fontFamily || "serif"}
                          onChange={(e) => {
                            const val = e.target.value as CertificateFontFamily;
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, fontFamily: val } : el
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent text-xs"
                        >
                          <option value="serif">Classic Serif (Times / Georgia)</option>
                          <option value="sans">Modern Sans (Inter / Helvetica)</option>
                          <option value="cinematic">Cinematic Display (Bold Impact)</option>
                          <option value="script">Formal Script</option>
                          <option value="mono">Technical Monospace</option>
                        </select>
                      </div>

                      {/* 6. FONT SIZE AND WEIGHT */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                          6. Font Size &amp; Weight
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-[#8A9098]">Size</span>
                              <span className="text-[10px] font-mono font-bold">{selectedElement.fontSize || 14}px</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="72"
                              value={selectedElement.fontSize || 14}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id ? { ...el, fontSize: val } : el
                                  ),
                                }));
                              }}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8A9098] block mb-0.5">Weight</span>
                            <select
                              value={selectedElement.fontWeight || "normal"}
                              onChange={(e) => {
                                const val = e.target.value as CertificateFontWeight;
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id ? { ...el, fontWeight: val } : el
                                  ),
                                }));
                              }}
                              className="w-full h-8 px-2 rounded-lg border border-[#E5E7EA] dark:border-[#30353A] bg-transparent text-xs"
                            >
                              <option value="normal">Normal (400)</option>
                              <option value="medium">Medium (500)</option>
                              <option value="semibold">Semibold (600)</option>
                              <option value="bold">Bold (700)</option>
                              <option value="extrabold">Extra Bold (800)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 7. TEXT COLOR */}
                      <ColorPickerField
                        label="7. Text Color"
                        value={selectedElement.color || "#FFFFFF"}
                        onChange={(hex) => {
                          setDesign((prev) => ({
                            ...prev,
                            elements: prev.elements.map((el) =>
                              el.id === selectedElement.id ? { ...el, color: hex } : el
                            ),
                          }));
                        }}
                      />

                      {/* 8. ALIGNMENT */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                          8. Text Alignment
                        </label>
                        <div className="flex rounded-lg border border-[#E5E7EA] dark:border-[#30353A] p-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "left" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "left" ? "bg-amber-500 text-black font-bold" : ""
                            }`}
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "center" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "center" ? "bg-amber-500 text-black font-bold" : ""
                            }`}
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDesign((prev) => ({
                                ...prev,
                                elements: prev.elements.map((el) =>
                                  el.id === selectedElement.id ? { ...el, alignment: "right" } : el
                                ),
                              }));
                            }}
                            className={`flex-1 py-1 rounded flex items-center justify-center ${
                              selectedElement.alignment === "right" ? "bg-amber-500 text-black font-bold" : ""
                            }`}
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 9. LETTER SPACING AND LINE HEIGHT */}
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                          9. Letter Spacing &amp; Line Height
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-[#8A9098]">Spacing</span>
                              <span className="text-[10px] font-mono font-bold">{selectedElement.letterSpacing || 0}px</span>
                            </div>
                            <input
                              type="range"
                              min="-2"
                              max="16"
                              value={selectedElement.letterSpacing || 0}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id ? { ...el, letterSpacing: val } : el
                                  ),
                                }));
                              }}
                              className="w-full accent-amber-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-[#8A9098]">Line Height</span>
                              <span className="text-[10px] font-mono font-bold">{selectedElement.lineHeight || 1.2}</span>
                            </div>
                            <input
                              type="range"
                              min="0.8"
                              max="2.5"
                              step="0.1"
                              value={selectedElement.lineHeight || 1.2}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id ? { ...el, lineHeight: val } : el
                                  ),
                                }));
                              }}
                              className="w-full accent-amber-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 10. ROTATION */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold uppercase text-[#8A9098]">
                            10. Rotation ({selectedElement.rotation || 0}°)
                          </label>
                          {Boolean(selectedElement.rotation) && (
                            <button
                              type="button"
                              onClick={() => {
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id ? { ...el, rotation: 0 } : el
                                  ),
                                }));
                              }}
                              className="text-[10px] text-amber-500 hover:underline"
                            >
                              Reset to 0°
                            </button>
                          )}
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={selectedElement.rotation || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, rotation: val } : el
                              ),
                            }));
                          }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </>
                  )}

                  {/* 11. BACKGROUND FILL / MASK (COVER EMBEDDED TEXT) */}
                  <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#E5E7EA] dark:border-[#30353A] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-[#8A9098]">
                        11. Background Fill / Mask
                      </label>
                      {selectedElement.backgroundColor ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, backgroundColor: undefined } : el
                              ),
                            }));
                          }}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          Remove Mask
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDesign((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === selectedElement.id ? { ...el, backgroundColor: "#FFFFFF" } : el
                              ),
                            }));
                          }}
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                        >
                          + Enable Solid Mask
                        </button>
                      )}
                    </div>

                    {selectedElement.backgroundColor && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <ColorPickerField
                              label="Mask Fill Color"
                              value={selectedElement.backgroundColor}
                              onChange={(hex) => {
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id
                                      ? {
                                          ...el,
                                          backgroundColor: hex,
                                          color: el.type === "mask" ? hex : el.color,
                                        }
                                      : el
                                  ),
                                }));
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handlePickColor((hex) => {
                                setDesign((prev) => ({
                                  ...prev,
                                  elements: prev.elements.map((el) =>
                                    el.id === selectedElement.id
                                      ? {
                                          ...el,
                                          backgroundColor: hex,
                                          color: el.type === "mask" ? hex : el.color,
                                        }
                                      : el
                                  ),
                                }));
                              })
                            }
                            title="Pick exact color from uploaded JPG template"
                            className="h-8 mt-5 px-2 text-[11px] shrink-0 gap-1 border-[#E5E7EA] dark:border-[#30353A]"
                          >
                            <Pipette className="h-3 w-3" />
                            <span>Sample</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 12. LAYER CONTROLS */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#8A9098] block mb-1">
                      12. Layer Controls
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveLayer(selectedElement.id, "up")}
                        className="h-8 text-xs font-medium justify-center gap-1"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                        Bring Forward
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveLayer(selectedElement.id, "down")}
                        className="h-8 text-xs font-medium justify-center gap-1"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Send Backward
                      </Button>
                    </div>
                  </div>

                  {/* 13. DELETE ELEMENT */}
                  <div className="pt-2 border-t border-[#E5E7EA] dark:border-[#30353A]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="w-full h-8 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900 gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>13. Delete Element from Design</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-[#8A9098] space-y-1">
                  <Move className="h-6 w-6 mx-auto text-amber-500/50 mb-2" />
                  <div className="font-semibold text-xs text-[#17191C] dark:text-[#F1F2F3]">
                    No Element Selected
                  </div>
                  <p className="text-[11px] leading-relaxed max-w-[240px] mx-auto">
                    Click any text element or mask box on the canvas to inspect, edit content, and position it.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Elements & Masking Tools Palette */}
          <Card className="rounded-2xl border-[#E5E7EA] dark:border-[#30353A] shadow-xs">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                Add Fields &amp; Masking Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] block mb-1.5">
                  Dynamic Participant Fields
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("recipient_name", "Participant Name")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Participant Name
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("event_title", "Event Title")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Event Name
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("certificate_number", "Certificate ID")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Certificate ID
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("issue_date", "Issue Date")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Issue Date
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("event_date", "Event Date")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Event Date
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("qr_code", "Verification QR")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Verify QR Code
                  </Button>
                </div>
              </div>

              <div className="pt-1 border-t border-[#E5E7EA] dark:border-[#30353A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] block mb-1.5 mt-2">
                  Static Text &amp; Artwork Masking
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddField("custom", "Custom Label")}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg"
                  >
                    + Custom Text
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMask}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg border-amber-500/40 text-amber-600 dark:text-amber-400"
                    title="Add solid box to cover existing text in uploaded JPG"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    + Mask Box
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMaskedText}
                    className="h-8 text-[11px] font-semibold justify-start rounded-lg col-span-2 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    title="Add text with background fill to cover underlying JPG text"
                  >
                    <Type className="h-3 w-3 mr-1" />
                    + Mask &amp; Replace Text
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Artwork Upload Card */}
          <Card className="rounded-2xl border-[#E5E7EA] dark:border-[#30353A] shadow-xs">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-amber-500" />
                  Certificate Design Artwork
                </span>
                {design.backgroundImage && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                    Artwork Loaded
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3 text-xs">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleTemplateUpload}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-xl text-xs font-semibold h-9 gap-1.5 border-[#E5E7EA] dark:border-[#30353A]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{design.backgroundImage ? "Replace Template Artwork" : "Upload Template (JPG, PNG, SVG)"}</span>
                </Button>

                {design.backgroundImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveTemplate}
                    title="Remove template artwork"
                    className="h-9 px-2.5 text-rose-500 hover:text-rose-600 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Canvas Layers & Elements List */}
          <Card className="rounded-2xl border-[#E5E7EA] dark:border-[#30353A] shadow-xs">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" />
                  Canvas Layers ({design.elements.length})
                </span>
                <span className="text-[10px] text-[#8A9098]">Click to select</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 text-xs">
              <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                {design.elements.map((el) => {
                  const isSelected = el.id === selectedElementId;
                  const label =
                    el.type === "mask"
                      ? "Mask Box"
                      : el.type === "qr"
                      ? "Verification QR"
                      : el.bindingKey !== "custom"
                      ? `${el.bindingKey.replace(/_/g, " ")}`
                      : el.text || "Custom Text";

                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold"
                          : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[#17191C] dark:text-[#F1F2F3]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {el.type === "mask" ? (
                          <Square className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : el.type === "qr" ? (
                          <QrCode className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Type className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate text-[11px] capitalize">{label}</span>
                      </div>

                      {el.bindingKey !== "custom" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-600 shrink-0">
                          dynamic
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Canvas Area (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Canvas Controls Toolbar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#181B1E] border border-[#E5E7EA] dark:border-[#30353A] shadow-xs flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                title="Undo (Ctrl+Z)"
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIdx >= history.length - 1}
                title="Redo (Ctrl+Y)"
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                className="h-8 w-8 p-0"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-medium px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))}
                className="h-8 w-8 p-0"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(0.9)}
                className="h-8 text-xs px-2"
              >
                Fit Canvas
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSyntheticData(!showSyntheticData)}
                className="text-xs text-[#8A9098] hover:text-[#17191C] dark:hover:text-white font-medium"
              >
                {showSyntheticData ? "Show Variable Keys ({{key}})" : "Show Sample Data"}
              </button>
            </div>
          </div>

          {/* Canvas Workspace Viewport */}
          <div className="p-6 sm:p-10 rounded-3xl bg-[#090B0D] border border-[#23272C] flex items-center justify-center overflow-auto min-h-[540px] select-none">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: "transform 0.1s ease",
              }}
            >
              {/* Wrapped Canvas Container */}
              <div
                onClick={handleCanvasContainerClick}
                style={{
                  width: `${design.canvas.width}px`,
                  height: `${design.canvas.height}px`,
                  position: "relative",
                }}
              >
                <UnifiedCertificateCard
                  design={design}
                  certificate={{
                    recipientName: sampleValues.recipientName,
                    eventTitle: sampleValues.eventTitle,
                    certificateNumber: sampleValues.certificateNumber,
                    issuedAt: sampleValues.issueDate || "2026-11-21T10:00:00Z",
                    eventDate: sampleValues.eventDate,
                  }}
                  showVariableKeys={!showSyntheticData}
                  selectedElementId={selectedElementId}
                  onSelectElement={(id) => setSelectedElementId(id)}
                  interactive={true}
                />

                {/* Interactive Drag & Selection Overlays */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                  {design.elements.map((el) => {
                    if (el.isVisible === false) return null;
                    const isSelected = el.id === selectedElementId;
                    const isInlineEditing = el.id === inlineEditingId;

                    return (
                      <div
                        key={`handle-${el.id}`}
                        onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (el.type !== "qr" && el.type !== "mask") {
                            setInlineEditingId(el.id);
                          }
                        }}
                        style={{
                          position: "absolute",
                          left: `${el.x}px`,
                          top: `${el.y}px`,
                          width: `${el.width}px`,
                          height: `${el.height}px`,
                          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                          transformOrigin: "center center",
                          pointerEvents: "auto",
                        }}
                        className={`group cursor-move transition-shadow ${
                          isSelected
                            ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-neutral-900 rounded"
                            : "hover:ring-1 hover:ring-amber-500/60 rounded"
                        }`}
                        title="Click to select and edit in Properties panel. Double-click to edit directly on canvas."
                      >
                        {/* Inline Canvas Text Editor */}
                        {isInlineEditing && (
                          <input
                            autoFocus
                            type="text"
                            value={getElementCurrentText(el)}
                            onChange={(e) => handleUpdateElementText(el.id, e.target.value)}
                            onBlur={() => setInlineEditingId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Escape") {
                                setInlineEditingId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                              fontSize: `${el.fontSize || 14}px`,
                              fontWeight: el.fontWeight || "normal",
                              fontFamily:
                                el.fontFamily === "serif"
                                  ? "Georgia, 'Times New Roman', serif"
                                  : el.fontFamily === "mono"
                                  ? "monospace"
                                  : el.fontFamily === "cinematic"
                                  ? "Impact, sans-serif"
                                  : "sans-serif",
                              color: el.color || "#FFFFFF",
                              textAlign: el.alignment || "center",
                              backgroundColor: el.backgroundColor || "rgba(13, 17, 23, 0.95)",
                            }}
                            className="absolute inset-0 w-full h-full border-2 border-amber-500 rounded px-2 outline-none shadow-2xl z-50 text-white"
                          />
                        )}

                        {/* Selected Element Label & Resize Handles */}
                        {isSelected && !isInlineEditing && (
                          <>
                            {/* Top Element Pill */}
                            <div className="absolute -top-6 left-0 flex items-center gap-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                              <span>
                                {el.type === "mask"
                                  ? "MASK"
                                  : el.bindingKey !== "custom"
                                  ? el.bindingKey.toUpperCase()
                                  : "TEXT"}
                              </span>
                              <span className="opacity-70 font-mono">
                                ({el.x}, {el.y})
                              </span>
                            </div>

                            {/* 8 Resize Handles */}
                            {/* Top-Left */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "nw", el)}
                              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-nwse-resize z-40"
                            />
                            {/* Top-Right */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "ne", el)}
                              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-nesw-resize z-40"
                            />
                            {/* Bottom-Left */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "sw", el)}
                              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-nesw-resize z-40"
                            />
                            {/* Bottom-Right */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "se", el)}
                              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-nwse-resize z-40"
                            />
                            {/* Top-Center */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "n", el)}
                              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-ns-resize z-40"
                            />
                            {/* Bottom-Center */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "s", el)}
                              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-ns-resize z-40"
                            />
                            {/* Left-Center */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "w", el)}
                              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-ew-resize z-40"
                            />
                            {/* Right-Center */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "e", el)}
                              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-amber-500 border border-black rounded-xs cursor-ew-resize z-40"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery & Immutability Guarantee Note */}
          <div className="p-4 rounded-2xl bg-[#F9FAFB] dark:bg-[#151719] border border-[#E5E7EA] dark:border-[#30353A] flex items-start gap-3 text-xs text-[#656B73] dark:text-[#8A9098]">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong className="text-[#17191C] dark:text-[#F1F2F3] block mb-0.5">
                Unified Certificate Delivery Pipeline &amp; Dynamic Bindings
              </strong>
              This configured layout defines element styling and positions. Dynamic field bindings (e.g. Participant Name, Event Name, Certificate ID) automatically populate with real attendee data during production issuance, while your custom labels and masks remain fixed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
