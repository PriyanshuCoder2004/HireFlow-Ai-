import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Calendar as CalendarIcon,
  Trash2, 
  Loader2,
  Clock,
  MapPin,
  Video,
  Phone,
  Users,
  Bell,
  BellOff,
  Link2,
  Briefcase,
  Mail,
  CheckCircle2
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Get user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Convert local datetime string to UTC ISO string for backend storage
 * Input: "2026-02-04T15:20" (local time from datetime-local input)
 * Output: "2026-02-04T23:20:00.000Z" (UTC ISO string)
 */
const localToUTC = (localDateStr) => {
  if (!localDateStr) return "";
  // Parse the local datetime string and convert to UTC
  const localDate = new Date(localDateStr);
  return localDate.toISOString();
};

/**
 * Convert UTC ISO string to local datetime string for form input
 * Input: "2026-02-04T23:20:00.000Z" (UTC from backend)
 * Output: "2026-02-04T15:20" (local time for datetime-local input)
 */
const utcToLocal = (utcDateStr) => {
  if (!utcDateStr) return "";
  const date = new Date(utcDateStr);
  // Format as datetime-local input expects: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Format UTC date for display in user's local timezone
 */
const formatLocalTime = (utcDateStr, formatStr) => {
  if (!utcDateStr) return "";
  const date = new Date(utcDateStr);
  return format(date, formatStr);
};

const eventTypes = [
  { value: "interview", label: "Interview", icon: Users, color: "bg-blue-500" },
  { value: "phone_screen", label: "Phone Screen", icon: Phone, color: "bg-green-500" },
  { value: "video_call", label: "Video Call", icon: Video, color: "bg-purple-500" },
  { value: "follow_up", label: "Follow Up", icon: Clock, color: "bg-yellow-500" },
  { value: "other", label: "Other", icon: CalendarIcon, color: "bg-gray-500" },
];

const interviewTypes = [
  { value: "hr", label: "HR Screening" },
  { value: "technical", label: "Technical" },
  { value: "managerial", label: "Managerial" },
  { value: "final", label: "Final Round" },
  { value: "panel", label: "Panel Interview" },
  { value: "other", label: "Other" },
];

const getEventTypeInfo = (type) => eventTypes.find(t => t.value === type) || eventTypes[4];
const isInterviewType = (type) => ["interview", "phone_screen", "video_call"].includes(type);

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "interview",
    interview_type: "",
    start_date: "",
    end_date: "",
    location: "",
    meeting_link: "",
    job_application_id: "",
    notes: "",
    reminders_enabled: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, appsRes] = await Promise.all([
        axios.get(`${API}/calendar`),
        axios.get(`${API}/applications`)
      ]);
      setEvents(eventsRes.data);
      setApplications(appsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.start_date) {
      toast.error("Title and date are required");
      return;
    }

    setSubmitting(true);
    try {
      // Convert local datetime to UTC for backend storage
      const submitData = {
        ...formData,
        start_date: localToUTC(formData.start_date),
        end_date: formData.end_date ? localToUTC(formData.end_date) : "",
        job_application_id: formData.job_application_id === "none" ? "" : formData.job_application_id
      };
      const response = await axios.post(`${API}/calendar`, submitData);
      setEvents([...events, response.data]);
      setCreateOpen(false);
      resetForm();
      toast.success("Event created" + (formData.reminders_enabled ? " with email reminders" : ""));
    } catch (error) {
      toast.error("Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;

    setSubmitting(true);
    try {
      // Convert local datetime to UTC for backend storage
      const submitData = {
        ...formData,
        start_date: localToUTC(formData.start_date),
        end_date: formData.end_date ? localToUTC(formData.end_date) : "",
        job_application_id: formData.job_application_id === "none" ? "" : formData.job_application_id,
        reminders_enabled: Boolean(formData.reminders_enabled)
      };
      const response = await axios.put(`${API}/calendar/${selectedEvent.id}`, submitData);
      setEvents(events.map(e => e.id === selectedEvent.id ? response.data : e));
      setEditOpen(false);
      setSelectedEvent(null);
      resetForm();
      
      // Show appropriate message based on reminder status change
      if (selectedEvent.reminders_enabled && !formData.reminders_enabled) {
        toast.success("Event updated - reminders disabled");
      } else if (!selectedEvent.reminders_enabled && formData.reminders_enabled) {
        toast.success("Event updated - reminders enabled");
      } else {
        toast.success("Event updated");
      }
    } catch (error) {
      toast.error("Failed to update event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await axios.delete(`${API}/calendar/${deleteId}`);
      setEvents(events.filter(e => e.id !== deleteId));
      toast.success("Event deleted");
    } catch (error) {
      toast.error("Failed to delete event");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSendTestReminder = async (eventId) => {
    setSendingTest(true);
    try {
      await axios.post(`${API}/calendar/${eventId}/test-reminder`);
      toast.success("Test reminder sent to your email!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send test reminder");
    } finally {
      setSendingTest(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "interview",
      interview_type: "",
      start_date: "",
      end_date: "",
      location: "",
      meeting_link: "",
      job_application_id: "",
      notes: "",
      reminders_enabled: true
    });
  };

  const openCreate = (date) => {
    const dateStr = format(date || new Date(), "yyyy-MM-dd'T'HH:mm");
    setFormData({ ...formData, start_date: dateStr });
    setCreateOpen(true);
  };

  const openEdit = (event) => {
    setSelectedEvent(event);
    // Convert UTC dates from backend to local for form display
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      interview_type: event.interview_type || "",
      start_date: utcToLocal(event.start_date),
      end_date: utcToLocal(event.end_date),
      location: event.location || "",
      meeting_link: event.meeting_link || "",
      job_application_id: event.job_application_id || "none",
      notes: event.notes || "",
      reminders_enabled: event.reminders_enabled !== false
    });
    setEditOpen(true);
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.start_date);
      return isSameDay(eventDate, date);
    });
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 10);

  const eventDates = events.map(e => parseISO(e.start_date));

  const handleFormChange = (field, value) => {
    if (field === "job_application_id" && value !== "none") {
      const app = applications.find(a => a.id === value);
      setFormData({ 
        ...formData, 
        job_application_id: value,
        title: app ? `${formData.event_type === "interview" ? "Interview" : formData.event_type} - ${app.position} at ${app.company}` : formData.title
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="calendar-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your interviews and events</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreate(selectedDate)} data-testid="add-event-btn">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Event</DialogTitle>
              <DialogDescription>
                Schedule an interview or reminder
              </DialogDescription>
            </DialogHeader>
            
            {/* Create Form Fields */}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Interview at Google"
                  value={formData.title}
                  onChange={(e) => handleFormChange("title", e.target.value)}
                  data-testid="event-title-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select 
                    value={formData.event_type} 
                    onValueChange={(v) => handleFormChange("event_type", v)}
                  >
                    <SelectTrigger data-testid="event-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map(t => {
                        const IconComponent = t.icon;
                        return (
                          <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {t.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                {isInterviewType(formData.event_type) && (
                  <div className="space-y-2">
                    <Label>Interview Type</Label>
                    <Select 
                      value={formData.interview_type} 
                      onValueChange={(v) => handleFormChange("interview_type", v)}
                    >
                      <SelectTrigger data-testid="interview-type-select">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {interviewTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Job Application Link */}
              <div className="space-y-2">
                <Label>Link to Job Application</Label>
                <Select 
                  value={formData.job_application_id || "none"} 
                  onValueChange={(v) => handleFormChange("job_application_id", v)}
                >
                  <SelectTrigger data-testid="job-application-select">
                    <SelectValue placeholder="Link to a job application (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {applications.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          {app.position} @ {app.company}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date/Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange("start_date", e.target.value)}
                    data-testid="event-start-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date/Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange("end_date", e.target.value)}
                    data-testid="event-end-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    placeholder="Office address or building"
                    value={formData.location}
                    onChange={(e) => handleFormChange("location", e.target.value)}
                    data-testid="event-location-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Link2 className="h-4 w-4 inline mr-1" />
                    Meeting Link
                  </Label>
                  <Input
                    placeholder="Zoom/Meet/Teams URL"
                    value={formData.meeting_link}
                    onChange={(e) => handleFormChange("meeting_link", e.target.value)}
                    data-testid="event-meeting-link-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Any details..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  data-testid="event-description-input"
                />
              </div>

              {/* Reminders Toggle - Only for interview types */}
              {isInterviewType(formData.event_type) && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    {formData.reminders_enabled ? (
                      <Bell className="h-5 w-5 text-primary" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Email Reminders</p>
                      <p className="text-xs text-muted-foreground">
                        Receive reminders 24 hours and 1 hour before
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.reminders_enabled}
                    onCheckedChange={(checked) => handleFormChange("reminders_enabled", checked)}
                    data-testid="reminders-toggle"
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting} data-testid="create-event-submit">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2 border-border/50" data-testid="calendar-card">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasEvent: eventDates
              }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--primary))'
                }
              }}
              className="rounded-md w-full"
              data-testid="calendar-component"
            />
            
            {/* Selected Day Events */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold mb-3">
                Events on {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map(event => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div 
                        key={event.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => openEdit(event)}
                        data-testid={`calendar-event-${event.id}`}
                      >
                        <div className={`h-8 w-8 rounded-lg ${typeInfo.color} flex items-center justify-center`}>
                          <TypeIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            {event.reminders_enabled && isInterviewType(event.event_type) && (
                              <Bell className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.start_date), "h:mm a")}
                            {event.location && ` • ${event.location}`}
                            {event.meeting_link && " • Online"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-border/50" data-testid="upcoming-events-card">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => {
                  const typeInfo = getEventTypeInfo(event.event_type);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => openEdit(event)}
                      data-testid={`upcoming-event-${event.id}`}
                    >
                      <div className={`h-9 w-9 rounded-lg ${typeInfo.color} flex items-center justify-center shrink-0`}>
                        <TypeIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          {event.reminders_enabled && isInterviewType(event.event_type) && (
                            <Bell className="h-3 w-3 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.start_date), "MMM d 'at' h:mm a")}
                        </p>
                        {event.interview_type && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {interviewTypes.find(t => t.value === event.interview_type)?.label || event.interview_type}
                          </Badge>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                        {event.meeting_link && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Link2 className="h-3 w-3" />
                            Online meeting
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(event.id);
                        }}
                        data-testid={`delete-event-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No upcoming events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          
          {/* Edit Form Fields */}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Interview at Google"
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                data-testid="edit-event-title-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select 
                  value={formData.event_type} 
                  onValueChange={(v) => handleFormChange("event_type", v)}
                >
                  <SelectTrigger data-testid="edit-event-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(t => {
                      const IconComponent = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {isInterviewType(formData.event_type) && (
                <div className="space-y-2">
                  <Label>Interview Type</Label>
                  <Select 
                    value={formData.interview_type} 
                    onValueChange={(v) => handleFormChange("interview_type", v)}
                  >
                    <SelectTrigger data-testid="edit-interview-type-select">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Job Application Link */}
            <div className="space-y-2">
              <Label>Link to Job Application</Label>
              <Select 
                value={formData.job_application_id || "none"} 
                onValueChange={(v) => handleFormChange("job_application_id", v)}
              >
                <SelectTrigger data-testid="edit-job-application-select">
                  <SelectValue placeholder="Link to a job application (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {applications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {app.position} @ {app.company}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date/Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                  data-testid="edit-event-start-input"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date/Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                  data-testid="edit-event-end-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </Label>
                <Input
                  placeholder="Office address or building"
                  value={formData.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  data-testid="edit-event-location-input"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Link2 className="h-4 w-4 inline mr-1" />
                  Meeting Link
                </Label>
                <Input
                  placeholder="Zoom/Meet/Teams URL"
                  value={formData.meeting_link}
                  onChange={(e) => handleFormChange("meeting_link", e.target.value)}
                  data-testid="edit-event-meeting-link-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Any details..."
                rows={3}
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                data-testid="edit-event-description-input"
              />
            </div>

            {/* Reminders Toggle */}
            {isInterviewType(formData.event_type) && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-3">
                  {formData.reminders_enabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium text-sm">Email Reminders</p>
                    <p className="text-xs text-muted-foreground">
                      Receive reminders 24 hours and 1 hour before
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.reminders_enabled}
                  onCheckedChange={(checked) => handleFormChange("reminders_enabled", checked)}
                  data-testid="edit-reminders-toggle"
                />
              </div>
            )}
          </div>
          
          {/* Reminder Status */}
          {selectedEvent && isInterviewType(selectedEvent.event_type) && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
              <p className="text-sm font-medium">Reminder Status</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {selectedEvent.reminder_24hr_sent ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={selectedEvent.reminder_24hr_sent ? "text-green-600" : ""}>
                    24hr reminder {selectedEvent.reminder_24hr_sent ? "sent" : "pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEvent.reminder_1hr_sent ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={selectedEvent.reminder_1hr_sent ? "text-green-600" : ""}>
                    1hr reminder {selectedEvent.reminder_1hr_sent ? "sent" : "pending"}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleSendTestReminder(selectedEvent.id)}
                disabled={sendingTest}
                data-testid="send-test-reminder-btn"
              >
                {sendingTest ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Test Reminder
              </Button>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="destructive" 
              onClick={() => { setDeleteId(selectedEvent?.id); setEditOpen(false); }}
              data-testid="delete-from-edit-btn"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedEvent(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} data-testid="update-event-submit">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any scheduled reminders will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-event">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
