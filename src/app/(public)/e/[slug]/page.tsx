"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Mail,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

interface PublicEventPageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicEventPage({ params }: PublicEventPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const event =
    MOCK_EVENTS.find((e) => e.slug === slug) || MOCK_EVENTS[0];

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    department: "",
    year: "3rd Year",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [regId, setRegId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    // Simulate instant registration persistence & ticket generation
    const generatedId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setRegId(generatedId);
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-8">
      {/* Event Hero Card */}
      <div className="overflow-hidden rounded-[26px] border border-[#EAE8E3] bg-white shadow-sm">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-[#EFEEEA]">
          <img
            src={event.posterUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-white/95 text-[#191A1C] font-bold text-xs backdrop-blur-sm">
              {event.category}
            </Badge>
          </div>
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
              {event.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 max-w-2xl drop-shadow-sm">
              {event.shortDescription}
            </p>
          </div>
        </div>

        {/* Event Quick Details Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#F5F4F1] border-b border-[#F5F4F1] bg-[#FAF9F7] text-xs text-[#65666A]">
          <div className="p-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[#8F2635]" />
            <div>
              <div className="text-[10px] text-[#929398] font-bold uppercase">Date & Time</div>
              <div className="font-semibold text-[#191A1C]">{formatDate(event.startDate)}</div>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-[#8F2635]" />
            <div>
              <div className="text-[10px] text-[#929398] font-bold uppercase">Location</div>
              <div className="font-semibold text-[#191A1C] line-clamp-1">{event.venue}</div>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Users className="h-4 w-4 text-[#8F2635]" />
            <div>
              <div className="text-[10px] text-[#929398] font-bold uppercase">Availability</div>
              <div className="font-semibold text-emerald-700">
                {event.capacity - event.registeredCount} Seats Remaining
              </div>
            </div>
          </div>
        </div>

        {/* Event Description */}
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-base font-bold text-[#191A1C]">About this Event</h2>
          <p className="text-xs sm:text-sm text-[#65666A] leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      {/* Registration Section */}
      <div className="rounded-[26px] border border-[#EAE8E3] bg-white p-6 sm:p-8 shadow-sm">
        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#191A1C]">
                Registration Confirmed!
              </h3>
              <p className="text-xs text-[#65666A]">
                Your reference code: <strong className="font-mono text-[#191A1C]">{regId}</strong>
              </p>
            </div>

            <div className="max-w-md mx-auto rounded-2xl bg-[#FAF9F7] p-4 text-xs text-[#65666A] border border-[#EAE8E3] space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold">
                <Mail className="h-4 w-4 text-emerald-600" />
                <span>Ticket with QR Pass dispatched to {formData.email}</span>
              </div>
              <p className="text-[11px] text-[#929398]">
                Simply present the QR code in your email upon arrival. No password or student login is needed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#191A1C]">
                Participant Registration
              </h2>
              <p className="mt-1 text-xs text-[#65666A]">
                Fill out the required information to claim your entry pass. No account creation required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Full Name *</label>
                  <Input
                    required
                    placeholder="e.g., Alex Morgan"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="e.g., alex.morgan@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5"
                  />
                  <span className="text-[10px] text-[#929398] mt-1 block">Your QR pass will be delivered here.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Department / Major *</label>
                  <Input
                    required
                    placeholder="e.g., Visual Design / Computer Science"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#191A1C]">Academic Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="mt-1.5 flex h-10 w-full rounded-xl border border-[#E8E6E1] bg-white px-3.5 py-2 text-sm text-[#191A1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2635]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate / Alumni">Postgraduate / Alumni</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="forest"
                  size="lg"
                  className="w-full rounded-2xl font-bold shadow-md shadow-[#1B4332]/10"
                >
                  <span>Complete Registration & Claim Pass</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-[#929398]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span>Zero spam policy. Your details are used solely for event coordination and attendance.</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
